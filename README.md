# Decentralized Insurance Claims System

A complete blockchain-based insurance claims management system using Ethereum smart contracts, Veramo for decentralized identity, and React frontend.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Veramo Backend │    │  Hardhat Node   │
│   (Port 3001)   │◄──►│   (Port 3000)   │    │   (Port 8545)   │
│                 │    │                 │    │                 │
│ • Submit Claims │    │ • DID Creation  │    │ • Claims Contract│
│ • MetaMask UI   │    │ • VC Issuance   │    │ • Event Logging │
│ • File Upload   │    │ • VC Verification│    │ • State Management│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start Guide

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd major_project
```

### 2. Start Hardhat Node and Deploy Contract

```bash
# Terminal 1: Start Hardhat node
cd major_project
npx hardhat node

# Terminal 2: Deploy Claims contract
cd major_project
npm run deploy

# Copy the deployed contract address from the output
# Example: Claims contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 3. Start Veramo Backend Server

```bash
# Terminal 3: Start the DID/VC server
cd veramo-server
npm install
cp env.example .env
# Edit .env with your Infura API key (optional for local testing)
npm start
```

The backend will be available at `http://localhost:3000`

### 4. Start React Frontend

```bash
# Terminal 4: Start the frontend
cd claims-frontend
npm install
cp env.example .env.local
# Edit .env.local with the deployed contract address
npm run dev
```

The frontend will be available at `http://localhost:3001`

### 5. Configure Contract Address

Update `claims-frontend/.env.local`:
```env
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_API_URL=http://localhost:3000
VITE_NETWORK_NAME=hardhat
VITE_NETWORK_CHAIN_ID=1337
```

## 🔄 Complete Workflow

### Step 1: Patient Gets DID and Insurance VC

```bash
# Create a patient DID
curl -X POST http://localhost:3000/issuer/createDid

# Response:
{
  "success": true,
  "did": "did:ethr:0x1234567890123456789012345678901234567890",
  "keys": [...],
  "createdAt": "2024-01-01T00:00:00.000Z"
}

# Issue insurance credential to patient
curl -X POST http://localhost:3000/issuer/issueInsurance \
  -H "Content-Type: application/json" \
  -d '{
    "patientDid": "did:ethr:0x1234567890123456789012345678901234567890",
    "policyNumber": "POL123456",
    "coverage": "Comprehensive Health Insurance",
    "validity": "2024-12-31"
  }'

# Response:
{
  "success": true,
  "credential": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9...",
  "type": "InsuranceCredential",
  "issuedTo": "did:ethr:0x1234567890123456789012345678901234567890",
  "issuedAt": "2024-01-01T00:00:00.000Z"
}
```

### Step 2: Provider Verifies VC and Uploads File

```bash
# Verify the insurance credential
curl -X POST http://localhost:3000/issuer/verify \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9..."
  }'

# Response:
{
  "success": true,
  "verified": true,
  "result": {
    "verified": true,
    "credential": {...}
  },
  "verifiedAt": "2024-01-01T00:00:00.000Z"
}

# Upload supporting document
curl -X POST -F "file=@medical-report.pdf" http://localhost:3000/issuer/upload

# Response:
{
  "success": true,
  "file": {
    "originalName": "medical-report.pdf",
    "fileName": "file-1234567890-123456789.pdf",
    "fileUrl": "http://localhost:3000/uploads/file-1234567890-123456789.pdf",
    "sha256Hash": "a1b2c3d4e5f6789...",
    "size": 1024000,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Step 3: Submit Claim via Frontend

1. Open `http://localhost:3001`
2. Connect MetaMask wallet
3. Switch to Hardhat local network (Chain ID: 1337)
4. Fill out the claim form:
   - **Patient DID**: `did:ethr:0x1234567890123456789012345678901234567890`
   - **Insurance VC**: Paste the credential from Step 1
   - **Claim Amount**: `0.1` ETH
   - **File**: Upload the PDF document
5. Click "Submit Claim"
6. Watch the progress:
   - ✅ Verifying insurance credential
   - ✅ Uploading file and computing hash
   - ✅ Submitting claim to smart contract
   - ✅ Claim submitted successfully!

### Step 4: Insurer Approves/Rejects Claims

```bash
# Connect to Hardhat console
cd major_project
npx hardhat console --network localhost

# In the console:
const Claims = await ethers.getContractFactory("Claims");
const claims = Claims.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

# Get all claims
const totalClaims = await claims.getTotalClaims();
console.log("Total claims:", totalClaims.toString());

# Get specific claim details
const claim = await claims.getClaim(1);
console.log("Claim details:", claim);

# Approve claim (only owner can do this)
await claims.approveClaim(1);

# Reject claim
await claims.rejectClaim(2);

# Settle approved claim (transfers funds to patient)
await claims.settleClaim(1);
```

## 🧪 Testing Commands

### Test Backend Health
```bash
curl http://localhost:3000/health
```

### Test DID Creation
```bash
curl -X POST http://localhost:3000/issuer/createDid
```

### Test Insurance VC Issuance
```bash
curl -X POST http://localhost:3000/issuer/issueInsurance \
  -H "Content-Type: application/json" \
  -d '{
    "patientDid": "did:ethr:0x1234567890123456789012345678901234567890",
    "policyNumber": "POL123456",
    "coverage": "Comprehensive",
    "validity": "2024-12-31"
  }'
```

### Test Provider License VC Issuance
```bash
curl -X POST http://localhost:3000/issuer/issueProviderLicense \
  -H "Content-Type: application/json" \
  -d '{
    "providerDid": "did:ethr:0x0987654321098765432109876543210987654321",
    "licenseNumber": "LIC987654321",
    "specialization": "Cardiology"
  }'
```

### Test VC Verification
```bash
curl -X POST http://localhost:3000/issuer/verify \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "PASTE_CREDENTIAL_HERE"
  }'
```

### Test File Upload
```bash
# Create a test file
echo "Test medical report content" > test-document.pdf

# Upload the file
curl -X POST -F "file=@test-document.pdf" http://localhost:3000/issuer/upload
```

### Test Smart Contract Functions
```bash
# Get contract balance
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["0x5FbDB2315678afecb367f032d93F642f64180aa3", "latest"],
    "id": 1
  }'

# Get total claims count
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "data": "0x8d3638f4"
    }, "latest"],
    "id": 1
  }'
```

## 📁 Project Structure

```
major_project/
├── contracts/
│   └── Claims.sol              # Smart contract for claims management
├── scripts/
│   └── deploy.js               # Contract deployment script
├── test/
│   └── Claims.test.js          # Smart contract tests
├── veramo-server/
│   ├── index.js                # Express server with Veramo
│   ├── package.json            # Backend dependencies
│   └── README.md               # Backend documentation
├── claims-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── SubmitClaim.jsx # React claim submission component
│   │   ├── utils/
│   │   │   ├── api.js          # Backend API service
│   │   │   ├── contract.js     # Contract ABI and config
│   │   │   └── ethers.js       # Ethereum utilities
│   │   └── App.jsx             # Main React app
│   ├── package.json            # Frontend dependencies
│   └── README.md               # Frontend documentation
├── hardhat.config.js           # Hardhat configuration
├── package.json                # Root dependencies
└── README.md                   # This file
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
INFURA_API_KEY=your_infura_api_key_here
PORT=3000
```

#### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3000
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_NETWORK_NAME=hardhat
VITE_NETWORK_CHAIN_ID=1337
```

### MetaMask Configuration

1. Install MetaMask browser extension
2. Add Hardhat local network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `1337`
   - Currency Symbol: `ETH`
3. Import test accounts from Hardhat (check console output for private keys)

## 🐛 Troubleshooting

### Common Issues

1. **"Backend Service Unavailable"**
   - Ensure Veramo server is running on port 3000
   - Check if all dependencies are installed

2. **"MetaMask Not Detected"**
   - Install MetaMask browser extension
   - Refresh the page after installation

3. **"Transaction Failed"**
   - Ensure you're on the correct network (Hardhat local)
   - Check if you have enough ETH for gas fees
   - Verify contract address is correct

4. **"File Upload Failed"**
   - Check file size (max 10MB)
   - Ensure file is PDF format
   - Verify backend service is running

5. **"VC Verification Failed"**
   - Check if the credential format is correct
   - Ensure the backend can parse the credential
   - Verify the credential hasn't expired

### Debug Mode

Enable detailed logging:
- **Frontend**: Open browser console (F12)
- **Backend**: Check terminal output
- **Smart Contract**: Use Hardhat console

### Reset Everything

```bash
# Stop all services (Ctrl+C in each terminal)
# Clean up
rm -rf veramo-server/database/
rm -rf veramo-server/uploads/*
rm -rf claims-frontend/dist/

# Restart everything
# 1. Start Hardhat node
# 2. Deploy contract
# 3. Start backend
# 4. Start frontend
```

## 📊 System Status

| Component | Status | Port | Description |
|-----------|--------|------|-------------|
| Hardhat Node | ✅ Running | 8545 | Ethereum local network |
| Claims Contract | ✅ Deployed | - | Smart contract for claims |
| Veramo Backend | ✅ Running | 3000 | DID/VC management |
| React Frontend | ✅ Running | 3001 | User interface |

## 🚀 Production Deployment

### Smart Contract
1. Deploy to testnet (Sepolia/Goerli)
2. Verify contract on Etherscan
3. Update frontend configuration

### Backend
1. Deploy to cloud provider (AWS/GCP/Azure)
2. Set up database (PostgreSQL/MongoDB)
3. Configure environment variables
4. Set up SSL certificates

### Frontend
1. Build production bundle: `npm run build`
2. Deploy to static hosting (Vercel/Netlify)
3. Configure environment variables
4. Set up custom domain

## 📝 API Documentation

### Backend Endpoints

- `GET /health` - Health check
- `POST /issuer/createDid` - Create new DID
- `POST /issuer/issueInsurance` - Issue insurance credential
- `POST /issuer/issueProviderLicense` - Issue provider license credential
- `POST /issuer/verify` - Verify any credential
- `POST /issuer/upload` - Upload file and get hash

### Smart Contract Functions

- `submitClaim(patient, amount, docHash)` - Submit new claim
- `approveClaim(claimId)` - Approve claim (owner only)
- `rejectClaim(claimId)` - Reject claim (owner only)
- `settleClaim(claimId)` - Settle approved claim (owner only)
- `getClaim(claimId)` - Get claim details
- `getTotalClaims()` - Get total number of claims

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in browser console and terminal
3. Open an issue on GitHub
4. Check the individual component READMEs for detailed documentation

---

**Happy Claiming! 🎉**