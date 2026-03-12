import random
import datetime
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from ..database import OTPVerification

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class OTPService:
    def generate_otp(self):
        # 6-digit OTP
        return str(random.randint(100000, 999999))

    def hash_otp(self, otp: str):
        return pwd_context.hash(otp)

    def verify_otp_hash(self, plain_otp: str, hashed_otp: str):
        return pwd_context.verify(plain_otp, hashed_otp)

    async def create_otp(self, db: Session, user_id: int, identifier: str):
        otp_code = self.generate_otp()
        hashed_otp = self.hash_otp(otp_code)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        
        # Invalidate previous OTPs for this user
        db.query(OTPVerification).filter(OTPVerification.user_id == user_id).delete()
        
        db_otp = OTPVerification(
            user_id=user_id,
            otp_code=hashed_otp,
            expires_at=expires_at
        )
        db.add(db_otp)
        db.commit()
        
        # Mocking delivery service
        print(f"DEBUG: OTP for {identifier} is {otp_code}") 
        # In real-world, integrate Twilio or Nodemailer here
        
        return otp_code

otp_service = OTPService()
