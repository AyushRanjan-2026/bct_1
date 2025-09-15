const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001; // Different port to avoid conflicts

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
  }
});

// Utility function to compute SHA-256 hash
function computeSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Mock DID creation (without Veramo)
app.post('/issuer/createDid', (req, res) => {
  const mockDid = `did:ethr:0x${Math.random().toString(16).substr(2, 40)}`;
  res.json({
    success: true,
    did: mockDid,
    keys: [],
    createdAt: new Date().toISOString()
  });
});

// Mock Insurance Credential (without Veramo)
app.post('/issuer/issueInsurance', (req, res) => {
  const { patientDid, policyNumber, coverage, validity } = req.body;
  
  if (!patientDid || !policyNumber || !coverage || !validity) {
    return res.status(400).json({ 
      error: 'Missing required fields: patientDid, policyNumber, coverage, validity' 
    });
  }

  const mockCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'InsuranceCredential'],
    credentialSubject: {
      id: patientDid,
      policyNumber,
      coverage,
      validity
    },
    issuanceDate: new Date().toISOString()
  };

  res.json({
    success: true,
    credential: JSON.stringify(mockCredential),
    type: 'InsuranceCredential',
    issuedTo: patientDid,
    issuedAt: new Date().toISOString()
  });
});

// Mock Provider License Credential (without Veramo)
app.post('/issuer/issueProviderLicense', (req, res) => {
  const { providerDid, licenseNumber, specialization } = req.body;
  
  if (!providerDid || !licenseNumber || !specialization) {
    return res.status(400).json({ 
      error: 'Missing required fields: providerDid, licenseNumber, specialization' 
    });
  }

  const mockCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'ProviderLicenseCredential'],
    credentialSubject: {
      id: providerDid,
      licenseNumber,
      specialization
    },
    issuanceDate: new Date().toISOString()
  };

  res.json({
    success: true,
    credential: JSON.stringify(mockCredential),
    type: 'ProviderLicenseCredential',
    issuedTo: providerDid,
    issuedAt: new Date().toISOString()
  });
});

// Mock Credential Verification (without Veramo)
app.post('/issuer/verify', (req, res) => {
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
});

// File Upload (real implementation)
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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mode: 'mock'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Veramo Identity Server running on port ${PORT}`);
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

