import cron from "node-cron";
import { RelayerService } from "./services/relayer";
import { ContractService } from "./services/contracts";
import { Order, OrderStatus, AssignOrderRequest } from "./types/orders";
import logger from "./utils/logger";
import env from "./config/env";

class ResolverServer {
  private relayerService: RelayerService;
  private contractService: ContractService;
  private isProcessingOrder: boolean;
  private isCheckingPending = false;
  private isHandlingClaimed = false;

  private pendingJob?: cron.ScheduledTask;
  private claimedJob?: cron.ScheduledTask;

  constructor() {
    this.relayerService = new RelayerService();
    this.contractService = new ContractService();
    this.isProcessingOrder = false;
  }

  private async checkPendingOrders() {
    if (this.isProcessingOrder) {
      logger.debug("Still processing previous order, skipping check");
      return;
    }

    try {
      this.isProcessingOrder = true;
      const orders = await this.relayerService.getPendingOrders();
      // console.log(orders);

      for (const order of orders) {
        try {
          const orderDetails = await this.relayerService.getOrderDetail(
            order.orderId
          );
          console.log("Order details:", orderDetails.order._id);

          // Prepare assignment request
          const assignment: AssignOrderRequest = {
            resolverAddress: env.RESOLVER_ADDRESS,
            effectiveAmount: order.currentAmount,
          };

          // Try to assign the order
          const assigned = await this.relayerService.assignOrder(
            orderDetails.order._id,
            assignment
          );

          if (assigned.assignedResolver == env.RESOLVER_ADDRESS) {
            logger.info(
              `Successfully assigned order: ${orderDetails.order._id}`
            );
            await this.handleAssignedOrder(
              orderDetails.order,
              orderDetails.order.timelocks.srcWithdrawal,
              orderDetails.order.timelocks.dstWithdrawal
            );
          }
        } catch (innerErr) {
          logger.error(
            `Failed to assign or handle order ${order.orderId}:`,
            innerErr
          );
        }
      }
    } catch (error) {
      logger.error("Error in checkPendingOrders:", error);
    } finally {
      this.isProcessingOrder = false;
    }
  }

  private async handleAssignedOrder(
    order: Order,
    srcTimelock: number,
    dstTimelock: number
  ) {
    try {
      // Decide which leg is "source" and which is "destination"
      const isMakerEthereum = order.makerChain === "sepolia";

      const src = {
        chain: order.makerChain,
        address: order.makerAddress,
        asset: order.makerAsset,
        amount: order.makingAmount,
        timelock: srcTimelock,
      };

      const dst = {
        chain: isMakerEthereum ? "starknet" : "sepolia",
        address: order.takerAddress,
        asset: order.takerAsset,
        amount: order.takingAmount,
        timelock: dstTimelock,
      };

      // Deploy source HTLC
      let srcEscrowAddress: string;

      if (src.chain === "sepolia") {
        srcEscrowAddress = await this.contractService.deployEvmEscrow(
          src.address,
          env.RESOLVER_ADDRESS,
          src.asset,
          src.amount,
          src.timelock,
          order.ethereumHashlock
        );
      } else {
        srcEscrowAddress = await this.contractService.deployStarknetEscrow(
          src.address,
          env.STARKNET_ACCOUNT_ADDRESS,
          src.asset,
          src.amount,
          src.timelock,
          order.starknetHashlock
        );
      }

      await this.relayerService.updateOrderStatus(order._id, {
        status: OrderStatus.SRC_DEPLOYED,
        srcEscrowAddress,
      });

      // Deploy destination HTLC
      let dstEscrowAddress: string;

      if (dst.chain === "sepolia") {
        await this.contractService.approveEvmToken(dst.asset, dst.amount);

        dstEscrowAddress = await this.contractService.deployEvmEscrow(
          env.RESOLVER_ADDRESS, // maker is resolver on dst side
          dst.address,
          dst.asset,
          dst.amount,
          dst.timelock,
          order.ethereumHashlock
        );
      } else {
        await this.contractService.approveStarknetToken(dst.asset, dst.amount);

        dstEscrowAddress = await this.contractService.deployStarknetEscrow(
          env.STARKNET_ACCOUNT_ADDRESS,
          dst.address,
          dst.asset,
          dst.amount,
          dst.timelock,
          order.starknetHashlock
        );
      }

      await this.relayerService.updateOrderStatus(order._id, {
        status: OrderStatus.DST_DEPLOYED,
        dstEscrowAddress,
      });

      // Claim source chain HTLC
      // await this.contractService.claimEvmEscrow(srcEscrowAddress);

      // Update order status to source claimed
      // await this.relayerService.updateOrderStatus(
      //   order._id,
      //   OrderStatus.CLAIMED_SRC
      // );

      // Claim destination chain HTLC
      // await this.contractService.claimStarknetEscrow(dstEscrowAddress);

      // Complete the order
      // await this.relayerService.completeOrder(order._id);

      logger.info(`Successfully completed order: ${order._id}`);
    } catch (error) {
      logger.error(`Error handling assigned order ${order._id}:`, error);
      // Update order status to failed
      // await this.relayerService.updateOrderStatus(order._id, OrderStatus.FAILED);
    }
  }

  private async handleClaimedOrders() {
    // if (this.isProcessingOrder) {
    //   logger.debug("Still processing previous order, skipping check");
    //   return;
    // }

    try {
      // this.isProcessingOrder = true;
      const claimedOrders = await this.relayerService.getUserClaimedOrders();

      for (const orderDetail of claimedOrders) {
        try {
          const order = orderDetail.order;
          const assignment = orderDetail.assignment;
          // if (order.status !== OrderStatus.DST_DEPLOYED) {
          //   continue; // Skip if order is not in the correct state
          // }

          // Get the secret that was revealed by the user
          const secret = assignment.secret;
          if (!secret) {
            logger.error(`No secret found for order ${order._id}`);
            continue;
          }

          logger.info(`Processing claimed order ${order._id} with revealed secret`);

          try {
            // Determine which chain is source and claim accordingly
            let tx: any;
            if (order.makerChain === "sepolia") {
              // Source is EVM
              tx = await this.contractService.claimEvmEscrow(
                assignment.srcEscrowAddress!,
                secret
              );
            } else {
              // Source is Starknet
              tx = await this.contractService.claimStarknetEscrow(
                assignment.srcEscrowAddress!,
                secret
              );
            }

            const txHash = order.makerChain === "sepolia" ? tx.hash : tx.transaction_hash;

            // Update order as complete with claim transaction
            await this.relayerService.completeOrder(order._id, {
              status: "completed",
              details: {
                srcClaimTx: txHash,
              }
            });

            logger.info(`Successfully processed revealed secret for order ${order._id}`);
          } catch (claimError) {
            logger.error(`Failed to claim source escrow for order ${order._id}:`, claimError);
          }

          logger.info(`Successfully completed order ${order._id}`);
        } catch (error) {
          logger.error(`Error processing claimed order ${orderDetail.order._id}:`, error);
        }
      }
    } catch (error) {
      logger.error("Error in handleClaimedOrders:", error);
    } finally {
      // this.isProcessingOrder = false;
    }
  }

  public start() {
    logger.info("Starting resolver server...");

    // Check for new orders every 30 seconds
    this.pendingJob = cron.schedule("*/30 * * * * *", async () => {
      if (this.isCheckingPending) return;

      this.isCheckingPending = true;
      logger.info("Listening for new orders...");
      try {
        await this.checkPendingOrders();
      } catch (error) {
        logger.error("Unhandled error in checkPendingOrders:", error);
      } finally {
        this.isCheckingPending = false;
      }
    });

    // Check for claimed orders every 30 seconds
    this.claimedJob = cron.schedule("*/30 * * * * *", async () => {
      if (this.isHandlingClaimed) return;

      this.isHandlingClaimed = true;
      logger.info("Listening for user claimed orders...");
      try {
        await this.handleClaimedOrders();
      } catch (error) {
        logger.error("Unhandled error in handleClaimedOrders:", error);
      } finally {
        this.isHandlingClaimed = false;
      }
    });

    // Handle graceful shutdown
    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  private async shutdown() {
    logger.info("Shutting down resolver server...");

    // Stop cron jobs
    this.pendingJob?.stop();
    this.claimedJob?.stop();

    // Wait for ongoing order processing
    if (this.isProcessingOrder || this.isCheckingPending || this.isHandlingClaimed) {
      logger.info("Waiting for current jobs to complete...");
      let attempts = 0;

      while (
        (this.isProcessingOrder || this.isCheckingPending || this.isHandlingClaimed)
        && attempts < 30
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    logger.info("Shutdown complete.");
    process.exit(0);
  }
}

// Start the resolver server
const resolver = new ResolverServer();
resolver.start();
