import React, { useState, useEffect } from 'react';
import { Shield, FileText, Settings, Menu, X, CheckCircle, AlertCircle, Loader2, Wallet, Database, Globe } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import SubmitClaim from './components/SubmitClaim';
import apiService from './utils/api.js';

function App() {
  const [activeTab, setActiveTab] = useState('submit');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState({
    backend: { status: 'checking', message: 'Checking backend...' },
    blockchain: { status: 'checking', message: 'Checking blockchain...' },
    metamask: { status: 'checking', message: 'Checking MetaMask...' }
  });

  // Check all services on mount
  useEffect(() => {
    checkAllServices();
  }, []);

  const checkAllServices = async () => {
    await Promise.all([
      checkBackendConnection(),
      checkBlockchainConnection(),
      checkMetaMaskConnection()
    ]);
    setIsLoading(false);
  };

  const checkBackendConnection = async () => {
    try {
      await apiService.healthCheck();
      setServices(prev => ({
        ...prev,
        backend: { status: 'connected', message: 'Backend API connected' }
      }));
      setIsBackendConnected(true);
    } catch (error) {
      console.error('Backend connection failed:', error);
      setServices(prev => ({
        ...prev,
        backend: { status: 'disconnected', message: 'Backend API unavailable' }
      }));
      setIsBackendConnected(false);
    }
  };

  const checkBlockchainConnection = async () => {
    try {
      const response = await fetch('http://localhost:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (response.ok) {
        setServices(prev => ({
          ...prev,
          blockchain: { status: 'connected', message: 'Hardhat node connected' }
        }));
      } else {
        throw new Error('Blockchain not responding');
      }
    } catch (error) {
      setServices(prev => ({
        ...prev,
        blockchain: { status: 'disconnected', message: 'Hardhat node unavailable' }
      }));
    }
  };

  const checkMetaMaskConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setServices(prev => ({
            ...prev,
            metamask: { status: 'connected', message: 'MetaMask connected' }
          }));
        } else {
          setServices(prev => ({
            ...prev,
            metamask: { status: 'disconnected', message: 'MetaMask not connected' }
          }));
        }
      } catch (error) {
        setServices(prev => ({
          ...prev,
          metamask: { status: 'disconnected', message: 'MetaMask error' }
        }));
      }
    } else {
      setServices(prev => ({
        ...prev,
        metamask: { status: 'disconnected', message: 'MetaMask not installed' }
      }));
    }
  };

  const tabs = [
    { id: 'submit', label: 'Submit Claim', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Initializing System</h2>
          <p className="text-gray-600 mb-6">Checking all services...</p>
          <div className="space-y-3">
            {Object.entries(services).map(([key, service]) => (
              <div key={key} className="flex items-center space-x-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">{service.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
        }}
      />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Claims Portal
                </h1>
                <p className="text-sm text-gray-600">Decentralized Insurance Claims Management</p>
              </div>
            </div>

            {/* Service Status */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                {Object.entries(services).map(([key, service]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      service.status === 'connected' ? 'bg-green-500' : 
                      service.status === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">
                      {service.status === 'connected' ? '✓' : 
                       service.status === 'checking' ? '⏳' : '✗'} {key}
                    </span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={checkAllServices}
                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 py-4 px-6 rounded-t-lg font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm border-t-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Service Status Alerts */}
        <div className="mb-8 space-y-4">
          {Object.entries(services).map(([key, service]) => {
            if (service.status === 'disconnected') {
              return (
                <div key={key} className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800 capitalize">
                        {key} Service Unavailable
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        {service.message}. Please check the service and try again.
                      </p>
                    </div>
                    <button
                      onClick={key === 'backend' ? checkBackendConnection : checkAllServices}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'submit' && <SubmitClaim />}
        
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backend API URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={import.meta.env.VITE_API_URL || 'http://localhost:3000'}
                      disabled
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Smart Contract Address
                  </label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={import.meta.env.VITE_CONTRACT_ADDRESS || 'Not configured'}
                      disabled
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Network Configuration
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={`${import.meta.env.VITE_NETWORK_NAME || 'hardhat'} (Chain ID: ${import.meta.env.VITE_NETWORK_CHAIN_ID || '1337'})`}
                      disabled
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Status</h3>
                
                {Object.entries(services).map(([key, service]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        service.status === 'connected' ? 'bg-green-500' : 
                        service.status === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium text-gray-900 capitalize">{key}</span>
                    </div>
                    <span className={`text-sm ${
                      service.status === 'connected' ? 'text-green-600' : 
                      service.status === 'checking' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {service.status === 'connected' ? 'Connected' : 
                       service.status === 'checking' ? 'Checking...' : 'Disconnected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                How to Use the System
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <p className="text-sm text-blue-800">Connect your MetaMask wallet</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <p className="text-sm text-blue-800">Switch to Hardhat local network (Chain ID: 1337)</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <p className="text-sm text-blue-800">Enter patient DID and insurance credential</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <p className="text-sm text-blue-800">Specify claim amount in ETH</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                    <p className="text-sm text-blue-800">Upload supporting PDF document</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">6</div>
                    <p className="text-sm text-blue-800">Submit claim to smart contract</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">Claims Portal</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Decentralized Insurance Claims Management</p>
            <p className="text-xs text-gray-500">Powered by Veramo, Ethereum, and React</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;