// EVM Factory & Escrow ABIs
export const EVM_HTLC_FACTORY_ABI = [
  {
    "inputs": [
      { "name": "maker", "type": "address" },
      { "name": "taker", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "secretHash", "type": "bytes32" },
      { "name": "timelock", "type": "uint256" }
    ],
    "name": "deployEscrow",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "escrow", "type": "address" },
      { "indexed": true, "name": "maker", "type": "address" },
      { "indexed": true, "name": "taker", "type": "address" }
    ],
    "name": "EscrowDeployed",
    "type": "event"
  }
];

export const EVM_HTLC_ESCROW_ABI = [
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
      { "indexed": true, "name": "claimer", "type": "address" },
      { "indexed": false, "name": "secret", "type": "bytes32" }
    ],
    "name": "Claimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "refunder", "type": "address" }
    ],
    "name": "Refunded",
    "type": "event"
  }
];

// Starknet Factory & Escrow ABIs
export const STARKNET_HTLC_FACTORY_ABI = [
  {
    "type": "function",
    "name": "deploy_escrow",
    "inputs": [
      { "name": "maker", "type": "felt" },
      { "name": "taker", "type": "felt" },
      { "name": "token", "type": "felt" },
      { "name": "amount", "type": "Uint256" },
      { "name": "secret_hash", "type": "felt" },
      { "name": "timelock", "type": "felt" },
      { "name": "salt", "type": "felt" }
    ],
    "outputs": [{ "name": "address", "type": "felt" }]
  },
  {
    "type": "event",
    "name": "EscrowDeployed",
    "inputs": [
      { "name": "escrow", "type": "felt" },
      { "name": "maker", "type": "felt" },
      { "name": "taker", "type": "felt" }
    ]
  }
];

export const STARKNET_HTLC_ESCROW_ABI = [
  {
    "type": "function",
    "name": "claim",
    "inputs": [{ "name": "secret", "type": "felt" }],
    "outputs": []
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "event",
    "name": "Claimed",
    "inputs": [
      { "name": "claimer", "type": "felt" },
      { "name": "secret", "type": "felt" }
    ]
  },
  {
    "type": "event",
    "name": "Refunded",
    "inputs": [{ "name": "refunder", "type": "felt" }]
  }
];
