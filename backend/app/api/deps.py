from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.repository import Repository

def get_current_user_id(x_user_id: str = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header missing")
    return x_user_id

def verify_repo_ownership(repo_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this repository")
    return repo
