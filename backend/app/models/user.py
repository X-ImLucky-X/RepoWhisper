import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    id = Column(String, primary_key=True, default=generate_uuid)
    github_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
