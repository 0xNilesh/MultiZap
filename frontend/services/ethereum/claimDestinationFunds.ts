import {
  useWriteContract,
  useAccount,
  useChainId,
} from "wagmi";
import { ETHEREUM_CONFIG } from "@/config/ethereum-config";
import { ethers } from "ethers";

export function useClaimDestinationFunds() {
  const { address } = useAccount();
  
  const { 
    data, 
    isPending,
    writeContractAsync,
    error
  } = useWriteContract();

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
      
      
      const txhash = await writeContractAsync({
        address: targetAddress as `0x${string}`,
        abi: ETHEREUM_CONFIG.HTLC_ESCROW_ABI,
        functionName: 'claim',
        args: [secret as `0x${string}`],
      });
      
      console.log("🔍 Claim transaction hash:", txhash);
      return txhash;
      
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