import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader, AlertCircle, Wallet, Shield, Database, Globe, User, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiService from '../utils/api.js';
import { submitClaim, requestAccount, getCurrentAccount, onAccountsChanged, onChainChanged } from '../utils/ethers.js';

const SubmitClaim = () => {
  const [formData, setFormData] = useState({
    patientDid: '',
    insuranceVc: '',
    claimAmount: '',
    file: null
  });
  
  const [status, setStatus] = useState({
    step: 0, // 0: form, 1: verifying VC, 2: uploading file, 3: submitting to contract, 4: success, 5: error
    message: '',
    details: {}
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);

  // Check MetaMask connection on component mount
  useEffect(() => {
    checkConnection();
    
    // Listen for account changes
    onAccountsChanged((accounts) => {
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        setIsConnected(true);
      } else {
        setCurrentAccount(null);
        setIsConnected(false);
      }
    });
    
    // Listen for chain changes
    onChainChanged(() => {
      window.location.reload();
    });
  }, []);

  const checkConnection = async () => {
    try {
      const account = await getCurrentAccount();
      if (account) {
        setCurrentAccount(account);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast.error('Please upload a PDF file only');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        file: file
      }));
    }
  };

  const validateForm = () => {
    if (!formData.patientDid.trim()) {
      toast.error('Please enter patient DID');
      return false;
    }
    
    if (!formData.insuranceVc.trim()) {
      toast.error('Please enter insurance verifiable credential');
      return false;
    }
    
    if (!formData.claimAmount || parseFloat(formData.claimAmount) <= 0) {
      toast.error('Please enter a valid claim amount');
      return false;
    }
    
    if (!formData.file) {
      toast.error('Please upload a PDF file');
      return false;
    }
    
    return true;
  };

  const connectMetaMask = async () => {
    try {
      const account = await requestAccount();
      setCurrentAccount(account);
      setIsConnected(true);
      toast.success('Connected to MetaMask');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!isConnected) {
      toast.error('Please connect to MetaMask first');
      return;
    }
    
    try {
      // Step 1: Verify Insurance VC
      setStatus({
        step: 1,
        message: 'Verifying insurance credential...',
        details: {}
      });
      
      const vcResult = await apiService.verifyCredential(formData.insuranceVc);
      
      if (!vcResult.verified) {
        throw new Error('Insurance credential verification failed');
      }
      
      toast.success('Insurance credential verified successfully');
      
      // Step 2: Upload file and get hash
      setStatus({
        step: 2,
        message: 'Uploading file and computing hash...',
        details: { vcVerified: true }
      });
      
      const uploadResult = await apiService.uploadFile(formData.file);
      
      if (!uploadResult.success) {
        throw new Error('File upload failed');
      }
      
      toast.success('File uploaded successfully');
      
      // Step 3: Submit claim to smart contract
      setStatus({
        step: 3,
        message: 'Submitting claim to smart contract...',
        details: { 
          vcVerified: true, 
          fileUploaded: true,
          fileHash: uploadResult.file.sha256Hash
        }
      });
      
      const claimResult = await submitClaim(
        formData.patientDid,
        formData.claimAmount,
        uploadResult.file.sha256Hash
      );
      
      if (!claimResult.success) {
        throw new Error('Failed to submit claim to smart contract');
      }
      
      // Success
      setStatus({
        step: 4,
        message: 'Claim submitted successfully!',
        details: {
          vcVerified: true,
          fileUploaded: true,
          claimSubmitted: true,
          transactionHash: claimResult.transactionHash,
          claimId: claimResult.claimId,
          fileHash: uploadResult.file.sha256Hash
        }
      });
      
      toast.success(`Claim submitted successfully! Claim ID: ${claimResult.claimId}`);
      
      // Reset form
      setFormData({
        patientDid: '',
        insuranceVc: '',
        claimAmount: '',
        file: null
      });
      
    } catch (error) {
      console.error('Error submitting claim:', error);
      setStatus({
        step: 5,
        message: 'Error submitting claim',
        details: { error: error.message }
      });
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      patientDid: '',
      insuranceVc: '',
      claimAmount: '',
      file: null
    });
    setStatus({
      step: 0,
      message: '',
      details: {}
    });
  };

  const getStatusIcon = (step) => {
    switch (step) {
      case 1:
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 2:
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 3:
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
      case 4:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 5:
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Submit Insurance Claim</h2>
              <p className="text-blue-100">Submit a new insurance claim with verifiable credentials and document proof</p>
            </div>
          </div>
        </div>

        {/* MetaMask Connection Status */}
        <div className="px-8 py-6 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">
                  {isConnected ? 'Connected to MetaMask' : 'Not connected to MetaMask'}
                </span>
              </div>
            </div>
            {!isConnected && (
              <button
                onClick={connectMetaMask}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md"
              >
                Connect MetaMask
              </button>
            )}
          </div>
          {currentAccount && (
            <div className="mt-3 p-3 bg-white rounded-lg border">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Account:</span> {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
              </p>
            </div>
          )}
        </div>

        {/* Status Updates */}
        {status.step > 0 && (
          <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center space-x-3 mb-4">
              {getStatusIcon(status.step)}
              <span className="text-lg font-semibold text-blue-900">{status.message}</span>
            </div>
            
            {status.step === 4 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">Insurance credential verified</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">File uploaded and hash computed</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">Claim submitted to smart contract</span>
                  </div>
                </div>
                {status.details.claimId && (
                  <div className="mt-4 p-4 bg-green-100 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">Claim Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-800">Claim ID:</span>
                        <p className="text-green-700 font-mono">{status.details.claimId}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Transaction Hash:</span>
                        <p className="text-green-700 font-mono break-all">{status.details.transactionHash}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">File Hash:</span>
                        <p className="text-green-700 font-mono break-all">{status.details.fileHash}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {status.step === 5 && (
              <div className="p-4 bg-red-100 rounded-xl border border-red-200">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-red-800">Error</span>
                </div>
                <p className="text-red-700">{status.details.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Patient DID */}
            <div>
              <label htmlFor="patientDid" className="block text-sm font-semibold text-gray-900 mb-3">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Patient DID *</span>
                </div>
              </label>
              <input
                type="text"
                id="patientDid"
                name="patientDid"
                value={formData.patientDid}
                onChange={handleInputChange}
                placeholder="did:ethr:0x1234567890123456789012345678901234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                disabled={status.step > 0 && status.step < 4}
              />
            </div>

            {/* Insurance VC */}
            <div>
              <label htmlFor="insuranceVc" className="block text-sm font-semibold text-gray-900 mb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Insurance Verifiable Credential *</span>
                </div>
              </label>
              <textarea
                id="insuranceVc"
                name="insuranceVc"
                value={formData.insuranceVc}
                onChange={handleInputChange}
                placeholder="Paste your insurance verifiable credential here..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                disabled={status.step > 0 && status.step < 4}
              />
            </div>

            {/* Claim Amount */}
            <div>
              <label htmlFor="claimAmount" className="block text-sm font-semibold text-gray-900 mb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span>Claim Amount (ETH) *</span>
                </div>
              </label>
              <input
                type="number"
                id="claimAmount"
                name="claimAmount"
                value={formData.claimAmount}
                onChange={handleInputChange}
                placeholder="0.1"
                step="0.001"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                disabled={status.step > 0 && status.step < 4}
              />
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file" className="block text-sm font-semibold text-gray-900 mb-3">
                <div className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Supporting Document (PDF) *</span>
                </div>
              </label>
              <div className="mt-1 flex justify-center px-8 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 transition-colors duration-200">
                <div className="space-y-3 text-center">
                  <Upload className="mx-auto h-16 w-16 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file"
                      className="relative cursor-pointer bg-white rounded-lg font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-4 py-2 border border-blue-300 hover:border-blue-400 transition-colors"
                    >
                      <span>Choose File</span>
                      <input
                        id="file"
                        name="file"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                        disabled={status.step > 0 && status.step < 4}
                      />
                    </label>
                    <p className="pl-3 self-center">or drag and drop</p>
                  </div>
                  <p className="text-sm text-gray-500">PDF files up to 10MB</p>
                </div>
              </div>
              {formData.file && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">{formData.file.name}</p>
                      <p className="text-sm text-green-700">{(formData.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={!isConnected || (status.step > 0 && status.step < 4)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg font-semibold text-lg"
              >
                {status.step === 0 ? 'Submit Claim' : 
                 status.step < 4 ? 'Processing...' : 
                 status.step === 4 ? 'Claim Submitted' : 'Retry'}
              </button>
              
              {(status.step === 4 || status.step === 5) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-8 py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-lg font-semibold"
                >
                  Submit Another
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitClaim;
