# Claims Frontend

A React frontend application for submitting insurance claims with verifiable credentials and blockchain integration.

## Features

- **MetaMask Integration**: Connect to MetaMask wallet for blockchain transactions
- **Verifiable Credentials**: Verify insurance credentials using the Veramo backend
- **File Upload**: Upload PDF documents with SHA-256 hash computation
- **Smart Contract Integration**: Submit claims directly to the Claims smart contract
- **Real-time Status Updates**: Track the progress of claim submission
- **Responsive Design**: Modern UI with Tailwind CSS

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask browser extension
- Veramo backend server running
- Claims smart contract deployed

## Installation

1. Navigate to the claims-frontend directory:
```bash
cd claims-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Edit `.env.local` file with your configuration:
```env
VITE_API_URL=http://localhost:3000
VITE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_NETWORK_NAME=hardhat
VITE_NETWORK_CHAIN_ID=1337
```

## Usage

### Development Mode

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Production Build

Build the application for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Configuration

### Environment Variables

- `VITE_API_URL`: Backend API URL (default: http://localhost:3000)
- `VITE_CONTRACT_ADDRESS`: Claims smart contract address
- `VITE_NETWORK_NAME`: Ethereum network name (default: hardhat)
- `VITE_NETWORK_CHAIN_ID`: Ethereum network chain ID (default: 1337)

### Smart Contract Configuration

Update the contract address in `.env.local` after deploying the Claims contract:

```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

## How to Use

### 1. Connect MetaMask

1. Install MetaMask browser extension
2. Click "Connect MetaMask" button
3. Approve the connection request
4. Ensure you're on the correct network (Hardhat local network)

### 2. Submit a Claim

1. **Enter Patient DID**: Input the patient's decentralized identifier
2. **Paste Insurance VC**: Paste the verifiable credential JSON
3. **Specify Claim Amount**: Enter the claim amount in ETH
4. **Upload Document**: Upload a PDF file supporting the claim
5. **Submit**: Click "Submit Claim" to process

### 3. Track Progress

The application will show real-time status updates:
- ✅ Verifying insurance credential
- ✅ Uploading file and computing hash
- ✅ Submitting claim to smart contract
- ✅ Claim submitted successfully

## Project Structure

```
claims-frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   └── SubmitClaim.jsx      # Main claim submission component
│   ├── utils/
│   │   ├── api.js              # Backend API service
│   │   ├── contract.js         # Smart contract configuration
│   │   └── ethers.js           # Ethereum/ethers.js utilities
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Application styles
│   ├── index.css               # Global styles with Tailwind
│   └── main.jsx               # Application entry point
├── index.html                 # HTML template
├── package.json              # Dependencies and scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── vite.config.js           # Vite configuration
└── README.md               # This file
```

## API Integration

The frontend integrates with the Veramo backend for:

- **Credential Verification**: `POST /issuer/verify`
- **File Upload**: `POST /issuer/upload`
- **Health Check**: `GET /health`

## Smart Contract Integration

The frontend interacts with the Claims smart contract:

- **submitClaim**: Submit new claims with patient address, amount, and document hash
- **Event Listening**: Listen for ClaimSubmitted events
- **Transaction Management**: Handle MetaMask transactions

## Error Handling

The application includes comprehensive error handling for:

- MetaMask connection issues
- Network switching problems
- Backend service unavailability
- File upload failures
- Smart contract transaction failures
- Invalid form inputs

## Styling

The application uses:
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon library
- **React Hot Toast**: Toast notifications
- **Custom CSS**: Additional styling for animations and effects

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Adding New Features

1. Create components in `src/components/`
2. Add utilities in `src/utils/`
3. Update API service for new endpoints
4. Add new contract functions as needed

## Troubleshooting

### Common Issues

1. **MetaMask Not Detected**
   - Ensure MetaMask is installed and enabled
   - Check if the site is allowed to access MetaMask

2. **Backend Connection Failed**
   - Verify the Veramo backend is running
   - Check the API URL in environment variables

3. **Transaction Failed**
   - Ensure you're on the correct network
   - Check if you have enough ETH for gas fees
   - Verify the contract address is correct

4. **File Upload Failed**
   - Check file size (max 10MB)
   - Ensure file is PDF format
   - Verify backend service is running

### Debug Mode

Enable debug logging by opening browser console to see detailed error messages and API responses.

## Security Considerations

- All file uploads are validated for type and size
- MetaMask handles private key management
- API calls include proper error handling
- Input validation prevents malicious data submission

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For questions or issues, please check the troubleshooting section or open an issue on GitHub.