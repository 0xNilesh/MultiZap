import {
  useWriteContract,
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ETHEREUM_CONFIG } from "@/config/ethereum-config";
import { ethers } from "ethers";
import { useState } from "react";

export function useClaimDestinationFunds() {
  const { address } = useAccount();
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  
  const { writeContract, error, isPending, data: hash } = useWriteContract();
  
  // Wait for transaction receipt when we have a hash
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: pendingHash as `0x${string}`,
  });

  const claimFunds = async (secret: string, escrowAddress?: string): Promise<string> => {
    if (!address) {
      throw new Error("Address not available");
    }

    try {
      // Use the provided escrow address or fall back to the default contract
      const targetAddress = escrowAddress || ETHEREUM_CONFIG.HTLC_ESCROW;
      
      // Convert secret to bytes for Ethereum
      const secretBytes = new TextEncoder().encode(secret);
      const secretHex = '0x' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Send the transaction
      writeContract({
        address: targetAddress as `0x${string}`,
        abi: ETHEREUM_CONFIG.HTLC_ESCROW_ABI,
        functionName: 'claim',
        args: [secretHex as `0x${string}`],
      });
      
      // Set the pending hash to track the transaction
      if (hash) {
        setPendingHash(hash);
        return hash;
      }
      
      // If no hash immediately available, return a placeholder
      return "0x..." // Will be updated when transaction is sent
    } catch (error) {
      console.error("Error claiming funds:", error);
      throw error;
    }
  };



  return {
    claimFunds,
    isPending,
    error,
    isReady: !!address,
    receipt,
    pendingHash,
  };
} 