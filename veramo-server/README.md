# Veramo Identity Server

A Node.js Express server with Veramo for handling decentralized identity (DID) and Verifiable Credentials (VCs) in the context of insurance claims management.

## Features

- **DID Management**: Create and manage Ethereum-based DIDs using `did:ethr`
- **Verifiable Credentials**: Issue and verify insurance and provider license credentials
- **File Upload**: Secure file upload with SHA-256 hashing and local storage
- **RESTful API**: Clean REST endpoints for all operations
- **Security**: Helmet, CORS, and input validation

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Infura account (for Ethereum network access)

## Installation

1. Navigate to the veramo-server directory:
```bash
cd veramo-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your Infura API key:
```env
INFURA_API_KEY=your_infura_api_key_here
PORT=3000
```

## Configuration

### Infura Setup
1. Go to [Infura](https://infura.io/)
2. Create a new project
3. Copy your API key
4. Update the `.env` file

### Network Configuration
The server is configured to use Sepolia testnet by default. You can modify the network in `index.js`:

```javascript
networks: [
  {
    name: 'sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    registry: '0x03d0000000000000000000000000000000000000',
  }
]
```

## Usage

### Start the Server

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

### API Endpoints

#### 1. Health Check
```http
GET /health
```

#### 2. Create DID
```http
POST /issuer/createDid
```

**Response:**
```json
{
  "success": true,
  "did": "did:ethr:0x123...",
  "keys": [...],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 3. Issue Insurance Credential
```http
POST /issuer/issueInsurance
Content-Type: application/json

{
  "patientDid": "did:ethr:0x123...",
  "policyNumber": "POL123456",
  "coverage": "Comprehensive",
  "validity": "2024-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "credential": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9...",
  "type": "InsuranceCredential",
  "issuedTo": "did:ethr:0x123...",
  "issuedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 4. Issue Provider License Credential
```http
POST /issuer/issueProviderLicense
Content-Type: application/json

{
  "providerDid": "did:ethr:0x456...",
  "licenseNumber": "LIC789012",
  "specialization": "Cardiology"
}
```

**Response:**
```json
{
  "success": true,
  "credential": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9...",
  "type": "ProviderLicenseCredential",
  "issuedTo": "did:ethr:0x456...",
  "issuedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 5. Verify Credential
```http
POST /issuer/verify
Content-Type: application/json

{
  "credential": "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NkstUiJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "result": {
    "verified": true,
    "credential": {...}
  },
  "verifiedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 6. Upload File
```http
POST /issuer/upload
Content-Type: multipart/form-data

file: [binary file data]
```

**Response:**
```json
{
  "success": true,
  "file": {
    "originalName": "document.pdf",
    "fileName": "file-1234567890-123456789.pdf",
    "fileUrl": "http://localhost:3000/uploads/file-1234567890-123456789.pdf",
    "sha256Hash": "a1b2c3d4e5f6...",
    "size": 1024,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## File Storage

- Uploaded files are stored in the `/uploads` directory
- Files are served statically at `/uploads/{filename}`
- SHA-256 hash is computed for each uploaded file
- File size limit: 10MB

## Database

- SQLite database is created automatically in `/database/veramo.sqlite`
- Stores DIDs, keys, and credentials
- Database is created on first run

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Request body validation
- **File Upload Limits**: 10MB file size limit
- **Error Handling**: Comprehensive error handling

## Development

### Project Structure
```
veramo-server/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── README.md            # This file
├── .env.example         # Environment variables template
├── uploads/             # File upload directory
└── database/            # SQLite database directory
```

### Adding New Credential Types

To add new credential types, follow this pattern:

```javascript
// POST /issuer/issueCustomCredential
app.post('/issuer/issueCustomCredential', async (req, res) => {
  const { subjectDid, customField1, customField2 } = req.body;
  
  const credential = await agent.createVerifiableCredential({
    credential: {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://example.com/credentials/custom/v1'
      ],
      type: ['VerifiableCredential', 'CustomCredential'],
      issuer: { id: issuerDid },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subjectDid,
        type: 'CustomCredential',
        customField1: customField1,
        customField2: customField2,
      },
    },
    format: 'jwt',
    save: true,
  });
  
  res.json({ success: true, credential });
});
```

## Testing

Test the endpoints using curl or Postman:

```bash
# Health check
curl http://localhost:3000/health

# Create DID
curl -X POST http://localhost:3000/issuer/createDid

# Issue insurance credential
curl -X POST http://localhost:3000/issuer/issueInsurance \
  -H "Content-Type: application/json" \
  -d '{
    "patientDid": "did:ethr:0x123...",
    "policyNumber": "POL123456",
    "coverage": "Comprehensive",
    "validity": "2024-12-31"
  }'
```

## Troubleshooting

### Common Issues

1. **Veramo agent not initialized**
   - Check Infura API key in `.env`
   - Ensure network connectivity

2. **File upload fails**
   - Check file size (max 10MB)
   - Ensure `/uploads` directory exists

3. **DID creation fails**
   - Verify Infura API key
   - Check network configuration

### Logs

The server provides detailed logging for debugging:
- Request/response logging with Morgan
- Error logging to console
- Veramo agent status

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

