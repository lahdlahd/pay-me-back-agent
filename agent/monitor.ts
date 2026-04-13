import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { LOAN_MANAGER_ABI } from "../utils/loanManagerAbi";
import { decideEnforcement, LoanState, LoanStatus } from "./decisionEngine";
import { Executor } from "./executor";

type LoanTuple = [
  string,
  string,
  string,
  bigint,
  bigint,
  bigint,
  bigint,
  boolean,
  boolean,
  boolean
];

type StatusTuple = [boolean, boolean, boolean, boolean];

export class Monitor {
  private readonly contract: Contract;
  private readonly executor: Executor;

  constructor(
    wallet: Wallet,
    private readonly loanManagerAddress: string,
    private readonly pollIntervalMs: number
  ) {
    const provider = new JsonRpcProvider("https://rpc.xlayer.tech");
    this.contract = new Contract(loanManagerAddress, LOAN_MANAGER_ABI, provider);
    this.executor = new Executor(wallet, loanManagerAddress);
  }

  async start(): Promise<void> {
    console.log("Agent monitor started");

    while (true) {
      try {
        await this.scanAndEnforce();
      } catch (error) {
        console.error("scanAndEnforce error", error);
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }
  }

  private async scanAndEnforce(): Promise<void> {
    const nextLoanId = Number(await this.contract.nextLoanId());
    const nowSec = Math.floor(Date.now() / 1000);

    for (let loanId = 0; loanId < nextLoanId; loanId += 1) {
      const loan = (await this.contract.loans(loanId)) as LoanTuple;
      const status = (await this.contract.getLoanStatus(loanId)) as StatusTuple;

      const state: LoanState = {
        loanId,
        deadline: loan[5],
        repaid: loan[7],
        defaulted: loan[8],
        liquidated: loan[9]
      };

      const loanStatus: LoanStatus = {
        overdue: status[0],
        canDefault: status[1],
        canLiquidate: status[2],
        settled: status[3]
      };

      const decision = decideEnforcement(state, loanStatus, nowSec);
      if (!decision) {
        continue;
      }

      try {
        await this.executor.execute(loanId, decision);
      } catch (error) {
        console.error(`Execution failed for loan #${loanId}`, error);
      }
    }
  }
}
