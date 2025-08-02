import {
  useSendTransaction,
  useContract,
  useAccount,
} from "@starknet-react/core";
import type { Abi } from "starknet";
import { STARKNET_CONFIG } from "@/config/starknet-config";
import { useState } from "react";
import { cairo } from "starknet";

// Function to convert string to ByteArray format for Starknet
// function toByteArray(str: string): bigint[] {
//   const encoder = new TextEncoder();
//   const bytes = encoder.encode(str); // Uint8Array
//   const arr: bigint[] = [BigInt(bytes.length)];
//   for (const b of bytes) arr.push(BigInt(b));
//   console.log("🔍 toByteArray:", [arr]);
//   return arr;
// }


function hexToByteArray(hex: string): number[] {
    if (hex.startsWith("0x")) hex = hex.slice(2);
    if (hex.length % 2 === 1) hex = "0" + hex;
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return bytes;
  }

function toByteArrayStruct(str: string) {
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(str)); // [109,121,...]
    return {
      len: bytes.length,                 // number, not "0x11"
      data: bytes.map((b) => b)          // array of numbers
    };
  }

  function asciiToFelt(str: string): `0x${string}` {
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(str)); // uint8 array
    if (bytes.length > 31) {
      throw new Error("String too long to pack into single felt; hash it instead");
    }
    let acc = 0n;
    for (const b of bytes) {
      acc = (acc << 8n) + BigInt(b);
    }
    return `0x${acc.toString(16)}` as `0x${string}`;
  }

  

  // secret should be a string like "0xabcdef"
function makeSecretParam(secret: string): [`0`, `0x${string}`, `${string}`] {
    // keep the "0x" prefix as part of the string
    const str = secret;
    const encoder = new TextEncoder();
    const bytes = Array.from(encoder.encode(str)); // ASCII bytes of "0xabcdef"
  
    // pack bytes into hex felt
    let hex = "";
    for (const b of bytes) {
      hex += b.toString(16).padStart(2, "0");
    }
    const dataFelt = `0x${hex}` as `0x${string}`;
    const lenFelt = `${bytes.length.toString(16)}` as `0x${string}`;
  
    return ["0", dataFelt, lenFelt];
  }
  
  
  
  
export function useClaimDestinationFunds() {
  const { address } = useAccount();
  const [escrowAddress, setEscrowAddress] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  
  const { contract } = useContract({
    abi: STARKNET_CONFIG.HTLC_ESCROW_ABI as Abi,
    address: escrowAddress as `0x${string}`,
  });
  const secret1 = asciiToFelt(secret);


  const { send, error, isPending } = useSendTransaction({
    calls: contract && address && secret
      ? [contract.populate("claim", ["1","0x3078616263646566","8"])]
      : undefined,
  });
  

  console.log("🔍 useClaimDestinationFunds hook initialized");
  console.log("🔍 address:", address);
  console.log("🔍 escrowAddress:", escrowAddress);
  console.log("🔍 secret:", secret);
  console.log("🔍 contract:", !!contract);
  console.log("🔍 send function:", !!send);
  console.log("🔍 isPending:", isPending);
  console.log("🔍 error:", error);

  const claimDestinationFunds = async (): Promise<string> => {
    console.log("🔍 claimDestinationFunds called");
    console.log("🔍 address available:", !!address);
    console.log("🔍 send function available:", !!send);
    console.log("🔍 escrowAddress set:", escrowAddress);
    console.log("🔍 secret set:", secret);
    
    if (!address) {
      throw new Error("Address not available");
    }

    if (!send) {
      throw new Error("Send function not available");
    }

    if (!escrowAddress) {
      throw new Error("Escrow address not set");
    }

    if (!secret) {
      throw new Error("Secret not set");
    }

    try {
      console.log("🔍 About to call send() directly");
      
      const result = await send();
      console.log("🔍 send() result:", result);
      
      // Return dummy hash for now since send() returns void
      return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    } catch (error) {
      console.error("Error claiming funds:", error);
      throw error;
    }
  };

  return {
    claimDestinationFunds,
    setEscrowAddress,
    setSecret,
    isPending,
    error,
    isReady: !!address,
  };
} 