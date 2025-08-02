import cron from "node-cron";
import { RelayerService } from "./services/relayer";
import { ContractService } from "./services/contracts";
import { Order, OrderStatus, AssignOrderRequest } from "./types/orders";
import logger from "./utils/logger";
import env from "./config/env";
import { CONTRACT_ADDRESSES } from "./config/contracts";

class ResolverServer {
  private relayerService: RelayerService;
  private contractService: ContractService;
  private isProcessingOrder: boolean;

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

          // Get secret hash from contract service
          // const secretHash = "0xb68fe43f0d1a0d7aef123722670be50268e15365401c442f8806ef83b612976b";

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
      // Update order status to assigned
      // await this.relayerService.updateOrderStatus(
      //   order._id,
      //   { status: OrderStatus.ASSIGNED }
      // );

      // const srcMaker = order.makerChain == "sepolia" ? order.makerAddress : env.RESOLVER_ADDRESS;
      // const srcTaker = order.makerAddress == "sepolia" ? env.RESOLVER_ADDRESS: order.makerAddress;

      //   if (order.makerChain == "sepolia") {
      //     // Deploy source chain HTLC
      //     const srcEscrowAddress = await this.contractService.deployEvmEscrow(
      //       order.makerAddress,
      //       env.RESOLVER_ADDRESS,
      //       order.makerAsset,
      //       order.makingAmount,
      //       srcTimelock,
      //       order.hashlock
      //     );

      //     // Update order status to source deployed
      //     await this.relayerService.updateOrderStatus(
      //       order._id,
      //       { status: OrderStatus.SRC_DEPLOYED, srcEscrowAddress }
      //     );

      //     // Deploy destination chain HTLC
      //     const dstEscrowAddress = await this.contractService.deployStarknetEscrow(
      //       env.STARKNET_ACCOUNT_ADDRESS,
      //       env.STARKNET_ACCOUNT_ADDRESS,
      //       order.takerAsset,
      //       order.takingAmount,
      //       dstTimelock,
      //       order.hashlock
      //     );

      //     // Update order status to source deployed
      //     await this.relayerService.updateOrderStatus(
      //       order._id,
      //       { status: OrderStatus.DST_DEPLOYED, dstEscrowAddress }
      //     );
      // } else if (order.makerChain == "starknet") {
      //   // Deploy destination chain HTLC
      //   //   const srcEscrowAddress = await this.contractService.deployStarknetEscrow(
      //   //     order.makerAddress,
      //   //     env.STARKNET_ACCOUNT_ADDRESS,
      //   //     order.takerAsset,
      //   //     order.takingAmount,
      //   //     dstTimelock,
      //   //     order.hashlock
      //   //   );

      //   //   // Update order status to source deployed
      //   //   await this.relayerService.updateOrderStatus(
      //   //     order._id,
      //   //     { status: OrderStatus.SRC_DEPLOYED, srcEscrowAddress }
      //   //   );

      //   // // Deploy source chain HTLC
      //   //   const dstEscrowAddress = await this.contractService.deployEvmEscrow(
      //   //     order.makerAddress,
      //   //     env.RESOLVER_ADDRESS,
      //   //     order.makerAsset,
      //   //     order.makingAmount,
      //   //     srcTimelock,
      //   //     order.hashlock
      //   //   );

      //   //   // Update order status to source deployed
      //   //   await this.relayerService.updateOrderStatus(
      //   //     order._id,
      //   //     { status: OrderStatus.SRC_DEPLOYED, dstEscrowAddress }
      //   //   );
      // }

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

  public start() {
    logger.info("Starting resolver server...");

    // Check for orders every 30 seconds
    cron.schedule("*/30 * * * * *", () => {
      this.checkPendingOrders().catch((error) => {
        logger.error("Unhandled error in checkPendingOrders:", error);
      });
    });

    // Add graceful shutdown
    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  private async shutdown() {
    logger.info("Shutting down resolver server...");
    if (this.isProcessingOrder) {
      logger.info("Waiting for current order to complete...");
      // Wait for current order to complete (max 30 seconds)
      let attempts = 0;
      while (this.isProcessingOrder && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }
    }
    process.exit(0);
  }
}

// Start the resolver server
const resolver = new ResolverServer();
resolver.start();
