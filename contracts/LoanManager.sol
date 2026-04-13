// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract LoanManager is Ownable {
    using SafeERC20 for IERC20;

    struct Loan {
        address lender;
        address borrower;
        address token; // Repayment token
        uint256 principal;
        uint256 repayment;
        uint256 deadline;
        uint256 collateral;
        bool repaid;
        bool defaulted;
        bool liquidated;
    }

    IUniswapV2Router02 public immutable router;
    IERC20 public immutable collateralToken;

    uint256 public nextLoanId;
    mapping(uint256 => Loan) public loans;

    event LoanCreated(
        uint256 indexed loanId,
        address indexed lender,
        address indexed borrower,
        address token,
        uint256 principal,
        uint256 repayment,
        uint256 deadline,
        uint256 collateral,
        bytes32 metadata
    );
    event LoanRepaid(uint256 indexed loanId, address indexed payer, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId, uint256 timestamp);
    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed liquidator,
        uint256 collateralIn,
        uint256 recovered,
        uint256 paidToLender,
        bool shortfall
    );

    error InvalidAddress(string field);
    error InvalidAmount(string field);
    error InvalidDeadline();
    error Unauthorized();
    error LoanNotFound();
    error AlreadyRepaid();
    error AlreadyDefaulted();
    error AlreadyLiquidated();
    error LoanNotOverdue();
    error LoanExpired();
    error NotDefaulted();

    constructor(address initialOwner, address router_, address collateralToken_) Ownable(initialOwner) {
        if (router_ == address(0)) revert InvalidAddress("router");
        if (collateralToken_ == address(0)) revert InvalidAddress("collateralToken");

        router = IUniswapV2Router02(router_);
        collateralToken = IERC20(collateralToken_);
    }

    function createLoan(
        address borrower,
        address token,
        uint256 principal,
        uint256 repayment,
        uint256 deadline,
        uint256 collateral
    ) external returns (uint256 loanId) {
        if (borrower == address(0)) revert InvalidAddress("borrower");
        if (token == address(0)) revert InvalidAddress("token");
        if (principal == 0) revert InvalidAmount("principal");
        if (repayment < principal) revert InvalidAmount("repayment");
        if (deadline <= block.timestamp) revert InvalidDeadline();

        // Lender must be msg.sender. Principal is funded immediately to borrower.
        IERC20(token).safeTransferFrom(msg.sender, borrower, principal);

        // Optional collateral is held in protocol and can be liquidated on default.
        if (collateral > 0) {
            collateralToken.safeTransferFrom(borrower, address(this), collateral);
        }

        loanId = nextLoanId++;
        loans[loanId] = Loan({
            lender: msg.sender,
            borrower: borrower,
            token: token,
            principal: principal,
            repayment: repayment,
            deadline: deadline,
            collateral: collateral,
            repaid: false,
            defaulted: false,
            liquidated: false
        });

        emit LoanCreated(
            loanId,
            msg.sender,
            borrower,
            token,
            principal,
            repayment,
            deadline,
            collateral,
            bytes32(0)
        );
    }

    function repayLoan(uint256 loanId) external {
        Loan storage loan = _getLoan(loanId);

        if (loan.repaid) revert AlreadyRepaid();
        if (loan.defaulted) revert AlreadyDefaulted();
        if (block.timestamp > loan.deadline) revert LoanExpired();
        if (msg.sender != loan.borrower) revert Unauthorized();

        IERC20(loan.token).safeTransferFrom(msg.sender, loan.lender, loan.repayment);
        loan.repaid = true;

        // Return collateral if any.
        if (loan.collateral > 0) {
            collateralToken.safeTransfer(loan.borrower, loan.collateral);
        }

        emit LoanRepaid(loanId, msg.sender, loan.repayment);
    }

    function markDefault(uint256 loanId) external {
        Loan storage loan = _getLoan(loanId);

        if (loan.repaid) revert AlreadyRepaid();
        if (loan.defaulted) revert AlreadyDefaulted();
        if (block.timestamp <= loan.deadline) revert LoanNotOverdue();

        loan.defaulted = true;

        emit LoanDefaulted(loanId, block.timestamp);
    }

    function liquidate(uint256 loanId) external {
        Loan storage loan = _getLoan(loanId);

        if (loan.repaid) revert AlreadyRepaid();
        if (!loan.defaulted) revert NotDefaulted();
        if (loan.liquidated) revert AlreadyLiquidated();

        loan.liquidated = true;

        uint256 recovered;
        uint256 paidToLender;

        if (loan.collateral > 0) {
            address[] memory path = new address[](2);
            path[0] = address(collateralToken);
            path[1] = loan.token;

            uint256 beforeBal = IERC20(loan.token).balanceOf(address(this));

            collateralToken.safeIncreaseAllowance(address(router), loan.collateral);
            router.swapExactTokensForTokens(loan.collateral, 0, path, address(this), block.timestamp + 900);

            uint256 afterBal = IERC20(loan.token).balanceOf(address(this));
            recovered = afterBal - beforeBal;

            paidToLender = recovered >= loan.repayment ? loan.repayment : recovered;
            if (paidToLender > 0) {
                IERC20(loan.token).safeTransfer(loan.lender, paidToLender);
            }

            // Return excess proceeds to borrower to avoid over-seizure.
            if (recovered > paidToLender) {
                IERC20(loan.token).safeTransfer(loan.borrower, recovered - paidToLender);
            }
        }

        emit LoanLiquidated(
            loanId,
            msg.sender,
            loan.collateral,
            recovered,
            paidToLender,
            paidToLender < loan.repayment
        );
    }

    function getLoanStatus(uint256 loanId)
        external
        view
        returns (bool overdue, bool canDefault, bool canLiquidate, bool settled)
    {
        Loan memory loan = _getLoanRead(loanId);

        overdue = block.timestamp > loan.deadline;
        canDefault = overdue && !loan.repaid && !loan.defaulted;
        canLiquidate = loan.defaulted && !loan.repaid && !loan.liquidated;
        settled = loan.repaid || loan.liquidated;
    }

    function _getLoan(uint256 loanId) internal view returns (Loan storage loan) {
        loan = loans[loanId];
        if (loan.lender == address(0)) revert LoanNotFound();
    }

    function _getLoanRead(uint256 loanId) internal view returns (Loan memory loan) {
        loan = loans[loanId];
        if (loan.lender == address(0)) revert LoanNotFound();
    }
}
