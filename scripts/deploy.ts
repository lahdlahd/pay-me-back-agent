import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const router = process.env.UNISWAP_ROUTER_ADDRESS;
  const collateralToken = process.env.COLLATERAL_TOKEN_ADDRESS;

  if (!router) {
    throw new Error("UNISWAP_ROUTER_ADDRESS is required in .env");
  }
  if (!collateralToken) {
    throw new Error("COLLATERAL_TOKEN_ADDRESS is required in .env");
  }

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No deployer signer found. Set PRIVATE_KEY in the root .env file before running deploy:xlayer."
    );
  }

  const [deployer] = signers;
  console.log(`Deployer: ${deployer.address}`);

  const factory = await ethers.getContractFactory("LoanManager");
  const contract = await factory.deploy(deployer.address, router, collateralToken);
  await contract.waitForDeployment();

  const deploymentTx = contract.deploymentTransaction();
  const address = await contract.getAddress();

  console.log(`LoanManager deployed: ${address}`);
  if (deploymentTx) {
    console.log(`Deployment tx hash: ${deploymentTx.hash}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
