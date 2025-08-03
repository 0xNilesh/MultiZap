import {
  useSendTransaction,
  useContract,
  useAccount,
} from "@starknet-react/core";
import { STARKNET_CONFIG } from "@/config/starknet-config";
import { useState } from "react";
import { cairo , } from "starknet";
import type { Abi } from "starknet";

// Helper function to convert string to ByteArray format for Starknet
function stringToByteArray(str: string): { len: string, data: string } {
  const encoder = new TextEncoder();
  const bytes = Array.from(encoder.encode(str)); // e.g., "0xabcdef" -> [48,120,97,98,99,100,101,102]
  
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  const dataHex = `0x${hex}`; // "0x3078616263646566"
  const lenHex = bytes.length.toString(16); // "8"
  
  return {
    len: lenHex,
    data: dataHex
  };
}

export function useClaimDestinationFunds() {
  const { address } = useAccount();
  
  const { sendAsync, error, isPending } = useSendTransaction({
    calls: undefined,
  });

  const claimDestinationFunds = async (escrowAddress: string, secret: string): Promise<string> => {
    if (!address) {
      throw new Error("Address not available");
    }

    if (!sendAsync) {
      throw new Error("Send function not available");
    }

    if (!escrowAddress) {
      throw new Error("Escrow address not provided");
    }

    if (!secret) {
      throw new Error("Secret not provided");
    }

    try {
      console.log("🔍 About to call sendAsync with claim call");
      console.log("🔍 Escrow address:", escrowAddress);
      console.log("🔍 Secret:", secret);
      
      // Convert secret to ByteArray format
      const byteArray = stringToByteArray(secret);
      console.log("🔍 ByteArray:", byteArray);
      
      // Create the claim call with the correct format
      const claimCall = {
        contractAddress: escrowAddress as `0x${string}`,
        entrypoint: "claim",
        calldata: ["0", byteArray.data, byteArray.len], // ["0", "0x3078616263646566", "8"]
      };
      
      console.log("🔍 Claim call:", claimCall);
      
      const result = await sendAsync([claimCall]);
      console.log("🔍 sendAsync result:", result);
      
      // Wait for transaction to be confirmed
      if (result.transaction_hash) {
        console.log("🔍 Waiting for transaction confirmation...");
        
        // Poll for transaction status
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        const pollInterval = 1000; // 1 second intervals
        
        while (attempts < maxAttempts) {
          try {
            // You might want to implement a proper transaction status check here
            // For now, we'll just wait a bit and return the hash
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
            
            // In a real implementation, you would check the transaction status
            // For now, we'll assume it's confirmed after a few seconds
            if (attempts >= 3) {
              console.log("🔍 Transaction confirmed (simulated)");
              break;
            }
          } catch (error) {
            console.error("Error checking transaction status:", error);
            break;
          }
        }
        
        return result.transaction_hash;
      }
      
      // Fallback if no transaction hash
      return "";
    } catch (error) {
      console.error("Error claiming funds:", error);
      throw error;
    }
  };

  return {
    claimDestinationFunds,
    isPending,
    error,
    isReady: !!address,
  };
} 