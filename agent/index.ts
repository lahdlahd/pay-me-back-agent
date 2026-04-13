import * as dotenv from "dotenv";
import { buildAgentWallet } from "./executor";
import { Monitor } from "./monitor";

dotenv.config();

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const loanManagerAddress = process.env.LOAN_MANAGER_ADDRESS;
  const pollIntervalMs = Number(process.env.AGENT_POLL_INTERVAL_MS || "10000");

  if (!privateKey) {
    throw new Error("PRIVATE_KEY is missing");
  }
  if (!loanManagerAddress) {
    throw new Error("LOAN_MANAGER_ADDRESS is missing");
  }

  const wallet = buildAgentWallet(privateKey);
  console.log(`Agent wallet: ${wallet.address}`);

  const monitor = new Monitor(wallet, loanManagerAddress, pollIntervalMs);
  await monitor.start();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
