export type LoanState = {
  loanId: number;
  deadline: bigint;
  repaid: boolean;
  defaulted: boolean;
  liquidated: boolean;
};

export type LoanStatus = {
  overdue: boolean;
  canDefault: boolean;
  canLiquidate: boolean;
  settled: boolean;
};

export type Decision = {
  reason: string;
  markDefault: boolean;
  liquidate: boolean;
};

export function decideEnforcement(
  state: LoanState,
  status: LoanStatus,
  nowSec: number
): Decision | null {
  if (status.settled || state.repaid || state.liquidated) {
    return null;
  }

  const overdueBy = nowSec - Number(state.deadline);

  if (status.canDefault) {
    return {
      reason: `Loan #${state.loanId} overdue by ${overdueBy} seconds -> markDefault + liquidate`,
      markDefault: true,
      liquidate: true
    };
  }

  if (status.canLiquidate) {
    return {
      reason: `Loan #${state.loanId} already defaulted -> liquidate now`,
      markDefault: false,
      liquidate: true
    };
  }

  return null;
}
