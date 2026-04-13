# Pay Me Back Agent - Autonomous Onchain Debt Enforcement Protocol

## Critical Security Action

The private key shared in chat must be treated as compromised.

1. Immediately move funds out of that wallet.
2. Create a brand-new deployment/agent wallet.
3. Fund the new wallet with OKB.
4. Use only the new key in local `.env` or GitHub/Vercel secrets.

Never commit private keys or `.env` files.

Production-ready debt enforcement protocol for X Layer (chainId 196) with:
- Solidity LoanManager contract
- Hardhat deployment flow
- Autonomous TypeScript agent for default and liquidation execution
- Minimal Next.js frontend for loan creation and tracking

## 1) Architecture

### Onchain Layer
- `LoanManager` is the source of truth for loans.
- Lender creates loan and funds principal to borrower.
- Borrower repays onchain before deadline.
- If overdue, anyone (or the agent) can mark default.
- Agent triggers liquidation: collateral token is swapped via Uniswap router into repayment token and paid to lender.

### Agent Layer
- Polls `nextLoanId`, loan structs, and `getLoanStatus` continuously.
- Decision engine evaluates each loan.
- Executor sends `markDefault` and `liquidate` transactions with real wallet.
- Logs deterministic reasoning and tx hashes.

### Frontend Layer
- Browser wallet connection on X Layer.
- Create loan transaction.
- Read and display all loans and states.
- Shows last tx hash from user actions.

## 2) Project Structure

- `contracts/LoanManager.sol`
- `scripts/deploy.ts`
- `agent/index.ts`
- `agent/monitor.ts`
- `agent/executor.ts`
- `agent/decisionEngine.ts`
- `frontend/`
- `utils/loanManagerAbi.ts`
- `utils/nlParser.ts`
- `.env`

## 3) Prerequisites

- Node.js 20+
- Wallet with OKB for gas on X Layer
- ERC20 approvals set by lender and borrower:
  - Lender approves principal token to `LoanManager`
  - Borrower approves collateral token to `LoanManager`

## 4) Install

From project root:

```bash
npm install
```

For frontend:

```bash
cd frontend
npm install
```

## 4.1) GitHub CI

This repository includes GitHub Actions workflow:

- `.github/workflows/ci.yml`

It compiles contracts and builds frontend on every push/PR.

## 5) Configure Environment

Root `.env`:

```env
PRIVATE_KEY=0x...
UNISWAP_ROUTER_ADDRESS=0x...
COLLATERAL_TOKEN_ADDRESS=0x...
LOAN_MANAGER_ADDRESS=0x...   # set after deploy
AGENT_POLL_INTERVAL_MS=10000
OKLINK_API_KEY=
```

Frontend `frontend/.env.local`:

```env
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...
```

For deployment on Vercel, set the same key as an environment variable in Vercel project settings:

- `NEXT_PUBLIC_LOAN_MANAGER_ADDRESS`

## 6) Compile and Deploy to X Layer

```bash
npm run compile
npm run deploy:xlayer
```

Deployment script prints:
- Contract address
- Deployment transaction hash

Set `LOAN_MANAGER_ADDRESS` in `.env` after deployment.

## 7) Verify Contract (optional)

Use Hardhat verify command with constructor args:

```bash
npx hardhat verify --network xlayer <LOAN_MANAGER_ADDRESS> <OWNER_ADDRESS> <UNISWAP_ROUTER_ADDRESS> <COLLATERAL_TOKEN_ADDRESS>
```

## 8) Run Autonomous Agent

```bash
npm run agent:start
```

Behavior:
- Monitors all loans continuously.
- If overdue and not repaid, sends:
  - `markDefault(loanId)`
  - `liquidate(loanId)`
- Logs reason and tx hashes.

## 9) Run Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## 9.1) Deploy Frontend to Vercel

1. Push this project to GitHub.
2. In Vercel, click "Add New Project" and import the GitHub repo.
3. Set Root Directory to `frontend`.
4. Add environment variable:
  - `NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...`
5. Deploy.

Vercel will run `npm install` and `npm run build` from `frontend`.

## 9.2) Push This Project to GitHub

From repo root:

```bash
git init
git add .
git commit -m "feat: pay me back agent protocol + agent + frontend"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 10) Operational Flow (End-to-End)

1. Deploy `LoanManager` on X Layer.
2. Fund deployer/agent wallet with OKB.
3. Lender approves repayment token spending by `LoanManager`.
4. Borrower approves collateral token spending by `LoanManager`.
5. Create loan from frontend or contract call.
6. Wait until after deadline without repayment.
7. Agent automatically marks default and liquidates collateral.
8. Capture tx hashes from agent logs and explorer.

## 11) Security Notes

- Uses OpenZeppelin `SafeERC20` for token transfers.
- Reverts on invalid params and invalid state transitions.
- Prevents double repayment and double liquidation.
- Returns excess liquidation proceeds to borrower.
- Keep liquidation routes limited to trusted router/token pairs.
- For production hardening, set slippage controls and/or onchain price checks.

## 12) Wallet and Provider Binding

Agent uses real X Layer provider and signer:

```ts
const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
```

## 13) Optional Natural Language Loan Parsing

`utils/nlParser.ts` includes a lightweight parser for prompts such as:
- "I lent 100 USDT to 0xabc..., repay in 3 days with 10% interest"

It returns borrower, principal, repayment, and deadline offset.
