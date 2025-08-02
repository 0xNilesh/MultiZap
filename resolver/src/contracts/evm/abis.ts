export const evmFactoryAbi = [
  {
    "inputs": [
      { "name": "maker", "type": "address" },
      { "name": "taker", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "secretHash", "type": "bytes32" },
      { "name": "timelock", "type": "uint256" },
      { "name": "salt", "type": "bytes32" }
    ],
    "name": "deployEscrow",
    "outputs": [{ "name": "escrow", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "escrow", "type": "address" },
      { "indexed": true, "name": "deployer", "type": "address" },
      { "indexed": false, "name": "salt", "type": "bytes32" }
    ],
    "name": "EscrowDeployed",
    "type": "event"
  }
] as const;

export const evmEscrowAbi = [
  {
    "inputs": [{ "name": "secret", "type": "bytes32" }],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "taker", "type": "address" },
      { "indexed": false, "name": "secret", "type": "bytes32" }
    ],
    "name": "Claimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "maker", "type": "address" }
    ],
    "name": "Refunded",
    "type": "event"
  }
] as const;

export const erc20Abi = [
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
