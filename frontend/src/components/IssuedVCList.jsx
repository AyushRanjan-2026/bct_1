import { formatDate } from '../utils/formatting';

function IssuedVCList({ vcs, onViewVC, onDownloadVC }) {
  if (!vcs || vcs.length === 0) {
    return (
      <div className="card animate-slide-up">
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📜</div>
          <p className="text-gray-500">No issued VCs yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
          <span className="text-2xl">📜</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Issued Verifiable Credentials</h2>
          <p className="text-sm text-gray-500">View and manage issued insurance policy VCs</p>
        </div>
      </div>

      <div className="space-y-4">
        {vcs.map((vc, index) => (
          <div
            key={vc.id || index}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="font-semibold text-gray-800">VC #{vc.id || `VC-${index + 1}`}</h3>
                  {vc.policyId && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      Policy: {vc.policyId}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Patient DID:</span>
                    <p className="font-mono text-xs text-gray-800 break-all">
                      {vc.patientDid || vc.credentialSubject?.id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Issued On:</span>
                    <p className="text-gray-800">
                      {formatDate(vc.issuedAt || vc.issuanceDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => onViewVC(vc)}
                className="btn btn-sm btn-primary"
              >
                View VC
              </button>
              <button
                onClick={() => onDownloadVC(vc)}
                className="btn btn-sm btn-secondary"
              >
                Download VC
              </button>
              {vc.cid && (
                <a
                  href={`https://ipfs.io/ipfs/${vc.cid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-secondary"
                >
                  View on IPFS
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IssuedVCList;
