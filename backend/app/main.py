from pydantic import BaseModel
from passlib.context import CryptContext
from .database import User, OTPVerification, get_db
from .services.otp_service import otp_service
from .services.auth_utils import create_access_token
import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    identifier: str
    password: str

class OTPVerifyRequest(BaseModel):
    user_id: int
    otp: str

@app.post("/api/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    # Check email or phone
    user = db.query(User).filter(
        (User.email == req.identifier) | (User.phone_number == req.identifier)
    ).first()
    
    # Mocking for prototype: If user doesn't exist, create one for demo if password is "demo"
    if not user and req.password == "demo123":
        user = User(
            full_name="Demo User",
            email="demo@ecoledger.com",
            phone_number="1234567890",
            password_hash=pwd_context.hash("demo123"),
            wallet_address="0xDemo" + str(datetime.datetime.now().timestamp())
        )
        db.add(user)
        db.commit()
    
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.account_status == "blocked":
        raise HTTPException(status_code=403, detail="Account is blocked")
    
    # Generate and "send" OTP
    await otp_service.create_otp(db, user.id, req.identifier)
    
    return {"message": "OTP sent", "user_id": user.id}

@app.post("/api/verify-otp")
async def verify_otp(req: OTPVerifyRequest, db: Session = Depends(get_db)):
    db_otp = db.query(OTPVerification).filter(OTPVerification.user_id == req.user_id).first()
    
    if not db_otp:
        raise HTTPException(status_code=404, detail="No pending OTP found")
    
    if db_otp.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if db_otp.attempts >= 5:
        # Block user account for security
        user = db.query(User).filter(User.id == req.user_id).first()
        user.account_status = "blocked"
        db.commit()
        raise HTTPException(status_code=403, detail="Account blocked due to multiple fail attempts")

    if not otp_service.verify_otp_hash(req.otp, db_otp.otp_code):
        db_otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # OTP correct
    user = db.query(User).filter(User.id == req.user_id).first()
    user.last_login = datetime.datetime.utcnow()
    db_otp.is_verified = 1
    db.commit()
    
    token = create_access_token({"user_id": user.id, "role": user.role})
    
    return {
        "token": token,
        "user": {
            "user_id": user.id,
            "full_name": user.full_name,
            "role": user.role,
            "wallet_address": user.wallet_address
        }
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to EcoLedger API"}

@app.post("/verify-plastic")
async def verify_plastic(file: UploadFile = File(...)):
    contents = await file.read()
    result = ai_engine.verify_plastic(contents)
    
    if result["confidence"] < 0.80:
        return {"status": "rejected", "reason": "Low confidence level", "details": result}
    
    return {"status": "approved", "data": result}

@app.post("/mint-token")
async def mint_token(data: dict):
    # This would normally be triggered after verification and user confirmation
    try:
        tx_hash = blockchain_client.mint_plastic_credit(
            collector_address=data["wallet_address"],
            plastic_type=data["plastic_type"],
            quantity=data["weight"],
            gps=data["location"],
            image_hash=data.get("image_hash", "0x0")
        )
        return {"status": "success", "transaction_hash": tx_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/green-credit-score/{user_id}")
def get_credit_score(user_id: str):
    score = score_engine.calculate_score(user_id)
    return {"user_id": user_id, "green_credit_score": score}

@app.get("/marketplace")
def get_marketplace_items():
    # Mock data for marketplace
    return [
        {"id": 1, "type": "PET", "quantity": "500kg", "price": "50 Tokens"},
        {"id": 2, "type": "HDPE", "quantity": "200kg", "price": "30 Tokens"}
    ]
