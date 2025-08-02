import {
  useSendTransaction,
  useContract,
  useNetwork,
  useAccount,
} from "@starknet-react/core";
import type { Abi } from "starknet";
import { STARKNET_CONFIG } from "@/config/starknet-config";

export function useRefundDestinationFunds() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  
  const { contract } = useContract({ 
    abi: STARKNET_CONFIG.HTLC_ESCROW_ABI as Abi, 
    address: STARKNET_CONFIG.HTLC_ESCROW as `0x${string}`, 
  }); 
 
  const { send, error, isPending } = useSendTransaction({
    calls: contract && address 
      ? [contract.populate("refund", [])]
      : undefined,
  });

  const refundFunds = async () => {
    if (!contract || !address) {
      throw new Error("Contract or address not available");
    }

    try {
      await send([contract.populate("refund", [])]);
    } catch (error) {
      console.error("Error refunding funds:", error);
      throw error;
    }
  };

  return {
    refundFunds,
    isPending,
    error,
    isReady: !!contract && !!address,
  };
} 