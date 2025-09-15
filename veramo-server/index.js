const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Veramo imports
const { createAgent } = require('@veramo/core');
const { CredentialPlugin } = require('@veramo/credential-w3c');
const { DataStoreORM, DataStore } = require('@veramo/data-store');
const { DIDManager } = require('@veramo/did-manager');
const { KeyManager } = require('@veramo/key-manager');
const { KeyManagementSystem } = require('@veramo/kms-local');
const { EthrDIDProvider } = require('@veramo/did-provider-ethr');
const { DIDResolverPlugin } = require('@veramo/did-resolver');
const { getResolver: ethrResolver } = require('@veramo/did-provider-ethr');
const { getResolver: webResolver } = require('@veramo/did-resolver');

const app = express();
const PORT = process.env.PORT || 3000;
const INFURA_API_KEY = process.env.INFURA_API_KEY || 'your_infura_api_key_here';

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

// Veramo Agent Configuration
let agent;

async function initializeVeramo() {
  try {
    // Create database directory
    const dbPath = path.join(__dirname, 'database');
    fs.ensureDirSync(dbPath);

    agent = createAgent({
      plugins: [
        new KeyManager({
          store: new KeyManagementSystem(),
        }),
        new DIDManager({
          store: new DataStoreORM({
            dbConnection: {
              type: 'sqlite',
              database: path.join(dbPath, 'veramo.sqlite'),
              synchronize: true,
            },
          }),
          defaultProvider: 'did:ethr',
          providers: {
            'did:ethr': new EthrDIDProvider({
              defaultKms: 'local',
              networks: [
                {
                  name: 'mainnet',
                  rpcUrl: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
                  registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b',
                },
                {
                  name: 'sepolia',
                  rpcUrl: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
                  registry: '0x03d0000000000000000000000000000000000000',
                },
                {
                  name: 'goerli',
                  rpcUrl: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
                  registry: '0x03d0000000000000000000000000000000000000',
                },
              ],
            }),
          },
        }),
        new CredentialPlugin(),
        new DIDResolverPlugin({
          resolver: {
            ...ethrResolver(),
            ...webResolver(),
          },
        }),
      ],
    });

    console.log('Veramo agent initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Veramo agent:', error);
    process.exit(1);
  }
}

// Initialize Veramo on startup
initializeVeramo();

// Utility function to compute SHA-256 hash
function computeSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    veramo: agent ? 'initialized' : 'not initialized'
  });
});

// POST /issuer/createDid - Create a new DID
app.post('/issuer/createDid', async (req, res) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Veramo agent not initialized' });
    }

    const identifier = await agent.didManagerCreate({
      provider: 'did:ethr',
      options: {
        network: 'sepolia', // Using Sepolia testnet
      },
    });

    res.json({
      success: true,
      did: identifier.did,
      keys: identifier.keys,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating DID:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create DID',
      details: error.message 
    });
  }
});

// POST /issuer/issueInsurance - Issue Insurance Credential
app.post('/issuer/issueInsurance', async (req, res) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Veramo agent not initialized' });
    }

    const { patientDid, policyNumber, coverage, validity } = req.body;

    if (!patientDid || !policyNumber || !coverage || !validity) {
      return res.status(400).json({ 
        error: 'Missing required fields: patientDid, policyNumber, coverage, validity' 
      });
    }

    // Create the verifiable credential
    const credential = await agent.createVerifiableCredential({
      credential: {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://example.com/credentials/insurance/v1'
        ],
        type: ['VerifiableCredential', 'InsuranceCredential'],
        issuer: {
          id: agent.didManagerGetIdentifiers()[0]?.did || 'did:ethr:0x123...', // Use first available DID
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: patientDid,
          type: 'InsuranceCredential',
          policyNumber: policyNumber,
          coverage: coverage,
          validity: validity,
          issuedBy: 'Insurance Provider'
        },
      },
      format: 'jwt',
      save: true,
    });

    res.json({
      success: true,
      credential: credential,
      type: 'InsuranceCredential',
      issuedTo: patientDid,
      issuedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error issuing insurance credential:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to issue insurance credential',
      details: error.message 
    });
  }
});

// POST /issuer/issueProviderLicense - Issue Provider License Credential
app.post('/issuer/issueProviderLicense', async (req, res) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Veramo agent not initialized' });
    }

    const { providerDid, licenseNumber, specialization } = req.body;

    if (!providerDid || !licenseNumber || !specialization) {
      return res.status(400).json({ 
        error: 'Missing required fields: providerDid, licenseNumber, specialization' 
      });
    }

    // Create the verifiable credential
    const credential = await agent.createVerifiableCredential({
      credential: {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://example.com/credentials/provider/v1'
        ],
        type: ['VerifiableCredential', 'ProviderLicenseCredential'],
        issuer: {
          id: agent.didManagerGetIdentifiers()[0]?.did || 'did:ethr:0x123...', // Use first available DID
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: providerDid,
          type: 'ProviderLicenseCredential',
          licenseNumber: licenseNumber,
          specialization: specialization,
          issuedBy: 'Medical Licensing Board'
        },
      },
      format: 'jwt',
      save: true,
    });

    res.json({
      success: true,
      credential: credential,
      type: 'ProviderLicenseCredential',
      issuedTo: providerDid,
      issuedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error issuing provider license credential:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to issue provider license credential',
      details: error.message 
    });
  }
});

// POST /issuer/verify - Verify any Verifiable Credential
app.post('/issuer/verify', async (req, res) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Veramo agent not initialized' });
    }

    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        error: 'Missing required field: credential' 
      });
    }

    // Verify the credential
    const result = await agent.verifyCredential({
      credential: credential,
    });

    res.json({
      success: true,
      verified: result.verified,
      result: result,
      verifiedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying credential:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify credential',
      details: error.message 
    });
  }
});

// POST /issuer/upload - Upload file and return hash + URL
app.post('/issuer/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded' 
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    // Compute SHA-256 hash
    const sha256Hash = computeSHA256(filePath);

    // Generate file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;

    res.json({
      success: true,
      file: {
        originalName: originalName,
        fileName: fileName,
        fileUrl: fileUrl,
        sha256Hash: sha256Hash,
        size: fileSize,
        mimeType: mimeType,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Veramo Identity Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /issuer/createDid`);
  console.log(`   POST /issuer/issueInsurance`);
  console.log(`   POST /issuer/issueProviderLicense`);
  console.log(`   POST /issuer/verify`);
  console.log(`   POST /issuer/upload`);
});

module.exports = app;
