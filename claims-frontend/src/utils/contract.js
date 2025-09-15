// Claims contract ABI and configuration
export const CLAIMS_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_patient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_documentHash",
        "type": "string"
      }
    ],
    "name": "submitClaim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "claimId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "patient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "documentHash",
        "type": "string"
      }
    ],
    "name": "ClaimSubmitted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getTotalClaims",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const CONTRACT_CONFIG = {
  address: import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  abi: CLAIMS_CONTRACT_ABI,
  network: {
    name: import.meta.env.VITE_NETWORK_NAME || 'hardhat',
    chainId: parseInt(import.meta.env.VITE_NETWORK_CHAIN_ID) || 1337
  }
};

