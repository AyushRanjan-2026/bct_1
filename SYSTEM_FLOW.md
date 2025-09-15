# System Flow Diagram

## Complete Claims Process Flow

```
1. PATIENT SETUP
   ┌─────────────────┐
   │ Patient requests│
   │ insurance       │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐    ┌─────────────────┐
   │ Create Patient  │    │ Issue Insurance │
   │ DID             │    │ VC              │
   └─────────┬───────┘    └─────────┬───────┘
             │                      │
             ▼                      ▼
   ┌─────────────────┐    ┌─────────────────┐
   │ did:ethr:0x123  │    │ InsuranceCredential│
   │ (Patient DID)   │    │ (JSON Web Token) │
   └─────────────────┘    └─────────────────┘

2. PROVIDER SUBMITS CLAIM
   ┌─────────────────┐
   │ Provider opens  │
   │ Claims Portal   │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Connect MetaMask│
   │ Wallet          │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Fill Claim Form │
   │ • Patient DID   │
   │ • Insurance VC  │
   │ • Claim Amount  │
   │ • Upload PDF    │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Verify VC with  │
   │ Backend API     │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Upload File &   │
   │ Get SHA-256 Hash│
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Submit to Smart │
   │ Contract via    │
   │ MetaMask        │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Claim Submitted │
   │ (Status: Pending)│
   └─────────────────┘

3. INSURER REVIEWS CLAIMS
   ┌─────────────────┐
   │ Insurer checks  │
   │ Smart Contract  │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Review Claim    │
   │ Details         │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Approve/Reject  │
   │ via Contract    │
   └─────────┬───────┘
             │
             ▼
   ┌─────────────────┐
   │ Settle Approved │
   │ Claims          │
   └─────────────────┘
```

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   React App     │  │   MetaMask      │  │   Browser       │ │
│  │   (Port 3001)   │  │   Extension     │  │   Console       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Veramo Server  │  │   File Storage  │  │   API Gateway   │ │
│  │   (Port 3000)   │  │   (/uploads)    │  │   (Express)     │ │
│  │                 │  │                 │  │                 │ │
│  │ • DID Creation  │  │ • PDF Files     │  │ • CORS          │ │
│  │ • VC Issuance   │  │ • SHA-256 Hash  │  │ • Validation    │ │
│  │ • VC Verification│  │ • Static Serve │  │ • Error Handling│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BLOCKCHAIN LAYER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Hardhat Node   │  │  Claims Contract│  │   Event Logs    │ │
│  │   (Port 8545)   │  │   (Ethereum)    │  │   (Real-time)   │ │
│  │                 │  │                 │  │                 │ │
│  │ • Local Network │  │ • submitClaim() │  │ • ClaimSubmitted│ │
│  │ • Test Accounts │  │ • approveClaim()│  │ • ClaimApproved │ │
│  │ • Gas Simulation│  │ • rejectClaim() │  │ • ClaimRejected │ │
│  │                 │  │ • settleClaim() │  │ • ClaimSettled  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## API Flow Sequence

```
1. Frontend → Backend: POST /issuer/verify
   └─ Verify insurance credential

2. Frontend → Backend: POST /issuer/upload
   └─ Upload PDF file, get SHA-256 hash

3. Frontend → MetaMask: Request transaction
   └─ User approves transaction

4. MetaMask → Blockchain: submitClaim()
   └─ Submit claim to smart contract

5. Blockchain → Frontend: Event emission
   └─ ClaimSubmitted event with claim ID

6. Frontend → User: Success notification
   └─ Display transaction details
```

## Data Flow

```
Patient DID: did:ethr:0x123...
    │
    ▼
Insurance VC: {"@context":[...],"type":["VerifiableCredential"...]}
    │
    ▼
File Upload: medical-report.pdf → SHA-256: a1b2c3d4...
    │
    ▼
Smart Contract: submitClaim(patientAddress, amount, docHash)
    │
    ▼
Event: ClaimSubmitted(claimId, provider, patient, amount, docHash)
    │
    ▼
Status Update: Claim submitted successfully!
```

## Error Handling Flow

```
Error Detection
    │
    ▼
┌─────────────────┐
│ Error Type?     │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌─────────┐ ┌─────────┐
│ Network │ │ Validation│
│ Error   │ │ Error    │
└─────────┘ └─────────┘
    │           │
    ▼           ▼
┌─────────┐ ┌─────────┐
│ Retry   │ │ Show    │
│ Logic   │ │ Message │
└─────────┘ └─────────┘
```

## Security Flow

```
1. MetaMask Authentication
   └─ User connects wallet

2. Network Validation
   └─ Ensure correct network (Hardhat local)

3. VC Verification
   └─ Cryptographic verification of credentials

4. File Validation
   └─ Type and size validation

5. Smart Contract Validation
   └─ Input validation and gas estimation

6. Transaction Confirmation
   └─ User approval required for all transactions
```

