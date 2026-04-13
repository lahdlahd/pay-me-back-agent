"use client";

import { FormEvent, useMemo, useState } from "react";
import { BrowserProvider, Contract, ethers } from "ethers";
import { LOAN_MANAGER_ABI } from "../lib/loanManagerAbi";

type LoanView = {
  id: number;
  lender: string;
  borrower: string;
  token: string;
  principal: string;
  repayment: string;
  deadline: number;
  collateral: string;
  repaid: boolean;
  defaulted: boolean;
  liquidated: boolean;
};

const CHAIN_ID = 196;

export default function Page() {
  const [account, setAccount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<LoanView[]>([]);

  const [borrower, setBorrower] = useState("");
  const [token, setToken] = useState("");
  const [principal, setPrincipal] = useState("");
  const [repayment, setRepayment] = useState("");
  const [deadline, setDeadline] = useState("");
  const [collateral, setCollateral] = useState("0");

  const contractAddress = process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS || "";

  const statusText = useMemo(() => {
    if (!account) return "Disconnected";
    return `Connected: ${account}`;
  }, [account]);

  async function getReadContract() {
    const provider = new BrowserProvider((window as any).ethereum);
    return new Contract(contractAddress, LOAN_MANAGER_ABI, provider);
  }

  async function getWriteContract() {
    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    return new Contract(contractAddress, LOAN_MANAGER_ABI, signer);
  }

  async function connectWallet() {
    try {
      setError("");
      if (!(window as any).ethereum) {
        throw new Error("No wallet found. Install MetaMask or OKX Wallet.");
      }
      const provider = new BrowserProvider((window as any).ethereum);
      await provider.send("wallet_switchEthereumChain", [{ chainId: `0x${CHAIN_ID.toString(16)}` }]);
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());
    } catch (e: any) {
      setError(e.message || "Wallet connection failed");
    }
  }

  async function loadLoans() {
    try {
      setError("");
      if (!contractAddress) throw new Error("NEXT_PUBLIC_LOAN_MANAGER_ADDRESS missing");
      const contract = await getReadContract();
      const nextLoanId = Number(await contract.nextLoanId());
      const rows: LoanView[] = [];

      for (let i = 0; i < nextLoanId; i += 1) {
        const loan = await contract.loans(i);
        rows.push({
          id: i,
          lender: loan[0],
          borrower: loan[1],
          token: loan[2],
          principal: ethers.formatUnits(loan[3], 6),
          repayment: ethers.formatUnits(loan[4], 6),
          deadline: Number(loan[5]),
          collateral: ethers.formatUnits(loan[6], 18),
          repaid: loan[7],
          defaulted: loan[8],
          liquidated: loan[9]
        });
      }

      setLoans(rows);
    } catch (e: any) {
      setError(e.message || "Failed to load loans");
    }
  }

  async function createLoan(event: FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setTxHash("");
      if (!contractAddress) throw new Error("NEXT_PUBLIC_LOAN_MANAGER_ADDRESS missing");

      const contract = await getWriteContract();
      const tx = await contract.createLoan(
        borrower,
        token,
        ethers.parseUnits(principal, 6),
        ethers.parseUnits(repayment, 6),
        Number(deadline),
        ethers.parseUnits(collateral, 18)
      );
      const receipt = await tx.wait();
      setTxHash(receipt?.hash || tx.hash);
      await loadLoans();
    } catch (e: any) {
      setError(e.message || "Create loan failed");
    } finally {
      setLoading(false);
    }
  }

  function loanStatus(loan: LoanView): string {
    if (loan.repaid) return "repaid";
    if (loan.liquidated) return "liquidated";
    if (loan.defaulted) return "defaulted";
    return "active";
  }

  return (
    <main>
      <section className="hero">
        <h1 className="title">Pay Me Back Agent</h1>
        <p className="subtitle">Autonomous onchain debt enforcement protocol on X Layer.</p>
      </section>

      <div className="row" style={{ marginBottom: "1rem" }}>
        <button className="secondary" onClick={connectWallet}>Connect Wallet</button>
        <button onClick={loadLoans}>Refresh Loans</button>
        <span className="pill">{statusText}</span>
      </div>

      {error ? <p style={{ color: "#a72312" }}>{error}</p> : null}
      {txHash ? (
        <p>
          Last tx: <code>{txHash}</code>
        </p>
      ) : null}

      <div className="grid">
        <section className="card">
          <h3>Create Loan</h3>
          <form onSubmit={createLoan}>
            <label>Borrower</label>
            <input value={borrower} onChange={(e) => setBorrower(e.target.value)} placeholder="0x..." required />

            <label>Repayment Token (ERC20)</label>
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="USDT token address" required />

            <label>Principal (token units, 6 decimals assumed)</label>
            <input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="100" required />

            <label>Repayment (token units, 6 decimals assumed)</label>
            <input value={repayment} onChange={(e) => setRepayment(e.target.value)} placeholder="110" required />

            <label>Deadline (unix timestamp)</label>
            <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="1719999999" required />

            <label>Collateral (WOKB units, 18 decimals)</label>
            <input value={collateral} onChange={(e) => setCollateral(e.target.value)} placeholder="0.5" required />

            <div style={{ marginTop: "0.8rem" }}>
              <button disabled={loading}>{loading ? "Submitting..." : "Create Loan"}</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h3>Loans</h3>
          <div className="loan-list">
            {loans.length === 0 ? <p>No loans yet.</p> : null}
            {loans.map((loan) => (
              <article className="loan-item" key={loan.id}>
                <div className="row">
                  <strong>#{loan.id}</strong>
                  <span className="pill">{loanStatus(loan)}</span>
                </div>
                <p style={{ margin: "0.4rem 0" }}>
                  principal: {loan.principal} | repayment: {loan.repayment}
                </p>
                <p style={{ margin: "0.4rem 0" }}>
                  deadline: {new Date(loan.deadline * 1000).toLocaleString()}
                </p>
                <code>{loan.borrower}</code>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
