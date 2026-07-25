from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.repository import Repository, RepoStatus
from app.schemas.repository import RepoImportRequest, RepoImportResponse, RepoRetryRequest
from app.services.github.parser import GitHubParser
from app.services.rag.ingestion import RAGIngestor
from app.services.agent.summarizer import RepoSummarizer
from app.services.analysis.dependency import build_dependency_graph
from app.services.analysis.blast_radius import compute_blast_radius

from app.core.rate_limit import limiter
from app.api.deps import get_current_user_id, verify_repo_ownership

router = APIRouter()

def process_repository(repo_id: str, github_url: str, access_token: str):
    from app.db.session import SessionLocal
    import traceback
    db = SessionLocal()
    try:
        # Update status to PARSING
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not repo:
            return
        repo.status = RepoStatus.PARSING
        db.commit()

        # Step 1: Clone and parse files
        parser = GitHubParser(github_url=github_url, access_token=access_token)
        parser.clone()
        import json
        files, tree_str, graph_data = parser.get_files_and_tree()

        # Step 1.5: Collect per-file churn data from git history
        churn_data = {}
        try:
            churn_data = parser.get_churn_data()
        except Exception as e:
            from app.core.security import sanitize_secrets
            print(f"Churn data collection failed: {sanitize_secrets(str(e), [access_token] if access_token else None)}")
        
        # Step 2: Ingest into RAG / Vector DB
        ingestor = RAGIngestor(repository_id=repo_id)
        ingestor.ingest_files(files)

        # Step 2.5: Build cross-file dependency graph
        dep_graph_json = None
        dep_edges = None
        analyzed_files = None
        try:
            dep_edges, analyzed_files = build_dependency_graph(files)
            dep_graph_json = json.dumps({
                "edges": dep_edges,
                "analyzed_files": list(analyzed_files),
            })
        except Exception as e:
            from app.core.security import sanitize_secrets
            print(f"Dependency graph build failed: {sanitize_secrets(str(e), [access_token] if access_token else None)}")

        # Step 3: Generate Cheat Sheet Summary & Scorecard
        summarizer = RepoSummarizer()
        summary = summarizer.generate_cheat_sheet(files, tree_str)
        llm_scorecard = None
        try:
            llm_scorecard_raw = summarizer.generate_scorecard(files, tree_str)
            llm_scorecard = json.loads(llm_scorecard_raw) if llm_scorecard_raw else None
        except Exception as e:
            print(f"Scorecard generation failed: {e}")

        # Step 3.5: Compute deterministic health score from dependency graph
        final_scorecard = None
        try:
            from app.services.analysis.health import compute_health_score
            if dep_edges is not None:
                health = compute_health_score(dep_edges, analyzed_files or set(), files)
                # Merge: computed score + breakdown + LLM's narrative analysis
                final_scorecard = {
                    "score": health["score"],
                    "breakdown": health["breakdown"],
                }
                if llm_scorecard:
                    final_scorecard["ai_analysis"] = {
                        "circular_dependencies": llm_scorecard.get("circular_dependencies", []),
                        "dead_files": llm_scorecard.get("dead_files", []),
                        "security_risks": llm_scorecard.get("security_risks", []),
                    }
            elif llm_scorecard:
                # Fallback: dependency graph failed, use LLM scorecard as-is
                final_scorecard = llm_scorecard
        except Exception as e:
            print(f"Health score computation failed: {e}")
            if llm_scorecard:
                final_scorecard = llm_scorecard

        # Step 4: Cleanup and update status
        parser.cleanup()
        repo.summary = summary
        repo.scorecard = json.dumps(final_scorecard) if final_scorecard else None
        repo.tree = tree_str
        repo.graph_json = json.dumps(graph_data)
        repo.dependency_graph = dep_graph_json
        repo.churn_json = json.dumps(churn_data) if churn_data else None
        repo.status = RepoStatus.COMPLETED
        db.commit()

    except Exception as e:
        traceback.print_exc()
        # On failure, mark as FAILED
        from app.core.security import sanitize_secrets
        sanitized_error = sanitize_secrets(str(e), [access_token] if access_token else None)
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if repo:
            repo.status = RepoStatus.FAILED
            repo.summary = f"Error: {sanitized_error}"
            db.commit()
        print(f"Error processing repository {repo_id}: {sanitized_error}")
    finally:
        db.close()

@router.post("/import", response_model=RepoImportResponse)
@limiter.limit("5/minute")
def import_repository(request: Request, req: RepoImportRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    # Create DB entry
    repo_name = str(req.github_url).rstrip('/').split('/')[-1]
    
    new_repo = Repository(
        user_id=current_user_id,
        github_url=str(req.github_url),
        name=repo_name,
        status=RepoStatus.PENDING
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    # Dispatch background task
    background_tasks.add_task(process_repository, str(new_repo.id), str(req.github_url), req.access_token)

    return RepoImportResponse(
        id=new_repo.id,
        status=new_repo.status.value,
        message="Repository ingestion started."
    )

@router.post("/{repo_id}/retry")
@limiter.limit("10/minute")
def retry_repository(request: Request, repo_id: str, req: RepoRetryRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), repo: Repository = Depends(verify_repo_ownership)):
    if repo.status != RepoStatus.FAILED:
        raise HTTPException(status_code=400, detail="Only failed repositories can be retried")

    repo.status = RepoStatus.PENDING
    repo.summary = None
    db.commit()

    background_tasks.add_task(process_repository, str(repo.id), repo.github_url, req.access_token)

    return {"message": "Retry started"}

@router.get("/user/{user_id}")
@limiter.limit("30/minute")
def get_user_repos(request: Request, user_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access these repositories")
    repos = db.query(Repository).filter(Repository.user_id == user_id).order_by(Repository.created_at.desc()).all()
    import json
    def get_score(scorecard_str):
        if not scorecard_str: return None
        try:
            return json.loads(scorecard_str).get("score")
        except:
            return None
    return [{"id": r.id, "name": r.name, "github_url": r.github_url, "status": r.status.value, "score": get_score(r.scorecard), "created_at": r.created_at} for r in repos]

@router.get("/{repo_id}")
@limiter.limit("30/minute")
def get_repo_detail(request: Request, repo_id: str, db: Session = Depends(get_db), repo: Repository = Depends(verify_repo_ownership)):
    import json
    return {
        "id": repo.id,
        "name": repo.name,
        "status": repo.status.value,
        "summary": repo.summary,
        "scorecard": json.loads(repo.scorecard) if repo.scorecard else None,
        "tree": repo.tree,
        "graph_json": json.loads(repo.graph_json) if repo.graph_json else None,
        "dependency_graph": json.loads(repo.dependency_graph) if repo.dependency_graph else None,
        "churn_json": json.loads(repo.churn_json) if repo.churn_json else None,
    }

@router.get("/{repo_id}/blast-radius")
@limiter.limit("30/minute")
def get_blast_radius(
    request: Request,
    repo_id: str,
    file: str = Query(..., description="File path to analyze"),
    max_depth: int = Query(5, ge=1, le=10, description="Max BFS depth"),
    db: Session = Depends(get_db),
    repo: Repository = Depends(verify_repo_ownership),
):
    if not repo.dependency_graph:
        return {"error": "Dependency graph not available. Re-analyze the repository."}
    
    import json
    try:
        graph_data = json.loads(repo.dependency_graph)
        edges = graph_data.get("edges", [])
    except Exception:
        return {"error": "Dependency graph is invalid."}
        
    return compute_blast_radius(edges, file, max_depth)
