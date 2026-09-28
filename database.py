import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# Get DATABASE_URL from environment, default to local SQLite for easy development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecommerce.db")

# SQLite requires different connection arguments
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
