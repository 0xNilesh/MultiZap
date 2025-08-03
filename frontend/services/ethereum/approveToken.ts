import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract
} from "wagmi";
import { ETHEREUM_CONFIG } from "@/config/ethereum-config";
import { ethers } from "ethers";
import { useState } from "react";

export function useApproveToken() {
  const { address } = useAccount();
  
  const { 
    data, 
    isPending,
    writeContractAsync ,
    error
  } = useWriteContract()

  const approveToken = async (tokenAddress: string, spenderAddress: string, amount: bigint): Promise<string> => {
    if (!address) {
      throw new Error("Address not available");
    }

    try {

      const txhash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: ETHEREUM_CONFIG.ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, amount],
      })      
      
      // Return a placeholder hash since we can't get the actual hash from sendTransaction
      return txhash;
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  const approveUSDC = async (amount: bigint = 2n ** 256n - 1n): Promise<string> => {
    return approveToken(ETHEREUM_CONFIG.USDC_TOKEN, ETHEREUM_CONFIG.HTLC_ESCROW_FACTORY, amount);
  };

  const approveUSDCToMax = async (): Promise<string> => {
    return approveUSDC(2n ** 256n - 1n);
  };

  return {
    approveToken,
    approveUSDC,
    approveUSDCToMax,
    isPending,
    error,
    isReady: !!address,
  };
} 