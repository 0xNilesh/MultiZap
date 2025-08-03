import {
  useSendTransaction,
  useContract,
  useAccount,
} from "@starknet-react/core";
import type { Abi } from "starknet";
import { STARKNET_CONFIG } from "@/config/starknet-config";

export function useApproveToken() {
  const { address } = useAccount();
  
  // COMMENTED OUT OLD VERSION
  // const { send, error, isPending } = useSendTransaction({
  //   calls: undefined,
  // });

  // const approveToken = async (tokenAddress: string, spenderAddress: string, amount: bigint) => {
  //   if (!address) {
  //     throw new Error("Address not available");
  //   }

  //   try {
  //     // For Starknet u256, we need to split into low and high parts
  //     const low = amount & ((1n << 128n) - 1n);
  //     const high = amount >> 128n;
      
  //     // For Starknet, we need to populate the approve call
  //     const approveCall = {
  //       contractAddress: tokenAddress as `0x${string}`,
  //       entrypoint: "approve",
  //       calldata: [spenderAddress, low.toString(), high.toString()],
  //     };
      
  //     await send([approveCall]);
  //   } catch (error) {
  //     console.error("Error approving token:", error);
  //     throw error;
  //   }
  // };

  // const approveUSDC = async (amount: bigint = 1000000n) => {
  //   return approveToken(STARKNET_CONFIG.USDC_TOKEN, STARKNET_CONFIG.HTLC_ESCROW_FACTORY, amount);
  // };

  // const approveUSDCToMax = async () => {
  //   return approveUSDC(1000000n);
  // };

  // return {
  //   approveToken,
  //   approveUSDC,
  //   approveUSDCToMax,
  //   isPending,
  //   error,
  //   isReady: !!address,
  // };

  // NEW VERSION USING sendAsync
  const { sendAsync, error, isPending } = useSendTransaction({
    calls: undefined,
  });

  const approveToken = async (tokenAddress: string, spenderAddress: string, amount: bigint): Promise<string> => {
    if (!address) {
      throw new Error("Address not available");
    }

    try {
      // For Starknet u256, we need to split into low and high parts
      const low = amount & ((1n << 128n) - 1n);
      const high = amount >> 128n;
      
      // For Starknet, we need to populate the approve call
      const approveCall = {
        contractAddress: tokenAddress as `0x${string}`,
        entrypoint: "approve",
        calldata: [spenderAddress, low.toString(), high.toString()],
      };
      
      const result = await sendAsync([approveCall]);
      console.log("🔍 sendAsync result:", result);
      
      // Return the transaction hash
      return result.transaction_hash || "";
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  const approveUSDC = async (amount: bigint): Promise<string> => {
    return approveToken(STARKNET_CONFIG.USDC_TOKEN, STARKNET_CONFIG.HTLC_ESCROW_FACTORY, amount);
  };

  // const approveUSDCToMax = async (): Promise<string> => {
  //   return approveUSDC(1000000n);
  // };

  return {
    approveToken,
    approveUSDC,
    isPending,
    error,
    isReady: !!address,
  };
} 