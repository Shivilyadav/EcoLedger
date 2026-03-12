const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying PlasticCredit to Polygon...");

  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log(`📡 Deployer address : ${deployer.address}`);
  console.log(`💰 Deployer balance : ${ethers.formatEther(balance)} MATIC`);

  if (balance === 0n) {
    console.error("❌ Deployer has no MATIC. Get testnet MATIC from https://faucet.polygon.technology/");
    process.exit(1);
  }

  // Deploy
  const PlasticCredit = await ethers.getContractFactory("PlasticCredit");
  const contract      = await PlasticCredit.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("");
  console.log("✅ PlasticCredit deployed successfully!");
  console.log(`📋 Contract Address : ${address}`);
  console.log(`🔗 PolygonScan      : https://amoy.polygonscan.com/address/${address}`);
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Add this to your backend/.env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
