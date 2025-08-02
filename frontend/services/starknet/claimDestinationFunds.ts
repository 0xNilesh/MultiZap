import {
  useSendTransaction,
  useContract,
  useNetwork,
  useAccount,
} from "@starknet-react/core";
import type { Abi } from "starknet";
import { STARKNET_CONFIG } from "@/config/starknet-config";

export function useClaimDestinationFunds() {
  const { address } = useAccount();
  const { chain } = useNetwork();
  
  const { contract } = useContract({ 
    abi: STARKNET_CONFIG.HTLC_ESCROW_ABI as Abi, 
    address: STARKNET_CONFIG.HTLC_ESCROW as `0x${string}`, 
  }); 
 
  const { send, error, isPending } = useSendTransaction({
    calls: contract && address 
      ? [contract.populate("claim", [""])] // TODO: Add secret parameter
      : undefined,
  });

  const claimFunds = async (secret: string) => {
    if (!contract || !address) {
      throw new Error("Contract or address not available");
    }

    try {
      // Convert secret to ByteArray format for Starknet
      const secretBytes = new TextEncoder().encode(secret);
      
      // For Starknet, we pass the bytes directly as a string
      await send([contract.populate("claim", [secretBytes])]);
    } catch (error) {
      console.error("Error claiming funds:", error);
      throw error;
    }
  };

  return {
    claimFunds,
    isPending,
    error,
    isReady: !!contract && !!address,
  };
} 