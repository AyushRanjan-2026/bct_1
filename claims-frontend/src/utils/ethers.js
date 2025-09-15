import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from './contract.js';

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

// Request account access
export const requestAccount = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    return accounts[0];
  } catch (error) {
    console.error('Error requesting account:', error);
    throw new Error('Failed to connect to MetaMask. Please try again.');
  }
};

// Get provider
export const getProvider = () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }
  return new ethers.BrowserProvider(window.ethereum);
};

// Get signer
export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

// Get contract instance
export const getContract = async () => {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, signer);
};

// Switch to correct network
export const switchToCorrectNetwork = async () => {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  const chainId = `0x${CONTRACT_CONFIG.network.chainId.toString(16)}`;
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId,
              chainName: CONTRACT_CONFIG.network.name,
              rpcUrls: ['http://localhost:8545'], // Hardhat local network
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add network to MetaMask');
      }
    } else {
      throw new Error('Failed to switch network in MetaMask');
    }
  }
};

// Submit claim to smart contract
export const submitClaim = async (patientAddress, amount, documentHash) => {
  try {
    // Switch to correct network
    await switchToCorrectNetwork();
    
    // Get contract instance
    const contract = await getContract();
    
    // Convert amount to wei
    const amountInWei = ethers.parseEther(amount.toString());
    
    // Submit the claim
    const tx = await contract.submitClaim(patientAddress, amountInWei, documentHash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Find the ClaimSubmitted event
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === 'ClaimSubmitted';
      } catch (e) {
        return false;
      }
    });
    
    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      return {
        success: true,
        transactionHash: receipt.hash,
        claimId: parsedEvent.args.claimId.toString(),
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } else {
      throw new Error('ClaimSubmitted event not found in transaction');
    }
  } catch (error) {
    console.error('Error submitting claim:', error);
    throw new Error(error.message || 'Failed to submit claim to smart contract');
  }
};

// Get current account
export const getCurrentAccount = async () => {
  if (!isMetaMaskInstalled()) {
    return null;
  }
  
  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
  if (!isMetaMaskInstalled()) {
    return;
  }
  
  window.ethereum.on('accountsChanged', callback);
};

// Listen for chain changes
export const onChainChanged = (callback) => {
  if (!isMetaMaskInstalled()) {
    return;
  }
  
  window.ethereum.on('chainChanged', callback);
};

