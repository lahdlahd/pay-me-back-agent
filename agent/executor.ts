import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { LOAN_MANAGER_ABI } from "../utils/loanManagerAbi";
import { Decision } from "./decisionEngine";

export class Executor {
  private readonly contract: Contract;

  constructor(private readonly wallet: Wallet, loanManagerAddress: string) {
    this.contract = new Contract(loanManagerAddress, LOAN_MANAGER_ABI, wallet);
  }

  async execute(loanId: number, decision: Decision): Promise<void> {
    console.log(decision.reason);

    if (decision.markDefault) {
      const tx = await this.contract.markDefault(loanId);
      const receipt = await tx.wait();
      console.log(`markDefault tx hash: ${receipt?.hash || tx.hash}`);
    }

    if (decision.liquidate) {
      const tx = await this.contract.liquidate(loanId);
      const receipt = await tx.wait();
      console.log(`liquidate tx hash: ${receipt?.hash || tx.hash}`);
    }
  }
}

export function buildAgentWallet(privateKey: string): Wallet {
  const provider = new JsonRpcProvider("https://rpc.xlayer.tech");
  return new Wallet(privateKey, provider);
}
