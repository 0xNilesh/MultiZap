// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title HTLCEscrow
 * @notice Hashed Timelock Contract (HTLC) escrow for atomic swaps.
 * Deploy a new instance of this contract for every order/swap via a factory.
 */
contract HTLCEscrow {
    address public immutable maker;
    address public immutable taker;
    address public immutable token;
    uint256 public immutable amount;
    bytes32 public immutable secretHash;
    uint256 public immutable timelock; // UNIX timestamp after which funds can be refunded

    bool public claimed;
    bool public refunded;
    bytes public secret;

    event Locked(address indexed maker, address indexed taker, address indexed token, uint256 amount, bytes32 secretHash, uint256 timelock);
    event Claimed(address indexed taker, bytes secret);
    event Refunded(address indexed maker);

    /**
     * @dev Deploys a new HTLC instance.
     * @param _maker Address of the maker (sender of funds)
     * @param _taker Address of the taker (receiver of funds upon revealing secret)
     * @param _token ERC20 token address to be used in the swap
     * @param _amount Amount of tokens to lock
     * @param _secretHash Hash of the secret (i.e., keccak256(secret))
     * @param _timelock Timestamp after which the maker can refund if not claimed
     */
    constructor(
        address _maker,
        address _taker,
        address _token,
        uint256 _amount,
        bytes32 _secretHash,
        uint256 _timelock
    ) {
        require(_timelock > block.timestamp, "Timelock must be in the future");
        require(_maker != address(0) && _taker != address(0), "Zero address");

        maker = _maker;
        taker = _taker;
        token = _token;
        amount = _amount;
        secretHash = _secretHash;
        timelock = _timelock;

        emit Locked(_maker, _taker, _token, _amount, _secretHash, _timelock);
    }

    /**
     * @notice Claim the locked tokens by revealing the correct secret.
     * @param _secret The pre-image of the hashlock (i.e., secret such that keccak256(secret) == secretHash)
     */
    function claim(bytes calldata _secret) external {
        require(msg.sender == taker, "Not taker");
        require(!claimed && !refunded, "Already claimed or refunded");
        require(keccak256(_secret) == secretHash, "Invalid secret");

        claimed = true;
        secret = _secret;

        require(IERC20(token).transfer(taker, amount), "Token transfer failed");
        emit Claimed(taker, _secret);
    }

    /**
     * @notice Refund the tokens to the maker after the timelock has passed and if not claimed.
     */
    function refund() external {
        require(msg.sender == maker, "Not maker");
        require(!claimed && !refunded, "Already claimed or refunded");
        require(block.timestamp >= timelock, "Timelock not expired");

        refunded = true;

        require(IERC20(token).transfer(maker, amount), "Token refund failed");
        emit Refunded(maker);
    }
}
