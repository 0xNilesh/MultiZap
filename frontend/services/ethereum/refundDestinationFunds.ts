import {
  useSendTransaction,
  useAccount,
  useChainId,
} from "wagmi";
import { ETHEREUM_CONFIG } from "@/config/ethereum-config";
import { ethers } from "ethers";

export function useRefundDestinationFunds() {
  const { address } = useAccount();
  const chainId = useChainId();
  
  const { sendTransaction, error, isPending } = useSendTransaction();

  const refundFunds = async () => {
    if (!address) {
      throw new Error("Address not available");
    }

    try {
      // Create contract interface for function encoding
      const contractInterface = new ethers.Interface(ETHEREUM_CONFIG.HTLC_ESCROW_ABI);
      
      // Encode the refund function call
      const encodedData = contractInterface.encodeFunctionData("refund", []);
      
      await sendTransaction({
        to: ETHEREUM_CONFIG.HTLC_ESCROW as `0x${string}`,
        data: encodedData as `0x${string}`,
      });
    } catch (error) {
      console.error("Error refunding funds:", error);
      throw error;
    }
  };

  return {
    refundFunds,
    isPending,
    error,
    isReady: !!address,
  };
} 