import {
  useSendTransaction,
  useAccount,
  useChainId,
} from "wagmi";
import { ETHEREUM_CONFIG } from "@/config/ethereum-config";
import { ethers } from "ethers";

export function useClaimDestinationFunds() {
  const { address } = useAccount();
  
  const { sendTransaction, error, isPending } = useSendTransaction();

  const claimFunds = async (secret: string) => {
    if (!address) {
      throw new Error("Address not available");
    }

    try {
      // Convert secret to bytes for Ethereum
      const secretBytes = new TextEncoder().encode(secret);
      
      // Create contract interface for function encoding
      const contractInterface = new ethers.Interface(ETHEREUM_CONFIG.HTLC_ESCROW_ABI);
      
      // Encode the claim function call
      const encodedData = contractInterface.encodeFunctionData("claim", [secretBytes]);
      
      await sendTransaction({
        to: ETHEREUM_CONFIG.HTLC_ESCROW as `0x${string}`,
        data: encodedData as `0x${string}`,
      });
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
  };
} 