from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.repository import Repository, RepoStatus
from app.schemas.repository import RepoImportRequest, RepoImportResponse, RepoRetryRequest
from app.services.github.parser import GitHubParser
from app.services.rag.ingestion import RAGIngestor
from app.services.agent.summarizer import RepoSummarizer

from app.core.rate_limit import limiter
from app.api.deps import get_current_user_id, verify_repo_ownership

router = APIRouter()

def process_repository(repo_id: str, github_url: str, access_token: str):
    from app.db.session import SessionLocal
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
        
        # Step 2: Ingest into RAG / Vector DB
        ingestor = RAGIngestor(repository_id=repo_id)
        ingestor.ingest_files(files)
        
        # Step 3: Generate Cheat Sheet Summary & Scorecard
        summarizer = RepoSummarizer()
        summary = summarizer.generate_cheat_sheet(files, tree_str)
        try:
            scorecard = summarizer.generate_scorecard(files, tree_str)
        except Exception as e:
            print(f"Scorecard generation failed: {e}")
            scorecard = None
        
        # Step 4: Cleanup and update status
        parser.cleanup()
        repo.summary = summary
        repo.scorecard = scorecard
        repo.tree = tree_str
        repo.graph_json = json.dumps(graph_data)
        repo.status = RepoStatus.COMPLETED
        db.commit()

    except Exception as e:
        # On failure, mark as FAILED
        import traceback
        traceback.print_exc()
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

    from datetime import datetime
    repo.status = RepoStatus.PENDING
    repo.summary = None
    repo.created_at = datetime.utcnow()
    db.commit()

    background_tasks.add_task(process_repository, str(repo.id), repo.github_url, req.access_token)

    return {"message": "Retry started"}

@router.get("/user/{user_id}")
@limiter.limit("30/minute")
def get_user_repos(request: Request, user_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access these repositories")
    
    # Self-heal stuck PARSING or PENDING repositories (timeout > 30 minutes)
    from datetime import datetime, timezone
    repos = db.query(Repository).filter(Repository.user_id == user_id).all()
    updated = False
    for r in repos:
        if r.status in [RepoStatus.PARSING, RepoStatus.PENDING]:
            created_at = r.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            age_mins = (now - created_at).total_seconds() / 60.0
            if age_mins > 30.0:
                r.status = RepoStatus.FAILED
                r.summary = "Error: Ingestion timeout. Processing took more than 30 minutes. Please click RETRY."
                updated = True
    if updated:
        db.commit()

    # Re-query sorted repos
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
        "graph_json": json.loads(repo.graph_json) if repo.graph_json else None
    }
