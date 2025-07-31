// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {HTLCEscrowFactory} from "../src/HTLCEscrowFactory.sol";

contract HTLCEscrowFactoryScript is Script {
    HTLCEscrowFactory public htlcEscrowFactory;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        htlcEscrowFactory = new HTLCEscrowFactory();

        vm.stopBroadcast();
    }
}
