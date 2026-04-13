// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFactoryLike {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IPairLike {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function mint(address to) external returns (uint256 liquidity);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

interface IERC20Like {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SimpleV2Router {
    address public immutable factory;

    constructor(address factory_) {
        require(factory_ != address(0), "router: factory=0");
        factory = factory_;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        require(block.timestamp <= deadline, "router: expired");
        require(tokenA != tokenB, "router: identical tokens");

        address pair = IFactoryLike(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IFactoryLike(factory).createPair(tokenA, tokenB);
        }

        (uint reserveA, uint reserveB) = _getReserves(pair, tokenA, tokenB);

        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "router: insufficient B");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                require(amountAOptimal >= amountAMin, "router: insufficient A");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }

        require(IERC20Like(tokenA).transferFrom(msg.sender, pair, amountA), "router: transfer A failed");
        require(IERC20Like(tokenB).transferFrom(msg.sender, pair, amountB), "router: transfer B failed");

        liquidity = IPairLike(pair).mint(to);
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(block.timestamp <= deadline, "router: expired");
        require(path.length == 2, "router: only 2-token path");

        require(path[0] != path[1], "router: identical tokens");

        address pair = IFactoryLike(factory).getPair(path[0], path[1]);
        require(pair != address(0), "router: pair missing");

        (uint reserveIn, uint reserveOut) = _getReserves(pair, path[0], path[1]);
        uint amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "router: insufficient output");

        require(IERC20Like(path[0]).transferFrom(msg.sender, pair, amountIn), "router: transfer in failed");

        (uint amount0Out, uint amount1Out) = path[0] == IPairLike(pair).token0()
            ? (uint(0), amountOut)
            : (amountOut, uint(0));

        IPairLike(pair).swap(amount0Out, amount1Out, to, new bytes(0));

        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }

    function quote(uint amountA, uint reserveA, uint reserveB) public pure returns (uint amountB) {
        require(amountA > 0, "router: insufficient amount");
        require(reserveA > 0 && reserveB > 0, "router: insufficient liquidity");
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut) {
        require(amountIn > 0, "router: insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "router: insufficient liquidity");

        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function _getReserves(address pair, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (uint reserve0, uint reserve1,) = IPairLike(pair).getReserves();
        if (tokenA == IPairLike(pair).token0()) {
            reserveA = reserve0;
            reserveB = reserve1;
        } else {
            reserveA = reserve1;
            reserveB = reserve0;
        }
    }
}
