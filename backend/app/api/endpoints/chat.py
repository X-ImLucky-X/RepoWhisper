from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID
from app.db.session import get_db
from app.models.interview import InterviewSession, ChatMessage, RoleEnum
from app.services.agent.interviewer import MockInterviewerAgent

router = APIRouter()

class ChatRequest(BaseModel):
    repository_id: UUID
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
def send_message(req: ChatRequest, db: Session = Depends(get_db)):
    # 1. Get or create an interview session
    session = db.query(InterviewSession).filter(InterviewSession.repository_id == str(req.repository_id)).first()
    if not session:
        session = InterviewSession(repository_id=str(req.repository_id))
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
    agent = MockInterviewerAgent(repository_id=str(req.repository_id))
    try:
        reply_content = agent.chat(user_input=req.message, chat_history=formatted_history)
    except Exception as e:
        reply_content = f"Error during mock interview generation: {str(e)}"

    # 5. Save AI response
    ai_msg = ChatMessage(session_id=session.id, role=RoleEnum.AI, content=reply_content)
    db.add(ai_msg)
    db.commit()

    return ChatResponse(reply=reply_content)
