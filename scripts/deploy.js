const hre = require("hardhat");

async function main() {
  console.log("Deploying Claims contract...");

  // Get the contract factory
  const Claims = await hre.ethers.getContractFactory("Claims");

  // Deploy the contract
  const claims = await Claims.deploy();

  // Wait for deployment to be mined
  await claims.waitForDeployment();

  // Get the deployed contract address
  const contractAddress = await claims.getAddress();

  console.log("Claims contract deployed to:", contractAddress);
  console.log("Contract owner:", await claims.owner());

  // Verify contract on Etherscan if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await claims.deploymentTransaction().wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    owner: await claims.owner(),
    deploymentTime: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  console.log("\nDeployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return contractAddress;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
