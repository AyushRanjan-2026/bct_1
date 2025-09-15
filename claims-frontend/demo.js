// Demo script to test the frontend functionality

// Mock data for testing
const mockData = {
  patientDid: 'did:ethr:0x1234567890123456789012345678901234567890',
  insuranceVc: JSON.stringify({
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'InsuranceCredential'],
    credentialSubject: {
      id: 'did:ethr:0x1234567890123456789012345678901234567890',
      policyNumber: 'POL123456',
      coverage: 'Comprehensive Health Insurance',
      validity: '2024-12-31'
    },
    issuanceDate: new Date().toISOString()
  }),
  claimAmount: '0.1',
  file: {
    name: 'medical-report.pdf',
    size: 1024 * 1024, // 1MB
    type: 'application/pdf'
  }
};

console.log('🎯 Claims Frontend Demo Data');
console.log('============================');
console.log('');
console.log('Patient DID:');
console.log(mockData.patientDid);
console.log('');
console.log('Insurance VC:');
console.log(mockData.insuranceVc);
console.log('');
console.log('Claim Amount:');
console.log(mockData.claimAmount, 'ETH');
console.log('');
console.log('File Info:');
console.log(`Name: ${mockData.file.name}`);
console.log(`Size: ${(mockData.file.size / 1024).toFixed(1)} KB`);
console.log(`Type: ${mockData.file.type}`);
console.log('');
console.log('🚀 To test the frontend:');
console.log('1. Start the backend: cd ../veramo-server && npm start');
console.log('2. Start the frontend: npm run dev');
console.log('3. Open http://localhost:3001');
console.log('4. Use the data above to fill out the form');
console.log('5. Submit the claim and watch the progress!');
console.log('');
console.log('📋 Expected Flow:');
console.log('✅ Connect MetaMask');
console.log('✅ Verify insurance credential');
console.log('✅ Upload file and get hash');
console.log('✅ Submit claim to smart contract');
console.log('✅ Display success with transaction details');

export default mockData;
