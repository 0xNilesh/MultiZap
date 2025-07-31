// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {HTLCEscrow} from "../src/HTLCEscrow.sol";
import {HTLCEscrowFactory} from "../src/HTLCEscrowFactory.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract HTLCEscrowTest is Test {
    HTLCEscrowFactory factory;
    MockERC20 token;
    address maker;
    address taker;
    bytes32 secretHash;
    bytes secret;
    uint256 timelock;
    uint256 amount;
    bytes32 salt;

    event EscrowDeployed(
        address indexed escrow,
        address indexed deployer,
        bytes32 salt
    );
    event Claimed(address indexed taker, bytes32 secret);
    event Refunded(address indexed maker);

    function setUp() public {
        maker = address(1);
        taker = address(2);
        vm.label(maker, "Maker");
        vm.label(taker, "Taker");

        token = new MockERC20("MockToken", "MTK", 18);
        factory = new HTLCEscrowFactory();

        secret = bytes("topsecret");
        secretHash = keccak256(abi.encodePacked(secret));
        timelock = block.timestamp + 1 days;
        amount = 1000 ether;
        salt = keccak256(abi.encodePacked("custom-salt"));

        token.mint(maker, amount);
    }

    function testCreateEscrowEmitsEventAndDeploys() public {
        vm.startPrank(maker);
        token.approve(address(factory), amount);

        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        assertTrue(escrow != address(0), "Escrow was not deployed");

        vm.stopPrank();
    }

    function testClaimWithCorrectSecretTransfersFunds() public {
        vm.prank(maker);
        token.approve(address(factory), amount);

        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        vm.prank(taker);
        HTLCEscrow(escrow).claim(secret);

        assertEq(token.balanceOf(taker), amount, "Taker did not receive funds");
    }

    function testClaimFailsWithWrongSecret() public {
        vm.prank(maker);
        token.approve(address(factory), amount);
        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        vm.prank(taker);
        vm.expectRevert("Invalid secret");
        HTLCEscrow(escrow).claim("wrong");
    }

    function testRefundBeforeExpiryFails() public {
        vm.prank(maker);
        token.approve(address(factory), amount);
        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        vm.prank(maker);
        vm.expectRevert("Timelock not expired");
        HTLCEscrow(escrow).refund();
    }

    function testRefundAfterExpiryTransfersBackToMaker() public {
        vm.prank(maker);
        token.approve(address(factory), amount);
        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        vm.warp(timelock + 1);
        vm.prank(maker);
        HTLCEscrow(escrow).refund();

        assertEq(token.balanceOf(maker), amount, "Maker did not get refund");
    }

    function testCannotDoubleClaim() public {
        vm.prank(maker);
        token.approve(address(factory), amount);
        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        vm.prank(taker);
        HTLCEscrow(escrow).claim(secret);

        vm.prank(taker);
        vm.expectRevert("Already claimed or refunded");
        HTLCEscrow(escrow).claim(secret);
    }

    function testCannotDoubleRefund() public {
        vm.prank(maker);
        token.approve(address(factory), amount);
        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        vm.warp(timelock + 1);
        vm.prank(maker);
        HTLCEscrow(escrow).refund();

        vm.prank(maker);
        vm.expectRevert("Already claimed or refunded");
        HTLCEscrow(escrow).refund();
    }

    function testCannotClaimAfterRefund() public {
        vm.prank(maker);
        token.approve(address(factory), amount);
        address escrow = factory.deployEscrow(
            maker,
            taker,
            address(token),
            amount,
            secretHash,
            timelock,
            salt
        );

        vm.warp(timelock + 1);
        vm.prank(maker);
        HTLCEscrow(escrow).refund();

        vm.prank(taker);
        vm.expectRevert("Already claimed or refunded");
        HTLCEscrow(escrow).claim(secret);
    }

    event HTLCEscrowFactory__EscrowDeployed(
        address escrow,
        address token,
        address maker,
        bytes32 secretHash
    );
}
