import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No deployer signer found. Set PRIVATE_KEY in the root .env file before running deploy:amm:xlayer.");
  }

  const [deployer] = signers;
  console.log(`Deployer: ${deployer.address}`);

  const factoryFactory = await ethers.getContractFactory("UniswapV2FactoryDeployer");
  const factory = await factoryFactory.deploy(deployer.address);
  await factory.waitForDeployment();

  const wrappedFactory = await ethers.getContractFactory("WrappedOKB");
  const wrapped = await wrappedFactory.deploy();
  await wrapped.waitForDeployment();

  const routerFactory = await ethers.getContractFactory("UniswapV2Router02Deployer");
  const router = await routerFactory.deploy(await factory.getAddress(), await wrapped.getAddress());
  await router.waitForDeployment();

  const factoryTx = factory.deploymentTransaction();
  const wrappedTx = wrapped.deploymentTransaction();
  const routerTx = router.deploymentTransaction();

  console.log(`UniswapV2Factory deployed: ${await factory.getAddress()}`);
  if (factoryTx) {
    console.log(`Factory tx hash: ${factoryTx.hash}`);
  }

  console.log(`WrappedOKB deployed: ${await wrapped.getAddress()}`);
  if (wrappedTx) {
    console.log(`WrappedOKB tx hash: ${wrappedTx.hash}`);
  }

  console.log(`UniswapV2Router02 deployed: ${await router.getAddress()}`);
  if (routerTx) {
    console.log(`Router tx hash: ${routerTx.hash}`);
  }

  console.log("Set these env values:");
  console.log(`UNISWAP_ROUTER_ADDRESS=${await router.getAddress()}`);
  console.log(`UNISWAP_FACTORY_ADDRESS=${await factory.getAddress()}`);
  console.log(`WRAPPED_OKB_ADDRESS=${await wrapped.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
