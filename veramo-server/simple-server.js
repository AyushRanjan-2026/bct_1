const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

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
    veramo: 'mock mode'
  });
});

// POST /issuer/createDid - Create a new DID (mock)
app.post('/issuer/createDid', (req, res) => {
  try {
    const mockDid = `did:ethr:0x${Math.random().toString(16).substr(2, 40)}`;
    res.json({
      success: true,
      did: mockDid,
      keys: [],
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

// POST /issuer/issueInsurance - Issue Insurance Credential (mock)
app.post('/issuer/issueInsurance', (req, res) => {
  try {
    const { patientDid, policyNumber, coverage, validity } = req.body;

    if (!patientDid || !policyNumber || !coverage || !validity) {
      return res.status(400).json({ 
        error: 'Missing required fields: patientDid, policyNumber, coverage, validity' 
      });
    }

    // Create the verifiable credential
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://example.com/credentials/insurance/v1'
      ],
      type: ['VerifiableCredential', 'InsuranceCredential'],
      issuer: {
        id: 'did:ethr:0x1234567890123456789012345678901234567890',
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
    };

    res.json({
      success: true,
      credential: JSON.stringify(credential),
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

// POST /issuer/issueProviderLicense - Issue Provider License Credential (mock)
app.post('/issuer/issueProviderLicense', (req, res) => {
  try {
    const { providerDid, licenseNumber, specialization } = req.body;

    if (!providerDid || !licenseNumber || !specialization) {
      return res.status(400).json({ 
        error: 'Missing required fields: providerDid, licenseNumber, specialization' 
      });
    }

    // Create the verifiable credential
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://example.com/credentials/provider/v1'
      ],
      type: ['VerifiableCredential', 'ProviderLicenseCredential'],
      issuer: {
        id: 'did:ethr:0x1234567890123456789012345678901234567890',
      },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: providerDid,
        type: 'ProviderLicenseCredential',
        licenseNumber: licenseNumber,
        specialization: specialization,
        issuedBy: 'Medical Licensing Board'
      },
    };

    res.json({
      success: true,
      credential: JSON.stringify(credential),
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

// POST /issuer/verify - Verify any Verifiable Credential (mock)
app.post('/issuer/verify', (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        error: 'Missing required field: credential' 
      });
    }

    // Mock verification - always returns true for demo
    res.json({
      success: true,
      verified: true,
      result: {
        verified: true,
        credential: typeof credential === 'string' ? JSON.parse(credential) : credential
      },
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
  console.log(`🚀 Veramo Identity Server (Mock Mode) running on port ${PORT}`);
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

