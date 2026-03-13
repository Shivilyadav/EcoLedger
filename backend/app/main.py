"""
EcoLedger FastAPI Backend
=========================
Features:
  - Assigned-key login
  - AI plastic detection (TensorFlow CNN mock - works without trained weights)
  - Blockchain token minting (Polygon-format mock response)
  - Google Sheets data persistence via Apps Script
  - Corporate marketplace & green credit scores
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import datetime
import os
import requests
import string
import hashlib
import re
from dotenv import load_dotenv

from .database import init_db, SessionLocal, TokenMint, Payment, Upload

load_dotenv()

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def _cors_origins_from_env() -> list[str]:
    raw = (os.getenv("CORS_ALLOW_ORIGINS", "") or "").strip()
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]

def _now_ist():
    """Return current datetime in IST (UTC+5:30)."""
    return datetime.datetime.now(IST).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# App init
# ---------------------------------------------------------------------------
app = FastAPI(title="EcoLedger API", version="2.0.0")

cors_origins = _cors_origins_from_env()
cors_allow_credentials = (os.getenv("CORS_ALLOW_CREDENTIALS", "false") or "").strip().lower() in (
    "1",
    "true",
    "yes",
)
if "*" in cors_origins and cors_allow_credentials:
    cors_allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SMTP_HOST     = os.getenv("SMTP_HOST", "")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM     = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@ecoledger.app")
TWILIO_ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER  = os.getenv("TWILIO_FROM_NUMBER", "")

APPS_SCRIPT_URL = os.getenv(
    "APPS_SCRIPT_URL",
    "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
)
USERS_SHEET_URL = os.getenv("USERS_SHEET_URL", APPS_SCRIPT_URL)
COMPANIES_SHEET_URL = os.getenv("COMPANIES_SHEET_URL", APPS_SCRIPT_URL)
ASSIGNMENTS_SHEET_URL = os.getenv("ASSIGNMENTS_SHEET_URL", APPS_SCRIPT_URL)

# ---------------------------------------------------------------------------
# DB init
# ---------------------------------------------------------------------------
@app.on_event("startup")
def _startup() -> None:
    init_db()

# ---------------------------------------------------------------------------
# Utility Helpers
# ---------------------------------------------------------------------------
def _random_hex(length: int) -> str:
    return "".join(random.choices("0123456789abcdef", k=length))

def _stable_wallet_address(seed: str) -> str:
    digest = hashlib.sha256((seed or "anonymous").encode("utf-8")).hexdigest()[:40]
    return "0x" + digest

def _parse_weight_kg(value: str) -> float:
    if not value:
        return 0.0
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", str(value))
    if not match:
        return 0.0
    try:
        return float(match.group(1))
    except Exception:
        return 0.0

def _parse_eco(value) -> float:
    if value is None:
        return 0.0
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", str(value))
    if not match:
        return 0.0
    try:
        return float(match.group(1))
    except Exception:
        return 0.0

def _post_to_sheet(url: str, payload: dict) -> dict:
    if not url or "YOUR_SCRIPT_ID" in url:
        return {"ok": False, "reason": "sheet_url_not_set"}
    try:
        resp = requests.post(url, json=payload, timeout=8)
        if resp.ok:
            return {"ok": True, "data": resp.json()}
        return {"ok": False, "reason": resp.text}
    except Exception as e:
        return {"ok": False, "reason": str(e)}

def _lookup_entity(identifier: str, role: str) -> dict:
    """Queries Google Sheets to find a user or company by email/phone."""
    if "YOUR_SCRIPT_ID" in APPS_SCRIPT_URL:
        return None
    try:
        payload = {"type": "lookup", "identifier": identifier, "role": role}
        resp = requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)
        if resp.ok:
            data = resp.json()
            if data.get("found"):
                return data.get("data")
    except Exception as e:
        print(f"[DB ERROR] Lookup failed for {identifier}: {e}")
    return None

def _lookup_assigned_key(assigned_key: str, role: str) -> dict:
    """Lookup user/company by assigned key from the Assignments sheet."""
    if not ASSIGNMENTS_SHEET_URL or "YOUR_SCRIPT_ID" in ASSIGNMENTS_SHEET_URL:
        return None
    payload = {"type": "lookup_assigned_key", "assigned_key": assigned_key, "role": role}
    result = _post_to_sheet(ASSIGNMENTS_SHEET_URL, payload)
    if result.get("ok"):
        data = result.get("data") or {}
        if data.get("found"):
            return data.get("data")
    return None

def _normalize_assigned_key(value: str) -> str:
    return value.strip()

def _append_assignment_row(company_name: str = "", user_id: str = "", full_name: str = "") -> None:
    if not ASSIGNMENTS_SHEET_URL or "YOUR_SCRIPT_ID" in ASSIGNMENTS_SHEET_URL:
        return
    payload = {
        "type": "append_assignment",
        "data": {
            "company_name": company_name,
            "company_assigned_value": "",
            "user_id": user_id,
            "user_assigned_value": "",
            "full_name": full_name,
        },
    }
    result = _post_to_sheet(ASSIGNMENTS_SHEET_URL, payload)
    if not result.get("ok"):
        print(f"[DB WARNING] Failed to append assignment row: {result.get('reason')}")

# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    identifier: str = ""
    assigned_key: str = ""

class UserRegisterRequest(BaseModel):
    full_name:  str
    phone:      str
    password:   str
    identifier: str = ""  # not collected during signup; kept for backward compat

class CompanyRegisterRequest(BaseModel):
    company_name:      str
    gstin:             str
    company_email:     str
    company_phone:     str
    authorized_person: str
    company_address:   str
    password:          str

class CompanyLoginRequest(BaseModel):
    email: str = ""
    assigned_key: str = ""

class UploadActionRequest(BaseModel):
    company_id: str
    reason:     str = ""

class PaymentRequest(BaseModel):
    upload_id:      str
    picker_user_id: str
    company_id:     str
    amount:         float

class AgentScanRequest(BaseModel):
    picker_id:      str
    agent_id:       str
    plastic_type:   str
    weight:         str
    image_url:      str = ""

# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/login")
async def login(req: LoginRequest):
    assigned_key_raw = (req.assigned_key or req.identifier).strip()
    if not assigned_key_raw:
        raise HTTPException(status_code=400, detail="Assigned key is required.")
    assigned_key = _normalize_assigned_key(assigned_key_raw)
    user = _lookup_assigned_key(assigned_key, "waste_picker")
    if not user:
        raise HTTPException(status_code=404, detail="Assigned key not found.")
    user_id = user.get("user_id") or user.get("id") or assigned_key
    full_name = user.get("full_name") or f"User_{user_id}"
    return {
        "token": f"eco_token_{str(user_id).replace('@','_').replace('.','_')}",
        "user": {
            "user_id": user_id,
            "full_name": full_name,
            "role": "waste_picker",
            "wallet_address": _stable_wallet_address(str(user_id)),
        },
    }

# ---------------------------------------------------------------------------
# MNC (Company) Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/companies")
async def list_companies():
    if "YOUR_SCRIPT_ID" in APPS_SCRIPT_URL:
        return {"companies": []}
    try:
        resp = requests.post(APPS_SCRIPT_URL, json={"type": "list_companies"}, timeout=5)
        if resp.ok:
            data = resp.json() or {}
            companies = data.get("companies") or []
            normalized = []
            for c in companies:
                name = (c.get("name") or "").strip()
                email = (c.get("id") or "").strip()
                if not name:
                    continue
                normalized.append({"id": name, "name": name, "email": email})
            return {"companies": normalized}
    except Exception as e:
        print(f"[DB ERROR] Failed to list companies: {e}")
    return {"companies": []}

@app.post("/api/company/register")
async def register_company(req: CompanyRegisterRequest):
    payload = {"type": "register_company", "data": req.dict()}
    _post_to_sheet(COMPANIES_SHEET_URL, payload)
    _append_assignment_row(company_name=req.company_name)
    return {"message": "Registration submitted. Awaiting assigned key from Admin.", "role": "company"}

@app.post("/api/register")
async def register_picker(req: UserRegisterRequest):
    payload = {"type": "register_user", "data": {
        "full_name": req.full_name,
        "phone": req.phone,
        "password": req.password,
    }}
    result = _post_to_sheet(USERS_SHEET_URL, payload)
    user_id = req.phone  # use phone as the provisional user identifier
    if result.get("ok"):
        data = result.get("data") or {}
        user_id = data.get("user_id") or data.get("id") or user_id
    _append_assignment_row(user_id=user_id, full_name=req.full_name)
    return {"message": "Registration submitted. Awaiting assigned key from Admin.", "role": "waste_picker"}

@app.post("/api/company/login")
async def login_company(req: CompanyLoginRequest):
    assigned_key_raw = (req.assigned_key or req.email).strip()
    if not assigned_key_raw:
        raise HTTPException(status_code=400, detail="Assigned key is required.")
    assigned_key = _normalize_assigned_key(assigned_key_raw)
    
    # ── Debug Magic Key ──
    if assigned_key == "DEBUG_MNC":
        company = {"company_id": "MNC-DEBUG", "company_name": "Debug Organization", "role": "company"}
    else:
        company = _lookup_assigned_key(assigned_key, "company")

    if not company:
        raise HTTPException(status_code=404, detail="Assigned key not found.")
    company_name = company.get("company_name") or "Company"
    # Use company_name as the stable "company_id" in this prototype so:
    # - picker uploads (selected from /api/companies) and
    # - company dashboard queries (/api/company/uploads?company_id=...)
    # match the same identifier.
    company_id = company.get("company_id") or company_name
    return {
        "token": f"eco_token_{str(company_id).replace('@','_').replace('.','_')}",
        "company": {
            "company_id": company_id,
            "company_name": company_name,
            "assigned_key": assigned_key,
            "role": "company",
        },
    }

@app.post("/api/agent/login")
async def login_agent(req: LoginRequest):
    assigned_key_raw = (req.assigned_key or req.identifier).strip()
    if not assigned_key_raw:
        raise HTTPException(status_code=400, detail="Assigned key is required.")
    assigned_key = _normalize_assigned_key(assigned_key_raw)
    agent = _lookup_assigned_key(assigned_key, "agent")
    if not agent:
        raise HTTPException(status_code=404, detail="Agent key not found.")
    
    agent_id = agent.get("id") or agent.get("agent_id") or assigned_key
    agent_name = agent.get("full_name") or "Agent"
    
    return {
        "token": f"eco_token_agent_{str(agent_id).replace('@','_').replace('.','_')}",
        "agent": {
            "agent_id": agent_id,
            "full_name": agent_name,
            "role": "agent",
            "area": agent.get("area", "Unknown Area")
        }
    }

@app.post("/api/agent/scan")
async def agent_scan_collection(req: AgentScanRequest):
    # This endpoint is called when an agent scans a picker's QR
    # It logs the collection and credits the picker
    
    upload_id = f"U_AGENT_{_random_hex(8)}"
    weight_kg = _parse_weight_kg(req.weight)
    eco_reward = round(weight_kg * 18, 2)
    tx_hash = "0x" + _random_hex(64)
    
    # 1. Log to sheets
    payload = {
        "type": "create_upload",
        "data": {
            "upload_id": upload_id,
            "picker_user_id": req.picker_id,
            "agent_id": req.agent_id,
            "image_url": req.image_url,
            "plastic_type": req.plastic_type,
            "weight": req.weight,
            "confidence": 1.0, # Agent verified
            "status": "approved", # Auto-approved if agent verifies
            "created_at": _now_ist().isoformat()
        }
    }
    
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        # Log upload
        requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)
        
        # Log payment to sheets as well
        pay_payload = {
            "type": "process_payment",
            "data": {
                "tx_id": f"PAY_AGENT_{_random_hex(8)}",
                "upload_id": upload_id,
                "picker_user_id": req.picker_id,
                "company_id": "Field Agent",
                "amount": round(float(weight_kg * 12.5), 2),
                "status": "paid",
                "paid_at": _now_ist().isoformat()
            }
        }
        requests.post(APPS_SCRIPT_URL, json=pay_payload, timeout=5)
    
    # 2. Mint tokens to picker
    db = SessionLocal()
    try:
        picker_wallet = _stable_wallet_address(req.picker_id)
        db.add(TokenMint(
            wallet_address=picker_wallet,
            token_id=str(random.randint(10000, 99999)),
            transaction_hash=tx_hash,
            explorer_url=f"https://amoy.polygonscan.com/tx/{tx_hash}",
            plastic_type=req.plastic_type,
            weight_kg=weight_kg,
            eco_reward=eco_reward,
            minted_at=_now_ist(),
        ))
        
        # Also log as a payment so it shows in "Recent Payments"
        db.add(Payment(
            payment_id=f"PAY_AGENT_{_random_hex(8)}",
            upload_id=upload_id,
            picker_user_id=req.picker_id,
            company_id="Field Agent",
            amount=round(float(weight_kg * 12.5), 2), # Example: ₹12.5 per kg
            status="paid",
            paid_at=_now_ist(),
        ))

        db.add(Upload(
            upload_id=upload_id,
            picker_user_id=req.picker_id,
            agent_id=req.agent_id,
            company_id="Field Agent",
            image_url=req.image_url,
            plastic_type=req.plastic_type,
            weight=req.weight,
            confidence=1.0,
            status="approved",
            created_at=_now_ist()
        ))
        db.commit()
    finally:
        db.close()
        
    return {
        "message": "Collection verified and credits transferred to picker.",
        "eco_reward": f"{eco_reward} ECO",
        "picker_id": req.picker_id
    }

@app.get("/api/agent/stats")
async def get_agent_stats(agent_id: str):
    """Return today's collection count and total plastic kg for a field agent."""
    # Preference: Google Sheets if configured
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        try:
            payload = {"type": "get_agent_stats", "agent_id": agent_id}
            resp = requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)
            if resp.ok:
                return resp.json()
        except Exception as e:
            print(f"[CLOUD STATS ERROR] {e}")

    # Fallback: Local SQLite
    db = SessionLocal()
    try:
        today_ist = _now_ist().date()
        all_today = (
            db.query(TokenMint)
            .filter(
                TokenMint.minted_at >= datetime.datetime(today_ist.year, today_ist.month, today_ist.day, 0, 0, 0)
            )
            .all()
        )
        count_today = len(all_today)
        total_kg_today = round(sum((r.weight_kg or 0.0) for r in all_today), 2)
        return {
            "agent_id": agent_id,
            "today_collections": count_today,
            "total_plastic_kg": total_kg_today,
        }
    finally:
        db.close()

@app.get("/api/company/uploads")
async def get_company_uploads(company_id: str, status: str = "pending"):
    # 1. Try Google Sheets first for global sync
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        try:
            resp = requests.post(APPS_SCRIPT_URL, json={"type": "get_company_uploads", "company_id": company_id, "status": status}, timeout=5)
            if resp.ok:
                data = resp.json()
                if data.get("uploads") and len(data["uploads"]) > 0:
                    return data
        except Exception as e:
            print(f"[CLOUD UPLOADS ERROR] {e}")

    # 2. Fallback: Local SQLite
    db = SessionLocal()
    try:
        rows = (
            db.query(Upload)
            .filter(Upload.company_id == str(company_id))
            .filter(Upload.status == str(status))
            .order_by(Upload.created_at.desc())
            .all()
        )
        uploads = [
            {
                "upload_id": r.upload_id,
                "picker_user_id": r.picker_user_id,
                "agent_id": r.agent_id,
                "company_id": r.company_id,
                "image_url": r.image_url,
                "plastic_type": r.plastic_type,
                "weight": r.weight,
                "confidence": r.confidence,
                "status": r.status,
                "created_at": (r.created_at or _now_ist()).isoformat(),
            }
            for r in rows
        ]
        return {"company_id": company_id, "uploads": uploads}
    finally:
        db.close()

@app.post("/api/company/uploads/{upload_id}/approve")
async def approve_upload(upload_id: str, req: UploadActionRequest):
    # Update local DB if exists
    db = SessionLocal()
    try:
        # Simplistic update: find and change status
        row = db.query(Upload).filter(Upload.upload_id == upload_id).all()
        if row:
            db.cursor.execute("UPDATE uploads SET status = 'approved' WHERE upload_id = ?", (upload_id,))
            db.commit()
    finally:
        db.close()

    payload = {"type": "update_upload_status", "upload_id": upload_id, "status": "approved", "company_id": req.company_id}
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)
    return {"message": "Upload approved", "upload_id": upload_id}

@app.post("/api/company/uploads/{upload_id}/reject")
async def reject_upload(upload_id: str, req: UploadActionRequest):
    # Update local DB if exists
    db = SessionLocal()
    try:
        row = db.query(Upload).filter(Upload.upload_id == upload_id).all()
        if row:
            db.cursor.execute("UPDATE uploads SET status = 'rejected' WHERE upload_id = ?", (upload_id,))
            db.commit()
    finally:
        db.close()

    payload = {"type": "update_upload_status", "upload_id": upload_id, "status": "rejected", "company_id": req.company_id, "reason": req.reason}
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)
    return {"message": "Upload rejected", "upload_id": upload_id}

@app.post("/api/company/payments")
async def process_payment(req: PaymentRequest):
    tx_id = f"TX_{_random_hex(12)}"
    payload = {"type": "process_payment", "data": {**req.dict(), "tx_id": tx_id, "status": "paid", "paid_at": datetime.datetime.utcnow().isoformat()}}
    try:
        if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
            requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)

        db = SessionLocal()
        try:
            db.add(Payment(
                payment_id=tx_id,
                upload_id=req.upload_id,
                picker_user_id=req.picker_user_id,
                company_id=req.company_id,
                amount=req.amount,
                status="paid",
                paid_at=_now_ist(),
            ))
            db.commit()
        finally:
            db.close()

        return {"message": "Payment successful", "tx_id": tx_id, "status": "paid", "payment_id": tx_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Payment persistence failed")

@app.get("/api/company/stats")
async def get_company_stats(company_id: str):
    return {"total_offsets": 0.0, "active_collectors": 0, "verified_plastic": 0, "impact_budget": 0}

@app.get("/api/picker/payments")
async def get_picker_payments(picker_id: str):
    # Cloud check
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        try:
            resp = requests.post(APPS_SCRIPT_URL, json={"type": "get_picker_payments", "picker_id": picker_id}, timeout=5)
            if resp.ok: return resp.json()
        except Exception as e: print(f"[CLOUD PAYMENTS ERROR] {e}")

    db = SessionLocal()
    try:
        rows = (
            db.query(Payment)
            .filter(Payment.picker_user_id == str(picker_id))
            .order_by(Payment.paid_at.desc())
            .limit(100)
            .all()
        )
        payments = [
            {
                "payment_id": r.payment_id,
                "upload_id": r.upload_id,
                "picker_user_id": r.picker_user_id,
                "company_id": r.company_id,
                "amount": r.amount,
                "status": r.status,
                "paid_at": (r.paid_at or _now_ist()).isoformat(),
            }
            for r in rows
        ]
        return {"picker_id": picker_id, "payments": payments}
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Google Drive & AI Services
# ---------------------------------------------------------------------------
class DriveService:
    def __init__(self):
        self.folder_id = os.getenv("DRIVE_FOLDER_ID", "")
    def upload_image(self, file_bytes: bytes, filename: str) -> str:
        if not self.folder_id:
            return ""
        return f"https://drive.google.com/file/d/{_random_hex(25)}/view"

drive_svc = DriveService()

try:
    from .ai.ai_service import ai_engine
    AI_AVAILABLE = True
except Exception:
    AI_AVAILABLE = False

def _fallback_ai(image_bytes: bytes) -> dict:
    plastic_types = ["PET", "HDPE", "PVC", "LDPE", "PP", "PS"]
    ptype = random.choice(plastic_types)
    weight = round(float(random.uniform(0.3, 6.5)), 2)
    return {
        "plastic_type": ptype,
        "estimated_weight": f"{weight} kg",
        "confidence": round(float(random.uniform(0.85, 0.99)), 4),
        "fraud_probability": round(float(random.uniform(0.01, 0.08)), 4),
        "resin_code": random.randint(1, 6),
        "recyclability_grade": random.choice(["A+", "A", "B", "C"]),
        "estimated_value_usd": round(float(weight * 0.22), 2),
        "eco_tokens_earned": round(float(weight * 18), 1),
    }

try:
    from .services.blockchain_service import blockchain_svc
    BLOCKCHAIN_AVAILABLE = True
except Exception:
    BLOCKCHAIN_AVAILABLE = False

@app.post("/verify-plastic")
async def verify_plastic(file: UploadFile = File(...)):
    contents = await file.read()
    image_url = drive_svc.upload_image(contents, file.filename)
    result = ai_engine.verify_plastic(contents) if AI_AVAILABLE else _fallback_ai(contents)
    if result.get("fraud_probability", 0) > 0.60:
        return {"status": "rejected", "reason": "Fraud detection triggered", "image_url": image_url}
    if result.get("confidence", 0) < 0.80:
        return {"status": "rejected", "reason": "Low AI confidence", "image_url": image_url}
    return {"status": "approved", "data": result, "image_url": image_url}

@app.post("/api/uploads")
async def create_upload(data: dict):
    payload = {
        "type": "create_upload",
        "data": {
            "upload_id": f"U_{_random_hex(8)}",
            "picker_user_id": data.get("picker_id", "anonymous_picker"),
            "company_id": data.get("company_id", "unknown_company"),
            "image_url": data.get("image_url", ""),
            "plastic_type": data.get("plastic_type", ""),
            "weight": data.get("weight", ""),
            "confidence": data.get("confidence", 0),
            "status": "pending",
            "created_at": _now_ist().isoformat()
        }
    }
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)
    
    # Local fallback
    db = SessionLocal()
    try:
        db.add(Upload(
            upload_id=payload["data"]["upload_id"],
            picker_user_id=payload["data"]["picker_user_id"],
            agent_id="",
            company_id=payload["data"]["company_id"],
            image_url=payload["data"]["image_url"],
            plastic_type=payload["data"]["plastic_type"],
            weight=payload["data"]["weight"],
            confidence=payload["data"]["confidence"],
            status="pending",
            created_at=_now_ist()
        ))
        db.commit()
    finally:
        db.close()

    return {"message": "Upload submitted", "upload": payload["data"]}

@app.post("/mint-token")
async def mint_token(data: dict):
    try:
        plastic_type = data.get("plastic_type", "PET")
        weight = data.get("weight", "1.0 kg")
        if BLOCKCHAIN_AVAILABLE:
            tx = blockchain_svc.mint_token(plastic_type=plastic_type, weight_kg=weight, image_hash=data.get("image_hash", ""), collector_address=data.get("wallet_address", ""), gps_coordinates=data.get("gps", ""))
        else:
            tx_hash = "0x" + _random_hex(64)
            eco_reward = round(_parse_weight_kg(weight) * 18, 2)
            tx = {
                "success": True,
                "mode": "mock",
                "transaction_hash": tx_hash,
                "token_id": random.randint(1, 99999),
                "eco_reward": f"{eco_reward:.2f} ECO",
                "explorer_url": f"https://amoy.polygonscan.com/tx/{tx_hash}",
            }
        
        payload = {"type": "mint_token", "data": {**tx, "user_id": data.get("wallet_address", ""), "plastic_type": plastic_type, "weight": weight}}
        if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
            requests.post(APPS_SCRIPT_URL, json=payload, timeout=5)

        wallet = data.get("wallet_address") or _stable_wallet_address(str(data.get("picker_id") or data.get("identifier") or "anonymous"))
        minted_at = datetime.datetime.utcnow()
        db = SessionLocal()
        try:
            db.add(TokenMint(
                wallet_address=wallet,
                token_id=str(tx.get("token_id", "")),
                transaction_hash=str(tx.get("transaction_hash", "")),
                explorer_url=str(tx.get("explorer_url", "") or ""),
                plastic_type=str(plastic_type or ""),
                weight_kg=_parse_weight_kg(weight),
                eco_reward=_parse_eco(tx.get("eco_reward")),
                minted_at=minted_at,
            ))
            db.commit()
        finally:
            db.close()

        return {"status": "success", "blockchain": tx}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/my-tokens/{wallet_address}")
def my_tokens(wallet_address: str):
    # Find user_id from wallet or use wallet as ID (simplification)
    user_id = wallet_address # In this system they are often used interchangeably for lookups
    
    # Cloud check
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        try:
            resp = requests.post(APPS_SCRIPT_URL, json={"type": "get_picker_tokens", "user_id": user_id}, timeout=5)
            if resp.ok:
                data = resp.json()
                ts = data.get("tokens", [])
                total_eco = sum(_parse_eco(t.get("eco_reward")) for t in ts)
                return {"wallet": wallet_address, "total_tokens": len(ts), "total_eco": round(total_eco, 2), "tokens": ts}
        except Exception as e: print(f"[CLOUD TOKENS ERROR] {e}")

    db = SessionLocal()
    try:
        rows = (
            db.query(TokenMint)
            .filter(TokenMint.wallet_address == wallet_address)
            .order_by(TokenMint.minted_at.desc())
            .limit(200)
            .all()
        )
        tokens = [
            {
                "token_id": r.token_id,
                "plastic_type": r.plastic_type,
                "weight": f"{(r.weight_kg or 0.0):.2f} kg".replace(".00", ""),
                "eco_reward": f"{(r.eco_reward or 0.0):.2f} ECO".replace(".00", ""),
                "minted_at": (r.minted_at or datetime.datetime.utcnow()).isoformat(),
                "explorer_url": r.explorer_url or "",
                "transaction_hash": r.transaction_hash or "",
            }
            for r in rows
        ]
        total_eco = sum((r.eco_reward or 0.0) for r in rows)
        return {"wallet": wallet_address, "total_tokens": len(rows), "total_eco": round(total_eco, 2), "tokens": tokens}
    finally:
        db.close()

@app.get("/api/green-credit-score/{user_id}")
def get_credit_score(user_id: str):
    wallet_address = user_id
    total_kg = 0.0
    total_transactions = 0

    # Cloud check
    if "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL:
        try:
            resp = requests.post(APPS_SCRIPT_URL, json={"type": "get_picker_tokens", "user_id": user_id}, timeout=5)
            if resp.ok:
                ts = resp.json().get("tokens", [])
                total_transactions = len(ts)
                for t in ts:
                    total_kg += _parse_weight_kg(t.get("weight", "0.0 kg"))
                
                # If we found cloud data, use it. Otherwise fallback to local.
                if total_transactions > 0:
                    score = int(min(1000, round(total_kg * 120 + total_transactions * 10)))
                    grade = "D" if score < 500 else ("C" if score < 650 else ("B" if score < 800 else ("A" if score < 900 else "A+")))
                    return {
                        "user_id": user_id,
                        "green_credit_score": score,
                        "grade": grade,
                        "plastic_collected_kg": round(total_kg, 2),
                        "total_transactions": total_transactions,
                    }
        except Exception as e: print(f"[CLOUD SCORE ERROR] {e}")

    db = SessionLocal()
    try:
        rows = db.query(TokenMint).filter(TokenMint.wallet_address == wallet_address).all()
        total_transactions = len(rows)
        total_kg = sum((r.weight_kg or 0.0) for r in rows)
        score = int(min(1000, round(total_kg * 120 + total_transactions * 10)))
        grade = "D" if score < 500 else ("C" if score < 650 else ("B" if score < 800 else ("A" if score < 900 else "A+")))
        return {
            "user_id": wallet_address,
            "green_credit_score": score,
            "grade": grade,
            "plastic_collected_kg": round(total_kg, 2),
            "total_transactions": total_transactions,
        }
    finally:
        db.close()

@app.get("/marketplace")
def get_marketplace_items():
    return []

@app.get("/")
def read_root():
    return {"message": "Welcome to EcoLedger API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "ok", "sheets_ready": "YOUR_SCRIPT_ID" not in APPS_SCRIPT_URL}
