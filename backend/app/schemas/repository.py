from pydantic import BaseModel, HttpUrl
from uuid import UUID

class RepoImportRequest(BaseModel):
    github_url: HttpUrl
    user_id: UUID # Assuming client sends this from NextAuth session

class RepoImportResponse(BaseModel):
    id: UUID
    status: str
    message: str
