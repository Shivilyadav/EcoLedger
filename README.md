# EcoLedger - Setup Instructions

## Backend Setup
1. Navigate to `backend/`
2. Install dependencies: `pip install -r requirements.txt`
3. Set environment variables (optional for prototype):
   - `DATABASE_URL`: Connection string to your external DB
     - SQLite default: `sqlite:///./ecoledger.db`
     - MySQL example: `mysql+pymysql://user:pass@host:3306/ecoledger`
   - `POLYGON_RPC_URL`: RPC for Polygon network
   - `PRIVATE_KEY`: Private key for minting wallet
   - OTP email (SMTP):
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
   - OTP SMS (Twilio):
     - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
   - Optional Nodemailer service:
     - `NODEMAILER_URL`, `NODEMAILER_API_KEY`
   - Google Drive image storage:
     - `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_CONTENT`
     - `DRIVE_FOLDER_ID`
4. Run the server: `uvicorn app.main:app --reload`
   - For phone/LAN access: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

## Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
   - For phone/LAN access, Vite is configured to bind on `0.0.0.0` (same command).

## Phone / Port Forwarding Notes
- If you open the frontend on your phone via `http://<your-PC-LAN-IP>:3000`, the frontend will call the backend at `http://<your-PC-LAN-IP>:8000` by default in dev.
- If you deploy the frontend (Netlify/Vercel/etc.), set `VITE_API_BASE_URL` at build time to your deployed backend URL.
- Google Sheets via Apps Script is already hosted by Google; once deployed as a Web App (access: Anyone), it works from mobile without any port forwarding.

## Smart Contract Setup
1. The contract is located in `smart-contract/contracts/PlasticCredit.sol`
2. Deploy using Hardhat or Foundry to Polygon (Amoy testnet recommended for prototype).

## Email Service (Nodemailer, Optional)
1. Navigate to `backend/email_service/`
2. Install dependencies: `npm install`
3. Set SMTP env vars and optional `EMAIL_SERVICE_API_KEY`
4. Run: `npm run dev`
5. Set `NODEMAILER_URL=http://localhost:4010` in backend to use it

## AI Module
The AI service uses a CNN architecture. For prototype purposes, it uses simulated inference. To use a real model, place your `.h5` or `.tflite` model in `backend/app/ai/models/`.

## Google Drive Image Storage (Optional)
1. Create a Google Cloud project and enable the Google Drive API.
2. Create a Service Account and download the JSON key.
3. Create a Drive folder, then share it with the service account email.
4. Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the JSON path and `DRIVE_FOLDER_ID` to the folder ID.
