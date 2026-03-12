# EcoLedger - Setup Instructions

## Backend Setup
1. Navigate to `backend/`
2. Install dependencies: `pip install -r requirements.txt`
3. Set environment variables (optional for prototype):
   - `DATABASE_URL`: Connection string to your external DB
   - `POLYGON_RPC_URL`: RPC for Polygon network
   - `PRIVATE_KEY`: Private key for minting wallet
4. Run the server: `uvicorn app.main:app --reload`

## Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## Smart Contract Setup
1. The contract is located in `smart-contract/contracts/PlasticCredit.sol`
2. Deploy using Hardhat or Foundry to Polygon (Amoy testnet recommended for prototype).

## AI Module
The AI service uses a CNN architecture. For prototype purposes, it uses simulated inference. To use a real model, place your `.h5` or `.tflite` model in `backend/app/ai/models/`.
