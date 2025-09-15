import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const apiService = {
  // Verify a verifiable credential
  verifyCredential: async (credential) => {
    try {
      const response = await api.post('/issuer/verify', { credential });
      return response.data;
    } catch (error) {
      console.error('Error verifying credential:', error);
      throw new Error(error.response?.data?.error || 'Failed to verify credential');
    }
  },

  // Upload a file and get hash
  uploadFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/issuer/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(error.response?.data?.error || 'Failed to upload file');
    }
  },

  // Create a new DID (for testing)
  createDid: async () => {
    try {
      const response = await api.post('/issuer/createDid');
      return response.data;
    } catch (error) {
      console.error('Error creating DID:', error);
      throw new Error(error.response?.data?.error || 'Failed to create DID');
    }
  },

  // Issue insurance credential (for testing)
  issueInsuranceCredential: async (patientDid, policyNumber, coverage, validity) => {
    try {
      const response = await api.post('/issuer/issueInsurance', {
        patientDid,
        policyNumber,
        coverage,
        validity
      });
      return response.data;
    } catch (error) {
      console.error('Error issuing insurance credential:', error);
      throw new Error(error.response?.data?.error || 'Failed to issue insurance credential');
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error checking health:', error);
      throw new Error('Backend service unavailable');
    }
  }
};

export default apiService;

