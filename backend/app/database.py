from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecoledger.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="waste_picker")
    wallet_address = Column(String, unique=True, index=True)
    city = Column(String)
    country = Column(String)
    profile_photo = Column(String, nullable=True)
    id_proof = Column(String, nullable=True)
    green_credit_score = Column(Float, default=0.0)
    total_plastic_collected = Column(Float, default=0.0)
    account_status = Column(String, default="active")
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    otp_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    otp_code = Column(String) # Stored as hash
    expires_at = Column(DateTime)
    is_verified = Column(Integer, default=0) # 0 for false, 1 for true
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing Database...")
    init_db()
    print("Database initialized successfully.")
