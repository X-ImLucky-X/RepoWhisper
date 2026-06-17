import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum
from app.db.base_class import Base

def generate_uuid():
    return str(uuid.uuid4())

class RepoStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARSING = "PARSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Repository(Base):
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("user.id"), nullable=False)
    github_url = Column(String, nullable=False)
    name = Column(String, nullable=False)
    status = Column(Enum(RepoStatus), default=RepoStatus.PENDING, nullable=False)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="repositories")
    sessions = relationship("InterviewSession", backref="repository", cascade="all, delete-orphan")
