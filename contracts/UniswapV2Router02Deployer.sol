// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

import {UniswapV2Router02} from "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol";

contract UniswapV2Router02Deployer is UniswapV2Router02 {
    constructor(address factory, address weth) public UniswapV2Router02(factory, weth) {}
}
