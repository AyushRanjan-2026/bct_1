const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  patientDid: 'did:ethr:0x1234567890123456789012345678901234567890',
  providerDid: 'did:ethr:0x0987654321098765432109876543210987654321',
  policyNumber: 'POL123456789',
  coverage: 'Comprehensive Health Insurance',
  validity: '2024-12-31',
  licenseNumber: 'LIC987654321',
  specialization: 'Cardiology'
};

async function testAPI() {
  console.log('🧪 Testing Veramo Identity Server API\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    console.log('');

    // Test 2: Create DID
    console.log('2. Testing DID Creation...');
    const didResponse = await fetch(`${BASE_URL}/issuer/createDid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const didData = await didResponse.json();
    console.log('✅ DID Created:', didData);
    console.log('');

    // Update test data with actual DID
    if (didData.success) {
      testData.patientDid = didData.did;
    }

    // Test 3: Issue Insurance Credential
    console.log('3. Testing Insurance Credential Issuance...');
    const insuranceResponse = await fetch(`${BASE_URL}/issuer/issueInsurance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientDid: testData.patientDid,
        policyNumber: testData.policyNumber,
        coverage: testData.coverage,
        validity: testData.validity
      })
    });
    const insuranceData = await insuranceResponse.json();
    console.log('✅ Insurance Credential:', insuranceData);
    console.log('');

    // Test 4: Issue Provider License Credential
    console.log('4. Testing Provider License Credential Issuance...');
    const providerResponse = await fetch(`${BASE_URL}/issuer/issueProviderLicense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerDid: testData.providerDid,
        licenseNumber: testData.licenseNumber,
        specialization: testData.specialization
      })
    });
    const providerData = await providerResponse.json();
    console.log('✅ Provider License Credential:', providerData);
    console.log('');

    // Test 5: Verify Credential (using insurance credential)
    if (insuranceData.success && insuranceData.credential) {
      console.log('5. Testing Credential Verification...');
      const verifyResponse = await fetch(`${BASE_URL}/issuer/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: insuranceData.credential
        })
      });
      const verifyData = await verifyResponse.json();
      console.log('✅ Credential Verification:', verifyData);
      console.log('');
    }

    // Test 6: File Upload
    console.log('6. Testing File Upload...');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for upload functionality.');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    
    const uploadResponse = await fetch(`${BASE_URL}/issuer/upload`, {
      method: 'POST',
      body: formData
    });
    const uploadData = await uploadResponse.json();
    console.log('✅ File Upload:', uploadData);
    console.log('');

    // Clean up test file
    fs.unlinkSync(testFilePath);

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the server is running on http://localhost:3000');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = testAPI;

