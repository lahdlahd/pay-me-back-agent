export type ParsedLoan = {
  borrower: string;
  principal: number;
  repayment: number;
  deadlineSecondsFromNow: number;
};

// Lightweight parser: "I lent 100 USDT to 0xabc..., repay in 3 days with 10% interest"
export function parseLoanPrompt(input: string): ParsedLoan {
  const lower = input.toLowerCase();

  const principalMatch = lower.match(/lent\s+(\d+(?:\.\d+)?)/i);
  const borrowerMatch = input.match(/to\s+(0x[a-fA-F0-9]{40})/);
  const daysMatch = lower.match(/(\d+)\s+days?/i);
  const interestMatch = lower.match(/(\d+(?:\.\d+)?)\s*%\s*interest/i);

  if (!principalMatch) {
    throw new Error("Could not parse principal amount");
  }
  if (!borrowerMatch) {
    throw new Error("Could not parse borrower address");
  }

  const principal = Number(principalMatch[1]);
  const days = daysMatch ? Number(daysMatch[1]) : 0;
  const interestPct = interestMatch ? Number(interestMatch[1]) : 0;

  const repayment = principal * (1 + interestPct / 100);
  const deadlineSecondsFromNow = days * 24 * 60 * 60;

  return {
    borrower: borrowerMatch[1],
    principal,
    repayment,
    deadlineSecondsFromNow
  };
}
