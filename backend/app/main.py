from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import repository, chat
from app.core.rate_limit import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response

@app.get("/")
@limiter.limit("5/minute")
def root(request: Request):
    return {"message": "Welcome to the RepoWhisper API"}

api_router = APIRouter()
api_router.include_router(repository.router, prefix="/repos", tags=["repositories"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

app.include_router(api_router, prefix=settings.API_V1_STR)
