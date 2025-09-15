#!/bin/bash

# System Test Script for Decentralized Insurance Claims System
# This script tests all components of the system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test configuration
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"
HARDHAT_URL="http://localhost:8545"

echo "🧪 Testing Decentralized Insurance Claims System"
echo "==============================================="

# Test 1: Hardhat Node
print_status "Testing Hardhat node..."
if curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $HARDHAT_URL > /dev/null; then
    print_success "Hardhat node is running"
else
    print_error "Hardhat node is not running. Please start it with: npx hardhat node"
    exit 1
fi

# Test 2: Backend Health
print_status "Testing backend health..."
if curl -s $BACKEND_URL/health | grep -q "OK"; then
    print_success "Backend is healthy"
else
    print_error "Backend is not running. Please start it with: cd veramo-server && npm start"
    exit 1
fi

# Test 3: Backend DID Creation
print_status "Testing DID creation..."
DID_RESPONSE=$(curl -s -X POST $BACKEND_URL/issuer/createDid)
if echo "$DID_RESPONSE" | grep -q "success.*true"; then
    PATIENT_DID=$(echo "$DID_RESPONSE" | grep -o '"did":"[^"]*"' | cut -d'"' -f4)
    print_success "DID created: $PATIENT_DID"
else
    print_error "DID creation failed"
    exit 1
fi

# Test 4: Insurance VC Issuance
print_status "Testing insurance VC issuance..."
VC_RESPONSE=$(curl -s -X POST $BACKEND_URL/issuer/issueInsurance \
  -H "Content-Type: application/json" \
  -d "{
    \"patientDid\": \"$PATIENT_DID\",
    \"policyNumber\": \"POL123456\",
    \"coverage\": \"Comprehensive Health Insurance\",
    \"validity\": \"2024-12-31\"
  }")

if echo "$VC_RESPONSE" | grep -q "success.*true"; then
    INSURANCE_VC=$(echo "$VC_RESPONSE" | grep -o '"credential":"[^"]*"' | cut -d'"' -f4)
    print_success "Insurance VC issued successfully"
else
    print_error "Insurance VC issuance failed"
    exit 1
fi

# Test 5: VC Verification
print_status "Testing VC verification..."
VERIFY_RESPONSE=$(curl -s -X POST $BACKEND_URL/issuer/verify \
  -H "Content-Type: application/json" \
  -d "{\"credential\": \"$INSURANCE_VC\"}")

if echo "$VERIFY_RESPONSE" | grep -q "verified.*true"; then
    print_success "VC verification successful"
else
    print_error "VC verification failed"
    exit 1
fi

# Test 6: File Upload
print_status "Testing file upload..."
echo "Test medical report content" > test-document.pdf
UPLOAD_RESPONSE=$(curl -s -X POST -F "file=@test-document.pdf" $BACKEND_URL/issuer/upload)

if echo "$UPLOAD_RESPONSE" | grep -q "success.*true"; then
    FILE_HASH=$(echo "$UPLOAD_RESPONSE" | grep -o '"sha256Hash":"[^"]*"' | cut -d'"' -f4)
    print_success "File uploaded successfully. Hash: $FILE_HASH"
else
    print_error "File upload failed"
    exit 1
fi

# Clean up test file
rm -f test-document.pdf

# Test 7: Frontend Accessibility
print_status "Testing frontend accessibility..."
if curl -s $FRONTEND_URL | grep -q "Claims Portal"; then
    print_success "Frontend is accessible"
else
    print_warning "Frontend is not accessible. Please start it with: cd claims-frontend && npm run dev"
fi

echo ""
echo "🎉 System Test Results"
echo "====================="
print_success "All core components are working correctly!"
echo ""
echo "✅ Hardhat node: Running"
echo "✅ Backend API: Healthy"
echo "✅ DID creation: Working"
echo "✅ VC issuance: Working"
echo "✅ VC verification: Working"
echo "✅ File upload: Working"
echo ""

if curl -s $FRONTEND_URL | grep -q "Claims Portal"; then
    echo "✅ Frontend: Accessible"
    echo ""
    echo "🚀 System is ready for use!"
    echo "Open $FRONTEND_URL in your browser to start using the system."
else
    echo "⚠️  Frontend: Not accessible (start with: cd claims-frontend && npm run dev)"
fi

echo ""
echo "📋 Test Data Generated:"
echo "Patient DID: $PATIENT_DID"
echo "Insurance VC: $INSURANCE_VC"
echo "File Hash: $FILE_HASH"
echo ""
echo "You can use this data to test the frontend form submission."

