#!/bin/bash

# Decentralized Insurance Claims System Setup Script
# This script helps set up the entire system

set -e

echo "🚀 Setting up Decentralized Insurance Claims System"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) is installed"

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Setup Hardhat project
print_status "Setting up Hardhat project..."
cd major_project
npm install

# Compile contracts
print_status "Compiling smart contracts..."
npm run compile

# Run tests
print_status "Running smart contract tests..."
npm test

print_success "Smart contracts compiled and tested successfully"

# Setup Veramo backend
print_status "Setting up Veramo backend..."
cd ../veramo-server
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file for backend..."
    cp env.example .env
    print_warning "Please edit veramo-server/.env with your Infura API key (optional for local testing)"
fi

# Setup React frontend
print_status "Setting up React frontend..."
cd ../claims-frontend
npm install

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    print_status "Creating .env.local file for frontend..."
    cp env.example .env.local
    print_warning "Please edit claims-frontend/.env.local with your contract address after deployment"
fi

print_success "All dependencies installed successfully"

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Start Hardhat node:"
echo "   cd major_project && npx hardhat node"
echo ""
echo "2. Deploy the contract (in a new terminal):"
echo "   cd major_project && npm run deploy"
echo "   Copy the deployed contract address"
echo ""
echo "3. Start the backend (in a new terminal):"
echo "   cd veramo-server && npm start"
echo ""
echo "4. Update frontend config:"
echo "   Edit claims-frontend/.env.local with the contract address"
echo ""
echo "5. Start the frontend (in a new terminal):"
echo "   cd claims-frontend && npm run dev"
echo ""
echo "6. Open http://localhost:3001 in your browser"
echo ""
echo "For detailed instructions, see README.md"
echo ""
print_success "Happy coding! 🚀"

