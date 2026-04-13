import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
] as const;

const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
] as const;

async function main() {
  const factoryAddress = process.env.UNISWAP_FACTORY_ADDRESS;
  const tokenA = process.env.COLLATERAL_TOKEN_ADDRESS;
  const tokenB = process.env.REPAYMENT_TOKEN_ADDRESS || process.env.DEFAULT_REPAYMENT_TOKEN;

  if (!factoryAddress) throw new Error("UNISWAP_FACTORY_ADDRESS is required in .env");
  if (!tokenA) throw new Error("COLLATERAL_TOKEN_ADDRESS is required in .env");
  if (!tokenB) {
    throw new Error("REPAYMENT_TOKEN_ADDRESS (or DEFAULT_REPAYMENT_TOKEN) is required in .env");
  }

  const factory = await ethers.getContractAt(FACTORY_ABI, factoryAddress);
  const pairAddress = await factory.getPair(tokenA, tokenB);

  if (pairAddress === ethers.ZeroAddress) {
    throw new Error("No pair exists for COLLATERAL_TOKEN_ADDRESS and REPAYMENT_TOKEN_ADDRESS.");
  }

  const pair = await ethers.getContractAt(PAIR_ABI, pairAddress);
  const [reserve0, reserve1] = await pair.getReserves();
  const token0 = await pair.token0();
  const token1 = await pair.token1();

  console.log(`Pair address: ${pairAddress}`);
  console.log(`token0: ${token0}, reserve0: ${reserve0.toString()}`);
  console.log(`token1: ${token1}, reserve1: ${reserve1.toString()}`);

  if (reserve0 === 0n || reserve1 === 0n) {
    throw new Error("Pair exists but has zero liquidity. Add liquidity before enabling liquidation.");
  }

  console.log("Route check passed: pair exists with non-zero liquidity.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
