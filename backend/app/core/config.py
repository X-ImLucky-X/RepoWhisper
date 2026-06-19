from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RepoWhisper"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./repowhisper.db"
    
    # Vector Database
    QDRANT_DB_DIR: str = "./qdrant_db"
    
    # CORS Allowed Origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://repo-whisper-1024.vercel.app"
    ]
    
    # API Keys
    GOOGLE_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    GITHUB_ID: str | None = None
    GITHUB_SECRET: str | None = None
    NEXTAUTH_SECRET: str | None = None
    NEXTAUTH_URL: str | None = None
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
