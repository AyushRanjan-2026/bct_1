import { useState, useEffect } from 'react';
import { getPolicyRequests, createDID, issueCredential } from './api';
import { ethers } from 'ethers';
import QRCode from 'qrcode';
import { storeDID, getDID } from './did-storage';
import CollapsibleCard from './components/CollapsibleCard';
import Toast from './components/Toast';
import RequestDetailsModal from './components/RequestDetailsModal';
import IssueVCModal from './components/IssueVCModal';
import IssuedVCList from './components/IssuedVCList';
import { weiToEth, formatDate } from './utils/formatting';

function InsurerDashboard() {
  const [wallet, setWallet] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [insurerDid, setInsurerDid] = useState(null);
  const [vcForm, setVcForm] = useState({ organization: '', permission: '' });
  const [vcInfo, setVcInfo] = useState(null);
  const [vcQr, setVcQr] = useState('');
  const [issuedVCs, setIssuedVCs] = useState([]);

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadRequests();
    loadIssuedVCs();
    const interval = setInterval(() => {
      loadRequests();
      loadIssuedVCs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-retrieve DID when wallet connects
  useEffect(() => {
    if (wallet?.account && !insurerDid) {
      const storedDID = getDID(wallet.account, 'insurer');
      if (storedDID) {
        setInsurerDid(storedDID);
        showToast('Insurer DID automatically retrieved for this wallet!', 'success');
      }
    } else if (!wallet?.account) {
      setInsurerDid(null);
    }
  }, [wallet?.account]);

  // Initialize wallet connection
  useEffect(() => {
    const initWallet = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            setWallet({ account: address, provider, signer });
          }
        } catch (error) {
          console.error('Error initializing wallet:', error);
        }
      }
    };
    initWallet();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setWallet(null);
        } else {
          initWallet();
        }
      });
    }
  }, []);

  // Filter and sort requests
  useEffect(() => {
    let filtered = [...requests];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => (req.status || 'pending') === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.id?.toString().toLowerCase().includes(query) ||
          req.patientDid?.toLowerCase().includes(query) ||
          req.patientAddress?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'coverage':
          return BigInt(b.coverageAmount || 0) - BigInt(a.coverageAmount || 0);
        case 'newest':
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    setFilteredRequests(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [requests, statusFilter, sortOption, searchQuery]);

  // Update issued VCs when requests change
  useEffect(() => {
    loadIssuedVCs();
  }, [requests]);

  const loadRequests = async () => {
    try {
      const result = await getPolicyRequests();
      if (result.success) {
        setRequests(result.requests || []);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      showToast('Failed to load policy requests', 'error');
    }
  };

  const loadIssuedVCs = async () => {
    try {
      // For now, we'll get VCs from policy requests that are approved
      // In a real implementation, you'd have a dedicated endpoint
      const approvedRequests = requests.filter(req => (req.status || 'pending') === 'approved');
      // Map to VC format (this is a placeholder - in real app, fetch from VC store)
      setIssuedVCs(approvedRequests.map(req => ({
        id: req.id,
        patientDid: req.patientDid,
        policyId: req.id,
        issuedAt: req.createdAt,
      })));
    } catch (error) {
      console.log('Error loading issued VCs:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleIssueVC = async (data) => {
    if (!wallet?.account) {
      showToast('Please connect wallet first', 'error');
      return;
    }

    if (!insurerDid) {
      showToast('Please create DID first', 'error');
      return;
    }

    setLoading(true);
    try {
      // Generate policy number and valid till date
      const policyNumber = `POLICY-${Date.now().toString().slice(-5)}`;
      const validTill = new Date();
      validTill.setFullYear(validTill.getFullYear() + 1);
      
      const patientDid = data.patientDid || `did:example:${data.patientWallet}`;
      const payload = {
        issuerDid: insurerDid,
        subjectDid: patientDid,
        role: 'InsurancePolicy',
        data: {
          credentialType: 'Insurance Policy',
          policyNumber: policyNumber,
          policyId: data.requestId,
          issuedTo: patientDid,
          insurer: wallet.account,
          beneficiary: data.patientWallet,
          coverageAmount: data.coverageAmountWei,
          premium: data.premium,
          duration: data.durationMonths,
          deductible: data.deductible,
          validTill: validTill.toISOString().split('T')[0],
          issuedAt: new Date().toISOString(),
          metadata: data.metadataJson,
        },
      };

      const result = await issueCredential(payload);

      if (result.success) {
        showToast('VC issued successfully!', 'success');
        setShowIssueModal(false);
        loadRequests();
        loadIssuedVCs();
      } else {
        showToast(result.error || 'Failed to issue VC', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Failed to issue VC', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDID = async (did) => {
    if (!did) {
      showToast('No DID provided', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/verification/did?did=${encodeURIComponent(did)}`);
      const result = await response.json();
      
      if (result.verified) {
        showToast('✔ DID Verified', 'success');
      } else {
        showToast(`❌ Verification Failed: ${result.reason || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showToast('Failed to verify DID', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsurerVC = async () => {
    if (!insurerDid) {
      showToast('Create your insurer DID first', 'error');
      return;
    }
    setLoading(true);
    try {
      const { issueCredential } = await import('./api');
      const payload = {
        issuerDid: insurerDid,
        subjectDid: insurerDid,
        role: 'Insurer',
        data: {
          organization: vcForm.organization || 'Insurance Provider',
          permission: vcForm.permission || 'Standard Issuer',
          generatedAt: new Date().toISOString(),
        },
      };
      const result = await issueCredential(payload);
      setVcInfo(result.vc);
      const qr = await QRCode.toDataURL(JSON.stringify(result.vc));
      setVcQr(qr);
      showToast('Insurer credential generated!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to generate credential', 'error');
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Insurer Dashboard</h1>
        <p className="text-gray-600 text-lg">Review policy requests & issue verifiable credentials.</p>
      </div>

      {/* Toast Notification */}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* Collapsible: Insurer Credential */}
      <CollapsibleCard title="Insurer Credential" defaultOpen={false} icon="📄">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Organization Name</label>
            <input
              type="text"
              className="input-field"
              value={vcForm.organization}
              onChange={(e) => setVcForm({ ...vcForm, organization: e.target.value })}
              placeholder="MPA Insurance"
            />
            <label className="label">Permission / Role</label>
            <input
              type="text"
              className="input-field"
              value={vcForm.permission}
              onChange={(e) => setVcForm({ ...vcForm, permission: e.target.value })}
              placeholder="Policy Issuer"
            />
            <button
              className="btn btn-primary mt-3"
              onClick={handleGenerateInsurerVC}
              disabled={loading || !insurerDid}
            >
              {loading ? 'Generating...' : 'Generate Credential'}
            </button>
          </div>
          <div>
            {vcInfo ? (
              <div className="bg-gray-50 p-4 rounded-lg border">
                {vcQr && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={vcQr}
                      alt="Insurer VC QR"
                      className="w-48 h-48 object-contain border rounded-lg bg-white"
                    />
                  </div>
                )}
                <pre className="text-xs bg-white p-2 rounded max-h-64 overflow-auto">
                  {JSON.stringify(vcInfo, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                Credential details will appear here after generation.
              </div>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* Collapsible: Wallet Connection */}
      <CollapsibleCard title="Wallet Connection" defaultOpen={false}>
        <div className="space-y-4">
          {!wallet?.account ? (
            <div className="space-y-4">
              <button 
                className="btn btn-primary w-full sm:w-auto flex items-center justify-center space-x-2"
                onClick={async () => {
                  // Trigger wallet connection
                  if (window.ethereum) {
                    try {
                      await window.ethereum.request({ method: 'eth_requestAccounts' });
                    } catch (error) {
                      showToast('Failed to connect wallet', 'error');
                    }
                  } else {
                    showToast('Please install MetaMask', 'error');
                  }
                }}
              >
                <span>🦊</span>
                <span>Connect MetaMask</span>
              </button>
              {!window.ethereum && (
                <div className="alert alert-info flex items-center space-x-2">
                  <span>ℹ️</span>
                  <span>Please install MetaMask extension to connect your wallet.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-green-600">✓</span>
                  <span className="font-semibold text-green-800">Connected</span>
                </div>
                <p className="text-sm text-gray-600 font-mono break-all">{wallet.account}</p>
              </div>
              <button 
                className="btn btn-secondary w-full sm:w-auto"
                onClick={() => setWallet(null)}
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Collapsible: Insurer Identity */}
      <CollapsibleCard title="Insurer Identity" defaultOpen={false} icon="🏢">
        {insurerDid ? (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="label">Your Insurer DID</label>
            <p className="font-mono text-sm text-gray-700 break-all bg-white p-3 rounded border border-gray-200">
              {insurerDid}
            </p>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!wallet?.account) {
                showToast('Please connect wallet first', 'error');
                return;
              }

              setLoading(true);
              try {
                const result = await createDID();
                if (result && result.success) {
                  setInsurerDid(result.did);
                  storeDID(wallet.account, 'insurer', result.did);
                  showToast('Insurer DID created successfully!', 'success');
                } else {
                  showToast(result?.error || 'Failed to create DID', 'error');
                }
              } catch (error) {
                const errorMessage = error.response?.data?.error || error.message || 'Failed to create DID. Check if backend is running on http://localhost:3001';
                showToast(errorMessage, 'error');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !wallet?.account}
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin mr-2">⏳</span>
                Creating...
              </span>
            ) : (
              <span className="flex items-center">
                <span className="mr-2">✨</span>
                Create Insurer DID
              </span>
            )}
          </button>
        )}
      </CollapsibleCard>

      {/* Policy Requests Section - Always Open */}
      <CollapsibleCard title="Policy Requests" defaultOpen={true} icon="📋">
        {/* Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Sort Option */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Sort by</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="coverage">Coverage Amount</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Request ID or Patient DID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Request Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {paginatedRequests.length} of {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </div>

        {/* Request List */}
        {paginatedRequests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">No requests found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Requests will appear here when patients submit them'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">Request #{request.id}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-xs text-gray-500">Created: {formatDate(request.createdAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Patient DID</label>
                    <p className="font-mono text-xs text-gray-700 break-all mt-1">{request.patientDid || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Patient Wallet</label>
                    <p className="font-mono text-xs text-gray-700 break-all mt-1">{request.patientAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Coverage Amount</label>
                    <p className="text-sm font-semibold text-primary-600 mt-1">
                      {weiToEth(request.coverageAmount)} ETH
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailsModal(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleVerifyDID(request.patientDid)}
                    disabled={loading || !request.patientDid}
                    className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verify DID
                  </button>
                  {request.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowIssueModal(true);
                      }}
                      disabled={loading || !insurerDid}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Issue VC
                    </button>
                  )}
                  {request.status === 'approved' && (
                    <>
                      <button
                        onClick={() => {
                          // View VC functionality
                          showToast('VC viewing feature coming soon', 'success');
                        }}
                        className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                      >
                        View VC
                      </button>
                      <button
                        onClick={() => {
                          // Download VC functionality
                          showToast('VC download feature coming soon', 'success');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Download VC
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === page
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </CollapsibleCard>

      {/* Issued VCs Section */}
      <CollapsibleCard title="Issued VCs" defaultOpen={false} icon="📜">
        <IssuedVCList
          vcs={issuedVCs}
          onViewVC={(vc) => {
            showToast('VC viewing feature coming soon', 'success');
          }}
          onDownloadVC={(vc) => {
            showToast('VC download feature coming soon', 'success');
          }}
        />
      </CollapsibleCard>

      {/* Modals */}
      <RequestDetailsModal
        request={selectedRequest}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRequest(null);
        }}
      />

      <IssueVCModal
        request={selectedRequest}
        isOpen={showIssueModal}
        onClose={() => {
          setShowIssueModal(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleIssueVC}
        loading={loading}
      />
    </div>
  );
}

export default InsurerDashboard;
