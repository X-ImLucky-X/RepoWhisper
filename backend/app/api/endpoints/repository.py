from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.repository import Repository, RepoStatus
from app.schemas.repository import RepoImportRequest, RepoImportResponse
from app.services.github.parser import GitHubParser
from app.services.rag.ingestion import RAGIngestor
from app.services.agent.summarizer import RepoSummarizer

router = APIRouter()

def process_repository(repo_id: str, github_url: str, db: Session):
    try:
        # Update status to PARSING
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not repo:
            return
        repo.status = RepoStatus.PARSING
        db.commit()

        # Step 1: Clone and parse files
        parser = GitHubParser(github_url=github_url)
        parser.clone()
        files = parser.get_files()
        
        # Step 2: Ingest into RAG / Vector DB
        ingestor = RAGIngestor(repository_id=repo_id)
        ingestor.ingest_files(files)
        
        # Step 3: Generate Cheat Sheet Summary
        summarizer = RepoSummarizer()
        summary = summarizer.generate_cheat_sheet(files)
        
        # Step 4: Cleanup and update status
        parser.cleanup()
        repo.summary = summary
        repo.status = RepoStatus.COMPLETED
        db.commit()

    except Exception as e:
        # On failure, mark as FAILED
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if repo:
            repo.status = RepoStatus.FAILED
            db.commit()
        print(f"Error processing repository {repo_id}: {e}")

@router.post("/import", response_model=RepoImportResponse)
def import_repository(req: RepoImportRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Create DB entry
    repo_name = str(req.github_url).rstrip('/').split('/')[-1]
    
    new_repo = Repository(
        user_id=str(req.user_id),
        github_url=str(req.github_url),
        name=repo_name,
        status=RepoStatus.PENDING
    )
    db.add(new_repo)
    db.commit()
    db.refresh(new_repo)

    # Dispatch background task
    background_tasks.add_task(process_repository, str(new_repo.id), str(req.github_url), db)

    return RepoImportResponse(
        id=new_repo.id,
        status=new_repo.status.value,
        message="Repository ingestion started."
    )
