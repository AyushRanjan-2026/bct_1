// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Claims
 * @dev A smart contract for managing insurance claims
 * @author Your Name
 */
contract Claims is Ownable {
    // Claim status enum
    enum ClaimStatus {
        Pending,
        Approved,
        Rejected,
        Settled
    }

    // Claim structure
    struct Claim {
        uint256 id;
        address provider;
        address patient;
        uint256 amount;
        string documentHash;
        ClaimStatus status;
        uint256 submittedAt;
        uint256 updatedAt;
    }

    // State variables
    uint256 private _claimCounter;
    mapping(uint256 => Claim) private _claims;
    mapping(address => uint256[]) private _providerClaims;
    mapping(address => uint256[]) private _patientClaims;

    // Events
    event ClaimSubmitted(
        uint256 indexed claimId,
        address indexed provider,
        address indexed patient,
        uint256 amount,
        string documentHash
    );

    event ClaimApproved(
        uint256 indexed claimId,
        address indexed provider,
        address indexed patient,
        uint256 amount
    );

    event ClaimRejected(
        uint256 indexed claimId,
        address indexed provider,
        address indexed patient,
        uint256 amount
    );

    event ClaimSettled(
        uint256 indexed claimId,
        address indexed provider,
        address indexed patient,
        uint256 amount
    );

    // Modifiers
    modifier validClaimId(uint256 _claimId) {
        require(_claimId > 0 && _claimId <= _claimCounter, "Invalid claim ID");
        _;
    }

    modifier onlyPendingClaim(uint256 _claimId) {
        require(_claims[_claimId].status == ClaimStatus.Pending, "Claim is not pending");
        _;
    }

    // Constructor
    constructor() Ownable(msg.sender) {
        _claimCounter = 0;
    }

    /**
     * @dev Submit a new claim
     * @param _patient The address of the patient
     * @param _amount The claim amount in wei
     * @param _documentHash The hash of the supporting document
     */
    function submitClaim(
        address _patient,
        uint256 _amount,
        string memory _documentHash
    ) external {
        require(_patient != address(0), "Invalid patient address");
        require(_amount > 0, "Amount must be greater than zero");
        require(bytes(_documentHash).length > 0, "Document hash cannot be empty");

        _claimCounter++;
        
        Claim memory newClaim = Claim({
            id: _claimCounter,
            provider: msg.sender,
            patient: _patient,
            amount: _amount,
            documentHash: _documentHash,
            status: ClaimStatus.Pending,
            submittedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _claims[_claimCounter] = newClaim;
        _providerClaims[msg.sender].push(_claimCounter);
        _patientClaims[_patient].push(_claimCounter);

        emit ClaimSubmitted(
            _claimCounter,
            msg.sender,
            _patient,
            _amount,
            _documentHash
        );
    }

    /**
     * @dev Approve a pending claim (only owner)
     * @param _claimId The ID of the claim to approve
     */
    function approveClaim(uint256 _claimId) 
        external 
        onlyOwner 
        validClaimId(_claimId) 
        onlyPendingClaim(_claimId) 
    {
        Claim storage claim = _claims[_claimId];
        claim.status = ClaimStatus.Approved;
        claim.updatedAt = block.timestamp;

        emit ClaimApproved(
            _claimId,
            claim.provider,
            claim.patient,
            claim.amount
        );
    }

    /**
     * @dev Reject a pending claim (only owner)
     * @param _claimId The ID of the claim to reject
     */
    function rejectClaim(uint256 _claimId) 
        external 
        onlyOwner 
        validClaimId(_claimId) 
        onlyPendingClaim(_claimId) 
    {
        Claim storage claim = _claims[_claimId];
        claim.status = ClaimStatus.Rejected;
        claim.updatedAt = block.timestamp;

        emit ClaimRejected(
            _claimId,
            claim.provider,
            claim.patient,
            claim.amount
        );
    }

    /**
     * @dev Settle an approved claim (only owner)
     * @param _claimId The ID of the claim to settle
     */
    function settleClaim(uint256 _claimId) 
        external 
        onlyOwner 
        validClaimId(_claimId) 
    {
        Claim storage claim = _claims[_claimId];
        require(claim.status == ClaimStatus.Approved, "Claim must be approved to settle");
        
        claim.status = ClaimStatus.Settled;
        claim.updatedAt = block.timestamp;

        // Transfer the claim amount to the patient
        require(address(this).balance >= claim.amount, "Insufficient contract balance");
        (bool success, ) = payable(claim.patient).call{value: claim.amount}("");
        require(success, "Transfer failed");

        emit ClaimSettled(
            _claimId,
            claim.provider,
            claim.patient,
            claim.amount
        );
    }

    /**
     * @dev Get claim details by ID
     * @param _claimId The ID of the claim
     * @return The claim details
     */
    function getClaim(uint256 _claimId) 
        external 
        view 
        validClaimId(_claimId) 
        returns (Claim memory) 
    {
        return _claims[_claimId];
    }

    /**
     * @dev Get all claims submitted by a provider
     * @param _provider The provider address
     * @return Array of claim IDs
     */
    function getProviderClaims(address _provider) external view returns (uint256[] memory) {
        return _providerClaims[_provider];
    }

    /**
     * @dev Get all claims for a patient
     * @param _patient The patient address
     * @return Array of claim IDs
     */
    function getPatientClaims(address _patient) external view returns (uint256[] memory) {
        return _patientClaims[_patient];
    }

    /**
     * @dev Get total number of claims
     * @return The total number of claims
     */
    function getTotalClaims() external view returns (uint256) {
        return _claimCounter;
    }

    /**
     * @dev Deposit funds to the contract (only owner)
     */
    function deposit() external payable onlyOwner {
        require(msg.value > 0, "Amount must be greater than zero");
    }

    /**
     * @dev Withdraw funds from the contract (only owner)
     * @param _amount The amount to withdraw
     */
    function withdraw(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        require(_amount > 0, "Amount must be greater than zero");
        
        (bool success, ) = payable(owner()).call{value: _amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get contract balance
     * @return The contract balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Fallback function to receive Ether
    receive() external payable {}
}
