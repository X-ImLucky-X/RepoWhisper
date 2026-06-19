from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RepoWhisper"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = ""
    QDRANT_URL: str = ""
    
    # CORS Allowed Origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://repowhisper-frontend.onrender.com"
    ]
    
    # API Keys
    GOOGLE_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    GITHUB_ID: str | None = None
    GITHUB_SECRET: str | None = None
    NEXTAUTH_SECRET: str | None = None
    QDRANT_API_KEY: str = ""
    
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
