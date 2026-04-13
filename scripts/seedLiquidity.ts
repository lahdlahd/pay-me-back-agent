import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
] as const;

const ROUTER_ABI = [
  "function addLiquidity(address tokenA,address tokenB,uint amountADesired,uint amountBDesired,uint amountAMin,uint amountBMin,address to,uint deadline) external returns (uint amountA,uint amountB,uint liquidity)"
] as const;

async function main() {
  const routerAddress = process.env.UNISWAP_ROUTER_ADDRESS;
  const tokenA = process.env.COLLATERAL_TOKEN_ADDRESS;
  const tokenB = process.env.REPAYMENT_TOKEN_ADDRESS;

  if (!routerAddress) throw new Error("UNISWAP_ROUTER_ADDRESS is required in .env");
  if (!tokenA) throw new Error("COLLATERAL_TOKEN_ADDRESS is required in .env");
  if (!tokenB) throw new Error("REPAYMENT_TOKEN_ADDRESS is required in .env");

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No deployer signer found. Set PRIVATE_KEY in .env.");
  }
  const [deployer] = signers;

  const amountAInput = process.env.LIQUIDITY_COLLATERAL_AMOUNT || "10000";
  const amountBInput = process.env.LIQUIDITY_REPAYMENT_AMOUNT || "10000";

  const tokenAContract = await ethers.getContractAt(ERC20_ABI, tokenA);
  const tokenBContract = await ethers.getContractAt(ERC20_ABI, tokenB);
  const router = await ethers.getContractAt(ROUTER_ABI, routerAddress);

  const decimalsA = Number(await tokenAContract.decimals());
  const decimalsB = Number(await tokenBContract.decimals());

  const amountADesired = ethers.parseUnits(amountAInput, decimalsA);
  const amountBDesired = ethers.parseUnits(amountBInput, decimalsB);

  const balA = await tokenAContract.balanceOf(deployer.address);
  const balB = await tokenBContract.balanceOf(deployer.address);

  if (balA < amountADesired) {
    throw new Error(`Insufficient collateral token balance. Need ${amountADesired.toString()}, have ${balA.toString()}`);
  }
  if (balB < amountBDesired) {
    throw new Error(`Insufficient repayment token balance. Need ${amountBDesired.toString()}, have ${balB.toString()}`);
  }

  const allowanceA = await tokenAContract.allowance(deployer.address, routerAddress);
  if (allowanceA < amountADesired) {
    const approveATx = await tokenAContract.approve(routerAddress, amountADesired);
    await approveATx.wait();
    console.log(`Approved tokenA tx: ${approveATx.hash}`);
  }

  const allowanceB = await tokenBContract.allowance(deployer.address, routerAddress);
  if (allowanceB < amountBDesired) {
    const approveBTx = await tokenBContract.approve(routerAddress, amountBDesired);
    await approveBTx.wait();
    console.log(`Approved tokenB tx: ${approveBTx.hash}`);
  }

  const deadline = Math.floor(Date.now() / 1000) + 900;

  const addLiqTx = await router.addLiquidity(
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    0,
    0,
    deployer.address,
    deadline
  );
  const receipt = await addLiqTx.wait();

  console.log(`addLiquidity tx hash: ${receipt?.hash || addLiqTx.hash}`);
  console.log("Liquidity seeded successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
