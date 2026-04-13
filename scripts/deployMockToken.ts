import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const factory = await ethers.getContractFactory("MockToken");
  const token = await factory.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  const deploymentTx = token.deploymentTransaction();

  console.log(`MockToken deployed: ${address}`);
  if (deploymentTx) {
    console.log(`Deployment tx hash: ${deploymentTx.hash}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
