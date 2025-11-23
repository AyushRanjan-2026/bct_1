import { useState, useEffect } from 'react';
import { createDID, issueCredential, uploadFile, onchainSubmitClaim, getIssuedVCs } from './api';
import ConnectWallet from './ConnectWallet';
import CollapsibleCard from './components/CollapsibleCard';
import QRCode from 'qrcode';

function ProviderDashboard() {
  const [wallet, setWallet] = useState(null);
  const [did, setDid] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vcForm, setVcForm] = useState({ facility: '', speciality: '' });
  const [vcInfo, setVcInfo] = useState(null);
  const [vcQr, setVcQr] = useState('');

  // Treatment Credential Issuance state
  const [treatmentForm, setTreatmentForm] = useState({
    patientDid: '',
    treatmentDescription: '',
    billAmount: '',
  });
  const [treatmentFiles, setTreatmentFiles] = useState([]);
  const [treatmentFileCids, setTreatmentFileCids] = useState([]);
  const [issuedTreatmentVC, setIssuedTreatmentVC] = useState(null);

  // Claim Submission state
  const [claimForm, setClaimForm] = useState({
    patientWalletOrDid: '',
    policyId: '',
    amount: '',
    fileCids: '',
  });

  // Issued VC List state
  const [issuedVCs, setIssuedVCs] = useState([]);
  const [selectedVC, setSelectedVC] = useState(null);
  const [showVCModal, setShowVCModal] = useState(false);

  // Claims Submitted state
  const [submittedClaims, setSubmittedClaims] = useState([]);

  const handleCreateDID = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await createDID();
      if (result.success) {
        setDid(result.did);
        setMessage({ type: 'success', text: 'Provider DID created successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create DID' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create DID' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVC = async () => {
    if (!did) {
      setMessage({ type: 'error', text: 'Create your DID first' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        issuerDid: did,
        subjectDid: did,
        role: 'Provider',
        data: {
          facility: vcForm.facility || 'Health Facility',
          speciality: vcForm.speciality || 'General Practice',
          issuedAt: new Date().toISOString(),
        },
      };
      const result = await issueCredential(payload);
      setVcInfo(result.vc);
      const qr = await QRCode.toDataURL(JSON.stringify(result.vc));
      setVcQr(qr);
      setMessage({ type: 'success', text: 'Provider credential generated!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to generate credential' });
    } finally {
      setLoading(false);
    }
  };

  // Treatment Credential Issuance handlers
  const handleTreatmentFileChange = (e) => {
    const files = Array.from(e.target.files);
    setTreatmentFiles(files);
  };

  const handleUploadTreatmentFiles = async () => {
    if (treatmentFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select files to upload' });
      return;
    }

    setLoading(true);
    setMessage(null);
    const cids = [];

    try {
      for (const file of treatmentFiles) {
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const base64Data = e.target.result.split(',')[1] || e.target.result;
              const result = await uploadFile(base64Data, file.name);
              if (result.success) {
                cids.push(result.cid);
              } else {
                throw new Error(result.error || 'Failed to upload file');
              }
            } catch (error) {
              reject(error);
            }
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }

      setTreatmentFileCids(cids);
      // Auto-populate file CIDs in claim form
      setClaimForm({ ...claimForm, fileCids: cids.join(', ') });
      setMessage({ type: 'success', text: `Uploaded ${cids.length} file(s) successfully!` });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload files' });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTreatmentCredential = async () => {
    if (!did) {
      setMessage({ type: 'error', text: 'Create your Provider DID first' });
      return;
    }
    if (!treatmentForm.patientDid || !treatmentForm.treatmentDescription || !treatmentForm.billAmount) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        issuerDid: did,
        subjectDid: treatmentForm.patientDid,
        role: 'TreatmentCredential',
        data: {
          credentialType: 'Treatment Credential',
          treatmentDescription: treatmentForm.treatmentDescription,
          billAmount: treatmentForm.billAmount,
          billAmountUnit: 'ETH',
          supportingDocuments: treatmentFileCids,
          issuedAt: new Date().toISOString(),
        },
      };

      const result = await issueCredential(payload);
      if (result.success) {
        setIssuedTreatmentVC({
          vcId: result.vc.id || `vc-${Date.now()}`,
          patientDid: treatmentForm.patientDid,
          vc: result.vc,
          jwt: result.vc.proof?.jwt || JSON.stringify(result.vc),
          cid: result.cid || '', // Store VC CID if available
        });
        setMessage({ type: 'success', text: 'Treatment credential issued successfully!' });
        // Refresh issued VCs list
        loadIssuedVCs();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to issue credential' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to issue treatment credential' });
    } finally {
      setLoading(false);
    }
  };

  // Claim Submission handlers
  const handleSubmitClaim = async () => {
    if (!wallet || !wallet.account) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }
    if (!claimForm.patientWalletOrDid || !claimForm.policyId || !claimForm.amount) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      // Convert ETH to wei if needed
      const amountInWei = claimForm.amount.includes('.') 
        ? (parseFloat(claimForm.amount) * 1e18).toString()
        : claimForm.amount;

      const fileCidsArray = claimForm.fileCids ? claimForm.fileCids.split(',').map(c => c.trim()) : [];
      
      // Use treatment VC CID if available, otherwise use first file CID or empty
      const vcCid = issuedTreatmentVC?.cid || fileCidsArray[0] || '';

      const result = await onchainSubmitClaim({
        policyId: claimForm.policyId,
        beneficiary: claimForm.patientWalletOrDid.startsWith('0x') 
          ? claimForm.patientWalletOrDid 
          : wallet.account, // Use wallet if DID provided
        insurer: '', // Will be determined from policy
        ipfsHash: fileCidsArray[0] || '',
        vcCid: vcCid,
        amount: amountInWei,
      });

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Claim submitted successfully! Claim ID: ${result.claimId}` 
        });
        // Reset form
        setClaimForm({
          patientWalletOrDid: '',
          policyId: '',
          amount: '',
          fileCids: '',
        });
        // Refresh claims list
        loadSubmittedClaims();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit claim' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to submit claim' });
    } finally {
      setLoading(false);
    }
  };

  // Load issued VCs
  const loadIssuedVCs = async () => {
    try {
      const result = await getIssuedVCs();
      if (result.success && result.vcs) {
        // Filter VCs issued by this provider
        const providerVCs = result.vcs.filter(vc => 
          vc.vc?.issuer?.id === did || vc.issuerDid === did
        );
        setIssuedVCs(providerVCs);
      }
    } catch (error) {
      console.error('Failed to load issued VCs:', error);
      // Use local state if API fails
      if (issuedTreatmentVC) {
        setIssuedVCs([issuedTreatmentVC]);
      }
    }
  };

  // Load submitted claims
  const loadSubmittedClaims = async () => {
    // TODO: Implement API endpoint to fetch provider claims
    // For now, use local state
    console.log('Loading submitted claims...');
  };

  useEffect(() => {
    if (did) {
      loadIssuedVCs();
      loadSubmittedClaims();
    }
  }, [did]);

  // VC Modal handlers
  const handleViewVC = (vc) => {
    setSelectedVC(vc);
    setShowVCModal(true);
  };

  const handleDownloadVC = (vc) => {
    const dataStr = JSON.stringify(vc, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vc-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJWT = (jwt) => {
    navigator.clipboard.writeText(jwt);
    setMessage({ type: 'success', text: 'JWT copied to clipboard!' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Provider Dashboard</h1>
        <p className="text-gray-600">Create your DID and share verifiable credentials</p>
      </div>

      {/* Wallet Connection - Collapsible Card */}
      <CollapsibleCard title="Wallet Connection" icon="🔗" defaultOpen={true}>
        <ConnectWallet onWalletConnected={setWallet} />
      </CollapsibleCard>

      {/* Provider Identity - Collapsible Card */}
      <CollapsibleCard title="Provider Identity" icon="🏥" defaultOpen={true}>
        {did ? (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="label">Your Provider DID</label>
            <p className="font-mono text-sm text-gray-700 break-all bg-white p-3 rounded border border-gray-200">
              {did}
            </p>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleCreateDID} disabled={loading}>
            {loading ? 'Creating DID...' : 'Create Provider DID'}
          </button>
        )}
      </CollapsibleCard>

      {/* Provider Credential - Collapsible Card */}
      <CollapsibleCard title="Provider Credential & QR" icon="🔑" defaultOpen={true}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Facility / Organization</label>
            <input
              type="text"
              className="input-field"
              value={vcForm.facility}
              onChange={(e) => setVcForm({ ...vcForm, facility: e.target.value })}
              placeholder="City Hospital"
            />
            <label className="label">Speciality / Role</label>
            <input
              type="text"
              className="input-field"
              value={vcForm.speciality}
              onChange={(e) => setVcForm({ ...vcForm, speciality: e.target.value })}
              placeholder="Radiology Department"
            />
            <button className="btn btn-primary mt-3" onClick={handleGenerateVC} disabled={loading || !did}>
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
                      alt="Provider VC QR"
                      className="w-48 h-48 object-contain border rounded-lg bg-white"
                    />
                  </div>
                )}
                <pre className="text-xs bg-white p-2 rounded max-h-64 overflow-auto">
                  {JSON.stringify(vcInfo, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Credential data will appear here once generated.</div>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* Treatment Credential Issuance Section */}
      <CollapsibleCard title="Treatment Credential Issuance" icon="💊" defaultOpen={true}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Patient DID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={treatmentForm.patientDid}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, patientDid: e.target.value })}
                placeholder="did:example:patient123"
              />
            </div>
            <div>
              <label className="label">
                Bill Amount (ETH) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={treatmentForm.billAmount}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, billAmount: e.target.value })}
                placeholder="0.5"
              />
            </div>
          </div>
          <div>
            <label className="label">
              Treatment Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input-field"
              rows="3"
              value={treatmentForm.treatmentDescription}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, treatmentDescription: e.target.value })}
              placeholder="Describe the treatment provided..."
            />
          </div>
          <div>
            <label className="label">Upload Supporting Documents</label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                multiple
                onChange={handleTreatmentFileChange}
                className="input-field"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <button
                className="btn btn-secondary"
                onClick={handleUploadTreatmentFiles}
                disabled={loading || treatmentFiles.length === 0}
              >
                {loading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
            {treatmentFileCids.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-semibold">Uploaded CIDs:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {treatmentFileCids.map((cid, idx) => (
                    <span key={idx} className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                      {cid}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={handleIssueTreatmentCredential}
            disabled={loading || !did || !treatmentForm.patientDid || !treatmentForm.treatmentDescription || !treatmentForm.billAmount}
          >
            {loading ? 'Issuing...' : 'Issue Treatment Credential'}
          </button>

          {/* Treatment VC Preview Card */}
          {issuedTreatmentVC && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-green-800 mb-3">✓ Treatment Credential Issued</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">VC ID:</span>
                  <p className="font-mono text-xs break-all bg-white p-2 rounded mt-1">{issuedTreatmentVC.vcId}</p>
                </div>
                <div>
                  <span className="font-semibold">Patient DID:</span>
                  <p className="font-mono text-xs break-all bg-white p-2 rounded mt-1">{issuedTreatmentVC.patientDid}</p>
                </div>
                {issuedTreatmentVC.cid && (
                  <div>
                    <span className="font-semibold">VC CID:</span>
                    <p className="font-mono text-xs break-all bg-white p-2 rounded mt-1">{issuedTreatmentVC.cid}</p>
                  </div>
                )}
                <div className="flex space-x-2 mt-3">
                  <button
                    className="btn btn-secondary text-xs"
                    onClick={() => handleDownloadVC(issuedTreatmentVC.vc)}
                  >
                    Download VC JSON
                  </button>
                  <button
                    className="btn btn-secondary text-xs"
                    onClick={() => handleCopyJWT(issuedTreatmentVC.jwt)}
                  >
                    Copy JWT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Claim Submission Section */}
      <CollapsibleCard title="Claim Submission" icon="📋" defaultOpen={true}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Patient Wallet or DID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={claimForm.patientWalletOrDid}
                onChange={(e) => setClaimForm({ ...claimForm, patientWalletOrDid: e.target.value })}
                placeholder="0x... or did:example:..."
              />
            </div>
            <div>
              <label className="label">
                Policy ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={claimForm.policyId}
                onChange={(e) => setClaimForm({ ...claimForm, policyId: e.target.value })}
                placeholder="1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Amount (ETH or Wei) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input-field"
                value={claimForm.amount}
                onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                placeholder="0.5 or 500000000000000000"
              />
            </div>
            <div>
              <label className="label">File CIDs (comma-separated)</label>
              <input
                type="text"
                className="input-field"
                value={claimForm.fileCids || treatmentFileCids.join(', ')}
                onChange={(e) => setClaimForm({ ...claimForm, fileCids: e.target.value })}
                placeholder="Qm..., Qm..."
              />
            </div>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={handleSubmitClaim}
            disabled={loading || !wallet || !claimForm.patientWalletOrDid || !claimForm.policyId || !claimForm.amount}
          >
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      </CollapsibleCard>

      {/* Issued VC List Section */}
      <CollapsibleCard title="Issued VC List" icon="📜" defaultOpen={false}>
        <div className="space-y-4">
          {issuedVCs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No VCs issued yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Treatment VC ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Patient DID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Created At</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issuedVCs.map((vc, idx) => {
                    const vcData = vc.vc || vc;
                    const vcId = vcData.id || vc.vcId || `vc-${idx}`;
                    const patientDid = vcData.credentialSubject?.id || vc.patientDid || 'N/A';
                    const createdAt = vc.createdAt || vcData.issuanceDate || 'N/A';
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-mono text-xs">{vcId}</td>
                        <td className="border border-gray-300 px-4 py-2 font-mono text-xs break-all">{patientDid}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm">{new Date(createdAt).toLocaleString()}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <button
                            className="btn btn-secondary text-xs"
                            onClick={() => handleViewVC(vcData)}
                          >
                            View VC
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Claims Submitted by Provider Section */}
      <CollapsibleCard title="Claims Submitted by Provider" icon="💼" defaultOpen={false}>
        <div className="space-y-4">
          {submittedClaims.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No claims submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Claim ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Patient DID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">TxHash</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedClaims.map((claim, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs">{claim.claimId || 'N/A'}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs break-all">{claim.beneficiary || claim.patientDid || 'N/A'}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{claim.amount || 'N/A'}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          claim.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          claim.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          claim.status === 'Paid' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {claim.status || 'Submitted'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs break-all">{claim.txHash || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* VC Modal */}
      {showVCModal && selectedVC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Verifiable Credential Details</h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowVCModal(false)}
              >
                ✕
              </button>
            </div>
            <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(selectedVC, null, 2)}
            </pre>
            <div className="flex space-x-2 mt-4">
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleDownloadVC(selectedVC);
                  setShowVCModal(false);
                }}
              >
                Download VC JSON
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  handleCopyJWT(selectedVC.proof?.jwt || JSON.stringify(selectedVC));
                  setShowVCModal(false);
                }}
              >
                Copy JWT
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowVCModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Alert */}
      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} animate-slide-up`}>
          <div className="flex items-center space-x-2">
            <span>{message.type === 'error' ? '❌' : '✓'}</span>
            <span>{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderDashboard;



