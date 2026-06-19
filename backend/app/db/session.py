from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create the SQLAlchemy engine.
#   * For SQLite we need `check_same_thread=False` (FastAPI runs in a
#     multi‑threaded environment).
#   * For PostgreSQL (Supabase) that argument is illegal and raises
#     `psycopg2.ProgrammingError`.  We therefore add it **only** when the
#     URL starts with `sqlite`.
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()