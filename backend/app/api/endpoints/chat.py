from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID
from app.db.session import get_db
from app.models.repository import Repository
from app.models.interview import InterviewSession, ChatMessage, RoleEnum
from app.api.deps import get_current_user_id
from app.services.agent.interviewer import MockInterviewerAgent

from app.core.rate_limit import limiter

router = APIRouter()

class ChatRequest(BaseModel):
    repository_id: UUID
    message: str
    mode: str = "interview"
    ai_model: str = "llama3_70b"
    response_style: str = "detailed"

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
@limiter.limit("20/minute")
def send_message(request: Request, req: ChatRequest, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    repo = db.query(Repository).filter(Repository.id == str(req.repository_id)).first()
    if not repo or repo.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this repository")

    # 1. Get or create an interview session
    session = db.query(InterviewSession).filter(
        InterviewSession.repository_id == str(req.repository_id),
        InterviewSession.mode == req.mode
    ).first()
    if not session:
        session = InterviewSession(repository_id=str(req.repository_id), mode=req.mode)
        db.add(session)
        db.commit()
        db.refresh(session)
        
    # 2. Save user message
    user_msg = ChatMessage(session_id=session.id, role=RoleEnum.USER, content=req.message)
    db.add(user_msg)
    db.commit()

    # 3. Retrieve chat history
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.timestamp.asc()).all()
    formatted_history = [{"role": msg.role.value, "content": msg.content} for msg in history[:-1]] # exclude the latest user msg

    # 4. Invoke Agent
    repo_summary = repo.summary if repo.summary else "No summary available."
    
    agent = MockInterviewerAgent(repository_id=str(req.repository_id), repo_summary=repo_summary, mode=req.mode, ai_model=req.ai_model, response_style=req.response_style)
    try:
        reply_content = agent.chat(user_input=req.message, chat_history=formatted_history)
    except Exception as e:
        from app.core.security import sanitize_secrets
        reply_content = f"Error during mock interview generation: {sanitize_secrets(str(e))}"

    # 5. Save AI response
    ai_msg = ChatMessage(session_id=session.id, role=RoleEnum.AI, content=reply_content)
    db.add(ai_msg)
    db.commit()

    return ChatResponse(reply=reply_content)

@router.get("/history/{repo_id}")
@limiter.limit("50/minute")
def get_chat_history(request: Request, repo_id: str, mode: str = "interview", db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo or repo.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    session = db.query(InterviewSession).filter(
        InterviewSession.repository_id == repo_id,
        InterviewSession.mode == mode
    ).first()
    if not session:
        return []
    history = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.timestamp.asc()).all()
    return [{"role": msg.role.value, "content": msg.content} for msg in history]

class ExplainRequest(BaseModel):
    repository_id: UUID
    file_path: str
    ai_model: str = "llama3_70b"
    response_style: str = "detailed"

@router.post("/explain", response_model=ChatResponse)
@limiter.limit("20/minute")
def explain_file_endpoint(request: Request, req: ExplainRequest, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    repo = db.query(Repository).filter(Repository.id == str(req.repository_id)).first()
    if not repo or repo.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this repository")
    repo_summary = repo.summary if repo.summary else "No summary available."
    
    agent = MockInterviewerAgent(repository_id=str(req.repository_id), repo_summary=repo_summary, mode="walkthrough", ai_model=req.ai_model, response_style=req.response_style)
    try:
        reply_content = agent.explain_file(file_path=req.file_path)
    except Exception as e:
        from app.core.security import sanitize_secrets
        reply_content = f"Error generating explanation: {sanitize_secrets(str(e))}"

    return ChatResponse(reply=reply_content)
