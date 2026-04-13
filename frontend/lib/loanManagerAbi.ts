export const LOAN_MANAGER_ABI = [
  "function nextLoanId() view returns (uint256)",
  "function loans(uint256) view returns (address lender,address borrower,address token,uint256 principal,uint256 repayment,uint256 deadline,uint256 collateral,bool repaid,bool defaulted,bool liquidated)",
  "function createLoan(address borrower,address token,uint256 principal,uint256 repayment,uint256 deadline,uint256 collateral) returns (uint256)",
  "function repayLoan(uint256 loanId)",
  "event LoanCreated(uint256 indexed loanId,address indexed lender,address indexed borrower,address token,uint256 principal,uint256 repayment,uint256 deadline,uint256 collateral,bytes32 metadata)",
  "event LoanRepaid(uint256 indexed loanId,address indexed payer,uint256 amount)",
  "event LoanDefaulted(uint256 indexed loanId,uint256 timestamp)",
  "event LoanLiquidated(uint256 indexed loanId,address indexed liquidator,uint256 collateralIn,uint256 recovered,uint256 paidToLender,bool shortfall)"
] as const;
