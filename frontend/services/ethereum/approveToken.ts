import {
  useSendTransaction,
  useAccount,
  useChainId,
} from "wagmi";
import { ETHEREUM_CONFIG } from "@/config/ethereum-config";
import { ethers } from "ethers";

export function useApproveToken() {
  const { address } = useAccount();
  const chainId = useChainId();
  
  const { sendTransaction, error, isPending } = useSendTransaction();

  const approveToken = async (tokenAddress: string, spenderAddress: string, amount: bigint) => {
    if (!address) {
      throw new Error("Address not available");
    }

    try {
      // Create contract interface for function encoding
      const contractInterface = new ethers.Interface(ETHEREUM_CONFIG.ERC20_ABI);
      
      // Encode the approve function call
      const encodedData = contractInterface.encodeFunctionData("approve", [spenderAddress, amount]);
      
      await sendTransaction({
        to: tokenAddress as `0x${string}`,
        data: encodedData as `0x${string}`,
      });
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  const approveUSDC = async (amount: bigint = 2n ** 256n - 1n) => {
    return approveToken(ETHEREUM_CONFIG.USDC_TOKEN, ETHEREUM_CONFIG.HTLC_ESCROW_FACTORY, amount);
  };

  const approveUSDCToMax = async () => {
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