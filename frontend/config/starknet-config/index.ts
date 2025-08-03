// Starknet Configuration

import type { Abi } from "starknet";

export const STARKNET_CONFIG = {
  HTLC_ESCROW_FACTORY: "0x01248c99473439e9e79518adff2ba5e645122591571f096f8f6cc003cc0d4d9a", 
  HTLC_ESCROW: "", 
  
  USDC_TOKEN: "0x02b2907cf7c978abfd26bd8e92204ba7303743ba5a7107ca7012dace168ab0cf", // USDC Token
  
  // Factory ABI
  HTLC_FACTORY_ABI: [
    {
      "type": "function",
      "name": "deploy_escrow",
      "inputs": [
        {
          "name": "maker",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        {
          "name": "taker",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        {
          "name": "token",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        { "name": "amount", "type": "core::integer::u256" },
        { "name": "secret_hash", "type": "core::integer::u256" },
        { "name": "timelock", "type": "core::integer::u64" },
        { "name": "salt", "type": "core::felt252" }
      ],
      "outputs": [
        { "type": "core::starknet::contract_address::ContractAddress" }
      ],
      "state_mutability": "external"
    },
    {
      "type": "function",
      "name": "get_escrow_class_hash",
      "inputs": [],
      "outputs": [{ "type": "core::starknet::class_hash::ClassHash" }],
      "state_mutability": "view"
    }
  ] as const,

  // Contract ABI
  HTLC_ESCROW_ABI: [
    {
      "type": "impl",
      "name": "HTLCEscrow",
      "interface_name": "starknet_htlc::htlc_escrow::htlc_escrow::IHTLCEscrow"
    },
    {
      "type": "struct",
      "name": "core::byte_array::ByteArray",
      "members": [
        {
          "name": "data",
          "type": "core::array::Array::<core::bytes_31::bytes31>"
        },
        {
          "name": "pending_word",
          "type": "core::felt252"
        },
        {
          "name": "pending_word_len",
          "type": "core::integer::u32"
        }
      ]
    },
    {
      "type": "struct",
      "name": "core::integer::u256",
      "members": [
        {
          "name": "low",
          "type": "core::integer::u128"
        },
        {
          "name": "high",
          "type": "core::integer::u128"
        }
      ]
    },
    {
      "type": "interface",
      "name": "starknet_htlc::htlc_escrow::htlc_escrow::IHTLCEscrow",
      "items": [
        {
          "type": "function",
          "name": "claim",
          "inputs": [
            {
              "name": "secret",
              "type": "core::byte_array::ByteArray"
            }
          ],
          "outputs": [],
          "state_mutability": "external"
        },
        {
          "type": "function",
          "name": "refund",
          "inputs": [],
          "outputs": [],
          "state_mutability": "external"
        },
        {
          "type": "function",
          "name": "get_maker_address",
          "inputs": [],
          "outputs": [
            {
              "type": "core::starknet::contract_address::ContractAddress"
            }
          ],
          "state_mutability": "view"
        },
        {
          "type": "function",
          "name": "get_taker_address",
          "inputs": [],
          "outputs": [
            {
              "type": "core::starknet::contract_address::ContractAddress"
            }
          ],
          "state_mutability": "view"
        },
        {
          "type": "function",
          "name": "get_token_address",
          "inputs": [],
          "outputs": [
            {
              "type": "core::starknet::contract_address::ContractAddress"
            }
          ],
          "state_mutability": "view"
        },
        {
          "type": "function",
          "name": "get_amount",
          "inputs": [],
          "outputs": [
            {
              "type": "core::integer::u256"
            }
          ],
          "state_mutability": "view"
        },
        {
          "type": "function",
          "name": "get_secret_hash",
          "inputs": [],
          "outputs": [
            {
              "type": "core::integer::u256"
            }
          ],
          "state_mutability": "view"
        },
        {
          "type": "function",
          "name": "get_timelock",
          "inputs": [],
          "outputs": [
            {
              "type": "core::integer::u64"
            }
          ],
          "state_mutability": "view"
        },
        {
          "type": "function",
          "name": "get_keccak_hash",
          "inputs": [
            {
              "name": "secret",
              "type": "core::byte_array::ByteArray"
            }
          ],
          "outputs": [
            {
              "type": "core::integer::u256"
            }
          ],
          "state_mutability": "view"
        },
        {
          "type": "function",
          "name": "get_keccak_hash_felt252",
          "inputs": [
            {
              "name": "secret",
              "type": "core::byte_array::ByteArray"
            }
          ],
          "outputs": [
            {
              "type": "(core::felt252, core::felt252)"
            }
          ],
          "state_mutability": "view"
        }
      ]
    },
    {
      "type": "constructor",
      "name": "constructor",
      "inputs": [
        {
          "name": "maker",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        {
          "name": "taker",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        {
          "name": "token",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        {
          "name": "amount",
          "type": "core::integer::u256"
        },
        {
          "name": "secret_hash",
          "type": "core::integer::u256"
        },
        {
          "name": "timelock",
          "type": "core::integer::u64"
        }
      ]
    },
    {
      "type": "event",
      "name": "starknet_htlc::htlc_escrow::htlc_escrow::Claimed",
      "kind": "struct",
      "members": [
        {
          "name": "taker",
          "type": "core::starknet::contract_address::ContractAddress",
          "kind": "key"
        },
        {
          "name": "amount",
          "type": "core::integer::u256",
          "kind": "data"
        },
        {
          "name": "secret",
          "type": "core::byte_array::ByteArray",
          "kind": "data"
        }
      ]
    },
    {
      "type": "event",
      "name": "starknet_htlc::htlc_escrow::htlc_escrow::Refunded",
      "kind": "struct",
      "members": [
        {
          "name": "maker",
          "type": "core::starknet::contract_address::ContractAddress",
          "kind": "key"
        },
        {
          "name": "amount",
          "type": "core::integer::u256",
          "kind": "data"
        }
      ]
    },
    {
      "type": "event",
      "name": "starknet_htlc::htlc_escrow::htlc_escrow::Event",
      "kind": "enum",
      "variants": [
        {
          "name": "Claimed",
          "type": "starknet_htlc::htlc_escrow::htlc_escrow::Claimed",
          "kind": "nested"
        },
        {
          "name": "Refunded",
          "type": "starknet_htlc::htlc_escrow::htlc_escrow::Refunded",
          "kind": "nested"
        }
      ]
    }
  ] as const  satisfies Abi,
  
  // Token ABI
  ERC20_ABI: [
    {
      "type": "function",
      "name": "approve",
      "inputs": [
        {
          "name": "spender",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        { "name": "amount", "type": "core::integer::u256" }
      ],
      "outputs": [{ "type": "core::bool" }],
      "state_mutability": "external"
    },
    {
      "type": "function",
      "name": "balanceOf",
      "inputs": [
        {
          "name": "account",
          "type": "core::starknet::contract_address::ContractAddress"
        }
      ],
      "outputs": [{ "type": "core::integer::u256" }],
      "state_mutability": "view"
    },
    {
      "type": "function",
      "name": "allowance",
      "inputs": [
        {
          "name": "owner",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        {
          "name": "spender",
          "type": "core::starknet::contract_address::ContractAddress"
        }
      ],
      "outputs": [{ "type": "core::integer::u256" }],
      "state_mutability": "view"
    },
    {
      "type": "function",
      "name": "transfer",
      "inputs": [
        {
          "name": "recipient",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        { "name": "amount", "type": "core::integer::u256" }
      ],
      "outputs": [{ "type": "core::bool" }],
      "state_mutability": "external"
    },
    {
      "type": "function",
      "name": "transferFrom",
      "inputs": [
        {
          "name": "sender",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        {
          "name": "recipient",
          "type": "core::starknet::contract_address::ContractAddress"
        },
        { "name": "amount", "type": "core::integer::u256" }
      ],
      "outputs": [{ "type": "core::bool" }],
      "state_mutability": "external"
    },
    {
      "type": "function",
      "name": "name",
      "inputs": [],
      "outputs": [{ "type": "core::byte_array::ByteArray" }],
      "state_mutability": "view"
    },
    {
      "type": "function",
      "name": "symbol",
      "inputs": [],
      "outputs": [{ "type": "core::byte_array::ByteArray" }],
      "state_mutability": "view"
    },
    {
      "type": "function",
      "name": "decimals",
      "inputs": [],
      "outputs": [{ "type": "core::integer::u8" }],
      "state_mutability": "view"
    },
    {
      "type": "function",
      "name": "totalSupply",
      "inputs": [],
      "outputs": [{ "type": "core::integer::u256" }],
      "state_mutability": "view"
    }
  ] as const,
  

} as const; 