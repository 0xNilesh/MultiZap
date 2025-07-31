// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./HTLCEscrow.sol";

/// @title HTLC Escrow Factory
/// @author ChatGPT
/// @notice Deploys new HTLC-based escrow contracts for atomic swaps
/// @dev Each escrow is deployed deterministically using create2 with a unique salt
contract HTLCEscrowFactory {
    /// @notice Emitted when a new HTLC escrow is deployed
    /// @param escrow Address of the deployed escrow
    /// @param deployer Address that deployed the escrow
    /// @param salt Unique salt used to create the escrow
    event EscrowDeployed(address indexed escrow, address indexed deployer, bytes32 salt);

    /// @notice Deploys a new HTLC escrow contract
    /// @dev The HTLC escrow is deployed using CREATE2, allowing deterministic addresses
    /// @param _maker Address that adds the tokens in the escrow as the maker of order
    /// @param _taker Address that can claim the tokens with the secret
    /// @param _token Address of the ERC20 token to be locked
    /// @param _amount Amount of tokens to lock
    /// @param _secretHash keccak256 hash of the secret
    /// @param _timelock Timestamp after which sender can reclaim funds
    /// @param _salt Unique salt to ensure unique escrow address
    /// @return escrow Address of the newly deployed escrow contract
    function deployEscrow(
        address _maker,
        address _taker,
        address _token,
        uint256 _amount,
        bytes32 _secretHash,
        uint256 _timelock,
        bytes32 _salt
    ) external returns (address escrow) {
        bytes memory bytecode = abi.encodePacked(
            type(HTLCEscrow).creationCode,
            abi.encode(
                _maker,
                _taker,
                _token,
                _amount,
                _secretHash,
                _timelock
            )
        );

        // Pull tokens from maker to factory in this contract
        require(IERC20(_token).transferFrom(_maker, address(this), _amount), "Token transfer failed");

        bytes32 finalSalt = keccak256(abi.encodePacked(msg.sender, _salt));
        assembly {
            escrow := create2(0, add(bytecode, 32), mload(bytecode), finalSalt)
            if iszero(extcodesize(escrow)) { revert(0, 0) }
        }

        (bool success) = IERC20(_token).transfer(escrow, _amount);
        require(success, "failed to transfer tokens from maker");

        emit EscrowDeployed(escrow, msg.sender, _salt);
    }

    /// @notice Predicts the address of an escrow before deployment
    /// @param _deployer Address of the escrow deployer (msg.sender)
    /// @param _salt Salt used to derive the deterministic address
    /// @param _constructorArgs Encoded constructor arguments
    /// @return predicted Address of the predicted escrow
    function predictEscrowAddress(
        address _deployer,
        bytes32 _salt,
        bytes memory _constructorArgs
    ) external view returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(type(HTLCEscrow).creationCode, _constructorArgs);
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), keccak256(abi.encodePacked(_deployer, _salt)), keccak256(bytecode))
        );
        predicted = address(uint160(uint256(hash)));
    }
}
