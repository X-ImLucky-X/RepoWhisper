from pydantic import BaseModel, HttpUrl

class RepoImportRequest(BaseModel):
    github_url: HttpUrl
    user_id: str
    access_token: str = None

class RepoImportResponse(BaseModel):
    id: str
    status: str
    message: str

class RepoRetryRequest(BaseModel):
    access_token: str = ""
