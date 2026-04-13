import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const factoryAddress = process.env.UNISWAP_FACTORY_ADDRESS;
  if (!factoryAddress) {
    throw new Error("UNISWAP_FACTORY_ADDRESS is required in .env before running deploySimpleRouter.");
  }

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No deployer signer found. Set PRIVATE_KEY in .env.");
  }

  const [deployer] = signers;
  console.log(`Deployer: ${deployer.address}`);

  const routerFactory = await ethers.getContractFactory("SimpleV2Router");
  const router = await routerFactory.deploy(factoryAddress);
  await router.waitForDeployment();

  const tx = router.deploymentTransaction();
  console.log(`SimpleV2Router deployed: ${await router.getAddress()}`);
  if (tx) {
    console.log(`Router tx hash: ${tx.hash}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
