from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import repository, chat

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to the RepoWhisper API"}

api_router = APIRouter()
api_router.include_router(repository.router, prefix="/repos", tags=["repositories"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

app.include_router(api_router, prefix=settings.API_V1_STR)
