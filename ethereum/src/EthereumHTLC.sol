// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract EthereumHTLC {
    struct Lock {
        address token;
        address maker;
        address taker;
        uint256 amount;
        bytes32 hashlock;
        uint256 timelock; // unix timestamp
        bool withdrawn;
        bool refunded;
        bytes32 preimage;
    }

    mapping(bytes32 => Lock) public locks;

    event HTLCCreated(bytes32 indexed id, address indexed maker, address indexed taker, address token, uint256 amount, bytes32 hashlock, uint256 timelock);
    event HTLCClaimed(bytes32 indexed id, bytes32 preimage);
    event HTLCRefunded(bytes32 indexed id);

    /// @notice Create a new HTLC order and lock tokens
    /// @param _token ERC20 token address to lock
    /// @param _taker Address authorized to claim tokens with secret preimage
    /// @param _amount Amount of tokens to lock
    /// @param _hashlock Keccak256 hash of the secret preimage
    /// @param _timelock UNIX timestamp after which maker can refund
    /// @param _salt Random nonce to make unique lock ID
    function createHTLC(
        address _token,
        address _taker,
        uint256 _amount,
        bytes32 _hashlock,
        uint256 _timelock,
        bytes32 _salt
    ) external returns (bytes32 id) {
        require(_amount > 0, "Amount must be > 0");
        require(_timelock > block.timestamp, "Timelock must be in future");
        require(_taker != address(0), "Taker address required");

        // Generate unique id for this lock/order
        id = keccak256(abi.encodePacked(msg.sender, _taker, _token, _amount, _hashlock, _timelock, _salt));
        require(locks[id].maker == address(0), "Lock already exists");

        // Transfer tokens into contract
        require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "TransferFrom failed");

        // Create lock
        locks[id] = Lock({
            token: _token,
            maker: msg.sender,
            taker: _taker,
            amount: _amount,
            hashlock: _hashlock,
            timelock: _timelock,
            withdrawn: false,
            refunded: false,
            preimage: bytes32(0)
        });

        emit HTLCCreated(id, msg.sender, _taker, _token, _amount, _hashlock, _timelock);
    }

    /// @notice Claim tokens by providing the correct secret preimage
    /// @param _id Lock/order ID to claim
    /// @param _preimage Secret preimage that hashes to hashlock
    function claim(bytes32 _id, bytes32 _preimage) external {
        Lock storage lock = locks[_id];
        require(lock.taker == msg.sender, "Only taker can claim");
        require(!lock.withdrawn, "Already withdrawn");
        require(!lock.refunded, "Already refunded");
        require(keccak256(abi.encodePacked(_preimage)) == lock.hashlock, "Invalid secret preimage");

        lock.withdrawn = true;
        lock.preimage = _preimage;

        require(IERC20(lock.token).transfer(lock.taker, lock.amount), "Token transfer failed");

        emit HTLCClaimed(_id, _preimage);
    }

    /// @notice Refund tokens to maker after timelock expires if not claimed
    /// @param _id Lock/order ID to refund
    function refund(bytes32 _id) external {
        Lock storage lock = locks[_id];
        require(lock.maker == msg.sender, "Only maker can refund");
        require(!lock.withdrawn, "Already withdrawn");
        require(!lock.refunded, "Already refunded");
        require(block.timestamp >= lock.timelock, "Timelock not yet expired");

        lock.refunded = true;

        require(IERC20(lock.token).transfer(lock.maker, lock.amount), "Token transfer failed");

        emit HTLCRefunded(_id);
    }

    /// @notice View details of a lock/order
    function getLock(bytes32 _id) external view returns (Lock memory) {
        return locks[_id];
    }
}
