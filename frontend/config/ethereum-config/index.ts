// Ethereum Configuration
export const ETHEREUM_CONFIG = {
  HTLC_ESCROW_FACTORY: "0xFaA252Aa73E36216de5a30ADebC4F5902cd713F3", 
  HTLC_ESCROW: "", 
  
  USDC_TOKEN: "0x7ddA7FBe5CC89791791c284E0c55c6c7B75631fA", 
  
  
  HTLC_FACTORY_ABI: [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "escrow",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "deployer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "salt",
          "type": "bytes32"
        }
      ],
      "name": "EscrowDeployed",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_maker",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_taker",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_secretHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_timelock",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_salt",
          "type": "bytes32"
        }
      ],
      "name": "deployEscrow",
      "outputs": [
        {
          "internalType": "address",
          "name": "escrow",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_deployer",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "_salt",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "_constructorArgs",
          "type": "bytes"
        }
      ],
      "name": "predictEscrowAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "predicted",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const,

  // Contract ABI
  HTLC_ESCROW_ABI: [
    {
      "inputs": [],
      "name": "amount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes",
          "name": "_secret",
          "type": "bytes"
        }
      ],
      "name": "claim",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "claimed",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maker",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
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
      "inputs": [],
      "name": "refunded",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "secret",
      "outputs": [
        {
          "internalType": "bytes",
          "name": "",
          "type": "bytes"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "secretHash",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "taker",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "timelock",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "token",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "taker",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "secret",
          "type": "bytes"
        }
      ],
      "name": "Claimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "maker",
          "type": "address"
        }
      ],
      "name": "Refunded",
      "type": "event"
    }
  ] as const,
  
  ERC20_ABI: [
    {
      type: "function",
      name: "name",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "string", name: "" }],
    },
    {
      type: "function",
      name: "symbol",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "string", name: "" }],
    },
    {
      type: "function",
      name: "decimals",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint8", name: "" }],
    },
    {
      type: "function",
      name: "totalSupply",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint256", name: "" }],
    },
    {
      type: "function",
      name: "balanceOf",
      stateMutability: "view",
      inputs: [{ type: "address", name: "account" }],
      outputs: [{ type: "uint256", name: "" }],
    },
    {
      type: "function",
      name: "transfer",
      stateMutability: "nonpayable",
      inputs: [
        { type: "address", name: "to" },
        { type: "uint256", name: "amount" }
      ],
      outputs: [{ type: "bool", name: "" }],
    },
    {
      type: "function",
      name: "allowance",
      stateMutability: "view",
      inputs: [
        { type: "address", name: "owner" },
        { type: "address", name: "spender" }
      ],
      outputs: [{ type: "uint256", name: "" }],
    },
    {
      type: "function",
      name: "approve",
      stateMutability: "nonpayable",
      inputs: [
        { type: "address", name: "spender" },
        { type: "uint256", name: "amount" }
      ],
      outputs: [{ type: "bool", name: "" }],
    },
    {
      type: "function",
      name: "transferFrom",
      stateMutability: "nonpayable",
      inputs: [
        { type: "address", name: "from" },
        { type: "address", name: "to" },
        { type: "uint256", name: "amount" }
      ],
      outputs: [{ type: "bool", name: "" }],
    },
    // Events
    {
      type: "event",
      name: "Transfer",
      inputs: [
        { type: "address", name: "from", indexed: true },
        { type: "address", name: "to", indexed: true },
        { type: "uint256", name: "value", indexed: false },
      ],
    },
    {
      type: "event",
      name: "Approval",
      inputs: [
        { type: "address", name: "owner", indexed: true },
        { type: "address", name: "spender", indexed: true },
        { type: "uint256", name: "value", indexed: false },
      ],
    },
  ] as const,
  

} as const; 