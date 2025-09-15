const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Claims Contract", function () {
  let claims;
  let owner;
  let provider;
  let patient;
  let otherAccount;

  const CLAIM_AMOUNT = ethers.parseEther("1.0");
  const DOCUMENT_HASH = "QmHash123456789";

  beforeEach(async function () {
    [owner, provider, patient, otherAccount] = await ethers.getSigners();

    const Claims = await ethers.getContractFactory("Claims");
    claims = await Claims.deploy();
    await claims.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await claims.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero claims", async function () {
      expect(await claims.getTotalClaims()).to.equal(0);
    });

    it("Should have zero balance initially", async function () {
      expect(await claims.getBalance()).to.equal(0);
    });
  });

  describe("Claim Submission", function () {
    it("Should allow provider to submit a claim", async function () {
      await expect(claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH))
        .to.emit(claims, "ClaimSubmitted")
        .withArgs(1, provider.address, patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);

      expect(await claims.getTotalClaims()).to.equal(1);
    });

    it("Should store claim data correctly", async function () {
      await claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);
      
      const claim = await claims.getClaim(1);
      expect(claim.id).to.equal(1);
      expect(claim.provider).to.equal(provider.address);
      expect(claim.patient).to.equal(patient.address);
      expect(claim.amount).to.equal(CLAIM_AMOUNT);
      expect(claim.documentHash).to.equal(DOCUMENT_HASH);
      expect(claim.status).to.equal(0); // Pending
    });

    it("Should track provider claims", async function () {
      await claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);
      
      const providerClaims = await claims.getProviderClaims(provider.address);
      expect(providerClaims.length).to.equal(1);
      expect(providerClaims[0]).to.equal(1);
    });

    it("Should track patient claims", async function () {
      await claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);
      
      const patientClaims = await claims.getPatientClaims(patient.address);
      expect(patientClaims.length).to.equal(1);
      expect(patientClaims[0]).to.equal(1);
    });

    it("Should reject claim with zero address patient", async function () {
      await expect(
        claims.connect(provider).submitClaim(ethers.ZeroAddress, CLAIM_AMOUNT, DOCUMENT_HASH)
      ).to.be.revertedWith("Invalid patient address");
    });

    it("Should reject claim with zero amount", async function () {
      await expect(
        claims.connect(provider).submitClaim(patient.address, 0, DOCUMENT_HASH)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should reject claim with empty document hash", async function () {
      await expect(
        claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, "")
      ).to.be.revertedWith("Document hash cannot be empty");
    });
  });

  describe("Claim Management (Owner Only)", function () {
    beforeEach(async function () {
      await claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);
    });

    it("Should allow owner to approve claim", async function () {
      await expect(claims.approveClaim(1))
        .to.emit(claims, "ClaimApproved")
        .withArgs(1, provider.address, patient.address, CLAIM_AMOUNT);

      const claim = await claims.getClaim(1);
      expect(claim.status).to.equal(1); // Approved
    });

    it("Should allow owner to reject claim", async function () {
      await expect(claims.rejectClaim(1))
        .to.emit(claims, "ClaimRejected")
        .withArgs(1, provider.address, patient.address, CLAIM_AMOUNT);

      const claim = await claims.getClaim(1);
      expect(claim.status).to.equal(2); // Rejected
    });

    it("Should not allow non-owner to approve claim", async function () {
      await expect(
        claims.connect(otherAccount).approveClaim(1)
      ).to.be.revertedWithCustomError(claims, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to reject claim", async function () {
      await expect(
        claims.connect(otherAccount).rejectClaim(1)
      ).to.be.revertedWithCustomError(claims, "OwnableUnauthorizedAccount");
    });

    it("Should not allow approving non-pending claim", async function () {
      await claims.approveClaim(1);
      
      await expect(
        claims.approveClaim(1)
      ).to.be.revertedWith("Claim is not pending");
    });

    it("Should not allow rejecting non-pending claim", async function () {
      await claims.rejectClaim(1);
      
      await expect(
        claims.rejectClaim(1)
      ).to.be.revertedWith("Claim is not pending");
    });
  });

  describe("Claim Settlement", function () {
    beforeEach(async function () {
      await claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);
      await claims.approveClaim(1);
      
      // Deposit funds to contract
      await claims.deposit({ value: CLAIM_AMOUNT });
    });

    it("Should allow owner to settle approved claim", async function () {
      const initialBalance = await ethers.provider.getBalance(patient.address);
      
      await expect(claims.settleClaim(1))
        .to.emit(claims, "ClaimSettled")
        .withArgs(1, provider.address, patient.address, CLAIM_AMOUNT);

      const claim = await claims.getClaim(1);
      expect(claim.status).to.equal(3); // Settled

      const finalBalance = await ethers.provider.getBalance(patient.address);
      expect(finalBalance - initialBalance).to.equal(CLAIM_AMOUNT);
    });

    it("Should not allow settling non-approved claim", async function () {
      await claims.connect(provider).submitClaim(otherAccount.address, CLAIM_AMOUNT, DOCUMENT_HASH);
      
      await expect(
        claims.settleClaim(2)
      ).to.be.revertedWith("Claim must be approved to settle");
    });

    it("Should not allow non-owner to settle claim", async function () {
      await expect(
        claims.connect(otherAccount).settleClaim(1)
      ).to.be.revertedWithCustomError(claims, "OwnableUnauthorizedAccount");
    });

    it("Should fail if insufficient contract balance", async function () {
      await claims.withdraw(await claims.getBalance());
      
      await expect(
        claims.settleClaim(1)
      ).to.be.revertedWith("Insufficient contract balance");
    });
  });

  describe("Fund Management", function () {
    it("Should allow owner to deposit funds", async function () {
      await expect(claims.deposit({ value: CLAIM_AMOUNT }))
        .to.not.be.reverted;

      expect(await claims.getBalance()).to.equal(CLAIM_AMOUNT);
    });

    it("Should allow owner to withdraw funds", async function () {
      await claims.deposit({ value: CLAIM_AMOUNT });
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      
      await expect(claims.withdraw(CLAIM_AMOUNT))
        .to.not.be.reverted;

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance - initialBalance).to.be.closeTo(CLAIM_AMOUNT, ethers.parseEther("0.01"));
    });

    it("Should not allow non-owner to deposit", async function () {
      await expect(
        claims.connect(otherAccount).deposit({ value: CLAIM_AMOUNT })
      ).to.be.revertedWithCustomError(claims, "OwnableUnauthorizedAccount");
    });

    it("Should not allow non-owner to withdraw", async function () {
      await claims.deposit({ value: CLAIM_AMOUNT });
      
      await expect(
        claims.connect(otherAccount).withdraw(CLAIM_AMOUNT)
      ).to.be.revertedWithCustomError(claims, "OwnableUnauthorizedAccount");
    });

    it("Should reject withdrawal of zero amount", async function () {
      await expect(
        claims.withdraw(0)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should reject withdrawal exceeding balance", async function () {
      await expect(
        claims.withdraw(CLAIM_AMOUNT)
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Multiple Claims", function () {
    it("Should handle multiple claims from same provider", async function () {
      await claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);
      await claims.connect(provider).submitClaim(otherAccount.address, CLAIM_AMOUNT, "hash2");

      expect(await claims.getTotalClaims()).to.equal(2);
      
      const providerClaims = await claims.getProviderClaims(provider.address);
      expect(providerClaims.length).to.equal(2);
      expect(providerClaims[0]).to.equal(1);
      expect(providerClaims[1]).to.equal(2);
    });

    it("Should handle multiple claims for same patient", async function () {
      await claims.connect(provider).submitClaim(patient.address, CLAIM_AMOUNT, DOCUMENT_HASH);
      await claims.connect(otherAccount).submitClaim(patient.address, CLAIM_AMOUNT, "hash2");

      const patientClaims = await claims.getPatientClaims(patient.address);
      expect(patientClaims.length).to.equal(2);
      expect(patientClaims[0]).to.equal(1);
      expect(patientClaims[1]).to.equal(2);
    });
  });

  describe("Edge Cases", function () {
    it("Should reject invalid claim ID", async function () {
      await expect(
        claims.getClaim(0)
      ).to.be.revertedWith("Invalid claim ID");

      await expect(
        claims.getClaim(1)
      ).to.be.revertedWith("Invalid claim ID");
    });

    it("Should handle receive function", async function () {
      const tx = {
        to: await claims.getAddress(),
        value: CLAIM_AMOUNT
      };
      
      await expect(owner.sendTransaction(tx))
        .to.not.be.reverted;

      expect(await claims.getBalance()).to.equal(CLAIM_AMOUNT);
    });
  });
});
