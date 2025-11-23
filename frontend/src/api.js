import axios from 'axios';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      error.message = 'Cannot connect to backend server. Make sure it is running on http://localhost:3001';
    } else if (error.response?.data?.error) {
      error.message = error.response.data.error;
    }
    return Promise.reject(error);
  }
);

export const createDID = async () => {
  try {
    console.log('📤 API: Creating DID...');
    const response = await api.post('/did/create');
    console.log('✅ API: DID created successfully');
    return response.data;
  } catch (error) {
    console.error('❌ API: Create DID failed', error);
    throw error;
  }
};

export const requestPolicy = async (data) => {
  const response = await api.post('/policy/request', data);
  return response.data;
};

export const getPolicyRequests = async () => {
  const response = await api.get('/policy/requests');
  return response.data;
};

export const issueVC = async (data) => {
  const response = await api.post('/vc/issue', data);
  return response.data;
};

export const getVCByPolicyId = async (policyId) => {
  const response = await api.get(`/vc/policy/${policyId}`);
  return response.data;
};

export const verifyVC = async (vcJwt) => {
  const response = await api.post('/vc/verify', { vcJwt });
  return response.data;
};

export const uploadFile = async (data, filename) => {
  const response = await api.post('/file/upload', { data, filename });
  return response.data;
};

export const getFile = async (cid) => {
  const response = await api.get(`/file/${cid}`);
  return response.data;
};

export const onchainRegister = async (data) => {
  const response = await api.post('/onchain/register', data);
  return response.data;
};

export const onchainIssuePolicy = async (data) => {
  const response = await api.post('/onchain/issuePolicy', data);
  return response.data;
};

export const onchainSubmitClaim = async (data) => {
  const response = await api.post('/onchain/submitClaim', data);
  return response.data;
};

export const onchainInsurerAction = async (data) => {
  const response = await api.post('/onchain/insurerAction', data);
  return response.data;
};

export const issueCredential = async (data) => {
  const response = await api.post('/vc/issue', data);
  return response.data;
};

// Verify DID endpoint
export const verifyDID = async (did) => {
  try {
    const response = await api.get(`/verification/did?did=${encodeURIComponent(did)}`);
    return response.data;
  } catch (error) {
    console.error('❌ API: Verify DID failed', error);
    throw error;
  }
};

// Issue Policy VC endpoint
export const issuePolicyVC = async (data) => {
  try {
    const response = await api.post('/vc/issuePolicyVC', data);
    return response.data;
  } catch (error) {
    console.error('❌ API: Issue Policy VC failed', error);
    throw error;
  }
};

// Get issued VCs
export const getIssuedVCs = async () => {
  try {
    const response = await api.get('/vc/issued');
    return response.data;
  } catch (error) {
    console.error('❌ API: Get issued VCs failed', error);
    throw error;
  }
};

export default api;

