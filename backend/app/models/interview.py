import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum
from app.db.base_class import Base

def generate_uuid():
    return str(uuid.uuid4())

class RoleEnum(str, enum.Enum):
    USER = "USER"
    AI = "AI"

class InterviewSession(Base):
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repository.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    
    messages = relationship("ChatMessage", backref="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("interviewsession.id"), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
