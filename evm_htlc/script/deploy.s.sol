// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {HTLCEscrowFactory} from "../src/HTLCEscrowFactory.sol";
import {HTLCEscrow} from "../src/HTLCEscrow.sol";
import {USDC} from "../src/mocks/MockERC20.sol";

contract HTLCEscrowFactoryScript is Script {
    HTLCEscrowFactory public htlcEscrowFactory;
    USDC public usdcToken;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        usdcToken = new USDC("USDC", "USDC", 18);
        htlcEscrowFactory = new HTLCEscrowFactory();

        vm.stopBroadcast();
    }
}
