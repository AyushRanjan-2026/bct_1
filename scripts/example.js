const hre = require("hardhat");

async function main() {
  console.log("=== Claims Contract Example ===\n");

  // Get signers
  const [owner, provider, patient] = await hre.ethers.getSigners();
  
  console.log("Owner:", owner.address);
  console.log("Provider:", provider.address);
  console.log("Patient:", patient.address);
  console.log("");

  // Deploy contract
  console.log("Deploying Claims contract...");
  const Claims = await hre.ethers.getContractFactory("Claims");
  const claims = await Claims.deploy();
  await claims.waitForDeployment();
  
  const contractAddress = await claims.getAddress();
  console.log("Contract deployed to:", contractAddress);
  console.log("");

  // Deposit some funds
  console.log("Depositing 2 ETH to contract...");
  await claims.deposit({ value: hre.ethers.parseEther("2.0") });
  console.log("Contract balance:", hre.ethers.formatEther(await claims.getBalance()), "ETH");
  console.log("");

  // Provider submits a claim
  console.log("Provider submitting a claim...");
  const claimAmount = hre.ethers.parseEther("1.0");
  const documentHash = "QmExampleHash123456789";
  
  await claims.connect(provider).submitClaim(patient.address, claimAmount, documentHash);
  console.log("Claim submitted successfully!");
  console.log("Total claims:", await claims.getTotalClaims());
  console.log("");

  // Get claim details
  console.log("Getting claim details...");
  const claim = await claims.getClaim(1);
  console.log("Claim ID:", claim.id.toString());
  console.log("Provider:", claim.provider);
  console.log("Patient:", claim.patient);
  console.log("Amount:", hre.ethers.formatEther(claim.amount), "ETH");
  console.log("Document Hash:", claim.documentHash);
  console.log("Status:", claim.status.toString(), "(0=Pending, 1=Approved, 2=Rejected, 3=Settled)");
  console.log("");

  // Owner approves the claim
  console.log("Owner approving the claim...");
  await claims.approveClaim(1);
  console.log("Claim approved!");
  console.log("");

  // Get updated claim details
  const updatedClaim = await claims.getClaim(1);
  console.log("Updated status:", updatedClaim.status.toString(), "(0=Pending, 1=Approved, 2=Rejected, 3=Settled)");
  console.log("");

  // Owner settles the claim
  console.log("Owner settling the claim...");
  const patientBalanceBefore = await hre.ethers.provider.getBalance(patient.address);
  await claims.settleClaim(1);
  const patientBalanceAfter = await hre.ethers.provider.getBalance(patient.address);
  
  console.log("Claim settled!");
  console.log("Patient balance before:", hre.ethers.formatEther(patientBalanceBefore), "ETH");
  console.log("Patient balance after:", hre.ethers.formatEther(patientBalanceAfter), "ETH");
  console.log("Amount received:", hre.ethers.formatEther(patientBalanceAfter - patientBalanceBefore), "ETH");
  console.log("");

  // Get final claim details
  const finalClaim = await claims.getClaim(1);
  console.log("Final status:", finalClaim.status.toString(), "(0=Pending, 1=Approved, 2=Rejected, 3=Settled)");
  console.log("Contract balance:", hre.ethers.formatEther(await claims.getBalance()), "ETH");
  console.log("");

  console.log("=== Example completed successfully! ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
