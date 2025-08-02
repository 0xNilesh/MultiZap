import { ethers, EventLog, keccak256, toUtf8Bytes } from "ethers";
import {
  Account,
  CallData,
  Contract,
  Provider,
  RpcProvider,
  cairo,
  hash,
  provider,
  stark,
  uint256,
} from "starknet";
import env from "../config/env";
import logger from "../utils/logger";
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from "../config/contracts";

// Import contract ABIs
import { evmFactoryAbi, evmEscrowAbi, erc20Abi } from "../contracts/evm/abis";
import {
  starknetFactoryAbi,
  starknetEscrowAbi,
  starknetErc20Abi,
} from "../contracts/starknet/abis";

const normalizeAddress = (addr: string) =>
  BigInt(addr).toString(16).padStart(64, "0");

export class ContractService {
  private evmProvider: ethers.JsonRpcProvider;
  private evmWallet: ethers.Wallet;
  private starknetProvider: RpcProvider;
  private starknetAccount: Account;
  private evmFactory: ethers.Contract;
  private starknetFactory: Contract;

  constructor() {
    // Initialize EVM provider and wallet
    this.evmProvider = new ethers.JsonRpcProvider(env.EVM_RPC_URL);
    this.evmWallet = new ethers.Wallet(env.EVM_PRIVATE_KEY, this.evmProvider);

    // Initialize Starknet provider and account
    this.starknetProvider = new RpcProvider({ nodeUrl: env.STARKNET_RPC_URL });
    this.starknetAccount = new Account({
      provider: this.starknetProvider,
      address: env.STARKNET_ACCOUNT_ADDRESS,
      signer: env.STARKNET_PRIVATE_KEY,
    });

    // Initialize contract instances
    this.evmFactory = new ethers.Contract(
      CONTRACT_ADDRESSES.EVM.FACTORY,
      evmFactoryAbi,
      this.evmWallet
    );

    // Initialize Starknet factory
    this.starknetFactory = new Contract({
      abi: starknetFactoryAbi,
      address: CONTRACT_ADDRESSES.STARKNET.FACTORY,
      providerOrAccount: this.starknetAccount,
    });
  }

  async approveEvmToken(token: string, amount: string): Promise<void> {
    try {
      logger.info("Approving EVM token...");
      const tokenContract = new ethers.Contract(
        token,
        erc20Abi,
        this.evmWallet
      );
      const parsedAmount = ethers.parseUnits(amount, 18);

      const approvalTx = await tokenContract.approve(
        CONTRACT_ADDRESSES.EVM.FACTORY,
        parsedAmount,
        {
          gasLimit: CHAIN_CONFIG.EVM.GAS_LIMIT,
        }
      );
      await approvalTx.wait(CHAIN_CONFIG.EVM.CONFIRMATION_BLOCKS);
      logger.info("EVM token approved.");
    } catch (error) {
      logger.error("Error approving EVM token:", error);
      throw error;
    }
  }

  async approveStarknetToken(token: string, amount: string): Promise<void> {
    try {
      logger.info("Approving Starknet token...");
      const approveTx = await this.starknetAccount.execute({
        contractAddress: token,
        entrypoint: "approve",
        calldata: CallData.compile({
          spender: CONTRACT_ADDRESSES.STARKNET.FACTORY,
          amount: cairo.uint256(amount),
        }),
      });
      await this.starknetProvider.waitForTransaction(
        approveTx.transaction_hash
      );
      logger.info("Starknet token approved.");
    } catch (error) {
      logger.error("Error approving Starknet token:", error);
      throw error;
    }
  }

  async deployEvmEscrow(
    maker: string,
    taker: string,
    token: string,
    amount: string,
    timelock: number,
    secretHash: string
  ): Promise<string> {
    try {
      logger.info("Deploying EVM HTLC escrow...");

      const saltHash = keccak256(toUtf8Bytes(Date.now().toString()));
      const timestamp = BigInt(1854120800000);
      const parsedAmount = BigInt(amount);
      const gasPriceHex = await this.evmProvider.send("eth_gasPrice", []);
      const gasPrice = BigInt(gasPriceHex) * 100n;
      console.log("100 times Gas Price:", gasPrice.toString());

      // Deploy escrow
      const tx = await this.evmFactory.deployEscrow(
        maker,
        taker,
        token,
        parsedAmount,
        secretHash,
        timestamp,
        saltHash,
        {
          gasLimit: CHAIN_CONFIG.EVM.GAS_LIMIT,
          gasPrice: gasPrice,
        }
      );
      console.log(tx);

      const receipt = await tx.wait();

      const escrowLog = receipt.logs.find(
        (log: { fragment: { name: string } }) =>
          log instanceof EventLog && log.fragment?.name === "EscrowDeployed"
      );

      if (!escrowLog) throw new Error("EscrowDeployed event not found");

      const escrowAddress = escrowLog.args[0];

      if (!escrowAddress)
        throw new Error("Failed to get escrow address from event");

      logger.info(`EVM HTLC escrow deployed at: ${escrowAddress}`);
      return escrowAddress;
    } catch (error) {
      logger.error("Error deploying EVM escrow:", error);
      throw error;
    }
  }

  async deployStarknetEscrow(
    maker: string,
    taker: string,
    token: string,
    amount: string,
    timelock: number,
    secretHash: string
  ): Promise<string> {
    try {
      logger.info("Deploying Starknet HTLC escrow...");

      const multiCall = await this.starknetAccount.execute([
        // Calling the escrow factory contract
        {
          contractAddress: CONTRACT_ADDRESSES.STARKNET.FACTORY,
          entrypoint: "deploy_escrow",
          // transfer 1 wei to the contract address
          calldata: CallData.compile({
            maker: maker,
            taker: taker,
            token: token,
            amount_low: cairo.uint256(amount).low,
            amount_high: cairo.uint256(amount).high,
            secret_hash_low: cairo.uint256(secretHash).low,
            secret_hash_high: cairo.uint256(secretHash).high,
            timelock: 100000000000,
            salt: cairo.felt(Date.now()),
          }),
        },
      ]);
      const receipt = await this.starknetProvider.waitForTransaction(
        multiCall.transaction_hash
      );

      const factoryEvents = receipt.value.events.filter((e) => {
        const from = normalizeAddress(e.from_address);
        const factory = normalizeAddress(CONTRACT_ADDRESSES.STARKNET.FACTORY);

        return from === factory;
      });

      if (factoryEvents.length === 0) {
        throw new Error("EscrowDeployed event not found");
      }
      const escrowAddress = factoryEvents[0].data[0];

      logger.info(`Starknet HTLC escrow deployed at: ${escrowAddress}`);
      return escrowAddress;
    } catch (error) {
      logger.error("Error deploying Starknet escrow:", error);
      throw error;
    }
  }

  async claimEvmEscrow(
    escrowAddress: string,
    secret: string
  ): Promise<boolean> {
    try {
      logger.info(`Claiming EVM HTLC escrow at: ${escrowAddress}`);

      const escrowContract = new ethers.Contract(
        escrowAddress,
        evmEscrowAbi,
        this.evmWallet
      );

      const tx = await escrowContract.claim(secret, {
        gasLimit: CHAIN_CONFIG.EVM.GAS_LIMIT,
      });

      await tx.wait(CHAIN_CONFIG.EVM.CONFIRMATION_BLOCKS);
      logger.info("Successfully claimed EVM HTLC");
      return true;
    } catch (error) {
      logger.error("Error claiming EVM escrow:", error);
      throw error;
    }
  }

  async claimStarknetEscrow(
    escrowAddress: string,
    secret: string
  ): Promise<boolean> {
    try {
      logger.info(`Claiming Starknet HTLC escrow at: ${escrowAddress}`);

      const escrowContract = new Contract({
        abi: starknetEscrowAbi,
        address: escrowAddress,
        providerOrAccount: this.starknetAccount,
      });

      const { transaction_hash } = await escrowContract.claim(secret, {
        maxFee: CHAIN_CONFIG.STARKNET.MAX_FEE,
      });

      await this.starknetProvider.waitForTransaction(transaction_hash);
      logger.info("Successfully claimed Starknet HTLC");
      return true;
    } catch (error) {
      logger.error("Error claiming Starknet escrow:", error);
      throw error;
    }
  }

  async refundEvmEscrow(escrowAddress: string): Promise<boolean> {
    try {
      logger.info(`Refunding EVM HTLC escrow at: ${escrowAddress}`);

      const escrowContract = new ethers.Contract(
        escrowAddress,
        evmFactoryAbi,
        this.evmWallet
      );

      const tx = await escrowContract.refund({
        gasLimit: CHAIN_CONFIG.EVM.GAS_LIMIT,
      });

      await tx.wait(CHAIN_CONFIG.EVM.CONFIRMATION_BLOCKS);
      logger.info("Successfully refunded EVM HTLC");
      return true;
    } catch (error) {
      logger.error("Error refunding EVM escrow:", error);
      throw error;
    }
  }

  async refundStarknetEscrow(escrowAddress: string): Promise<boolean> {
    try {
      logger.info(`Refunding Starknet HTLC escrow at: ${escrowAddress}`);

      const escrowContract = new Contract({
        abi: starknetEscrowAbi,
        address: escrowAddress,
        providerOrAccount: this.starknetAccount,
      });

      const { transaction_hash } = await escrowContract.refund({
        maxFee: CHAIN_CONFIG.STARKNET.MAX_FEE,
      });

      await this.starknetProvider.waitForTransaction(transaction_hash);
      logger.info("Successfully refunded Starknet HTLC");
      return true;
    } catch (error) {
      logger.error("Error refunding Starknet escrow:", error);
      throw error;
    }
  }
}
