import axios from "axios";
import env from "../config/env";
import {
  Order,
  AssignOrderRequest,
  PendingOrderResponse,
  OrderDetailResponse,
  FeedAssignmentUpdatePayload,
} from "../types/orders";
import logger from "../utils/logger";

export class RelayerService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.RELAYER_API_URL;
  }

  async getPendingOrders(): Promise<PendingOrderResponse[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders?status=pending_auction`
      );
      // console.log("Fetched pending orders:", response.data);
      return response.data;
    } catch (error) {
      logger.error("Error fetching pending orders:", error);
      throw error;
    }
  }

  async getOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    console.log(`Fetching order detail for ID: ${orderId}`);
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    try {
      const response = await axios.get(`${this.baseUrl}/orders/${orderId}`);
      console.log("Fetched order detail: ", response.data);
      return response.data;
    } catch (error) {
      logger.error("Error fetching order detail:", error);
      throw error;
    }
  }

  async assignOrder(
    orderId: string,
    assignment: AssignOrderRequest
  ): Promise<{ orderId: string; assignedResolver: string; status: string }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/orders/${orderId}/assign`,
        assignment
      );
      return response.data;
    } catch (error) {
      logger.error("Error assigning order:");
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, payload: FeedAssignmentUpdatePayload): Promise<boolean> {
  try {
    const response = await axios.post(
      `${this.baseUrl}/orders/${orderId}/feed-assignment`,
      payload
    );
    return response.status === 200;
  } catch (error) {
    logger.error("Error updating order status:", error);
    throw error;
  }
}

  async completeOrder(orderId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/orders/${orderId}/complete`
      );
      return response.status === 200;
    } catch (error) {
      logger.error("Error completing order:", error);
      throw error;
    }
  }
}
