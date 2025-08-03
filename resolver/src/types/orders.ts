export enum OrderStatus {
  PENDING_AUCTION = "pending_auction",
  ASSIGNED = "assigned",
  SRC_DEPLOYED = "src_deployed",
  DST_DEPLOYED = "dst_deployed",
  CLAIMED_SRC = "claimed_src",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED_SRC = "refunded_src",
  REFUNDED_DST = "refunded_dst",
}

export interface OrderStatusResponse {
  status:
    | "pending_auction"
    | "assigned"
    | "src_deployed"
    | "dst_deployed"
    | "claimed_src"
    | "completed"
    | "failed"
    | "refunded_src"
    | "refunded_dst";
}

export interface Order {
  _id: string;
  makerAddress: string;
  takerAddress: string; // Destination address
  makerChain: string;
  takerChain: string;
  makingAmount: string;
  takingAmount: string;
  makerAsset: string;
  takerAsset: string;
  ethereumHashlock: string; // Ethereum hashlock
  starknetHashlock: string; // Starknet hashlock
  secretRevealed: boolean;
  auction: {
    duration: number;
    startTime: number;
  };
  timelocks: {
    srcWithdrawal: number;
    dstWithdrawal: number;
  };
  orderNonce: string;
  signature: string;
  status: OrderStatusResponse["status"];
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingOrderResponse {
  orderId: string;
  makerAddress: string;
  makingAmount: string;
  takingAmount: string;
  auction: {
    duration: number;
    startTime: number;
  };
  currentAmount: string;
  status: OrderStatusResponse["status"];
}

export interface OrderDetailResponse {
  order: Order;
  assignment: ResolverAssignment;
  events: any[];
}

export interface AssignOrderRequest {
  resolverAddress: string;
  effectiveAmount: string;
}

export interface CompleteOrderRequest {
  status: 'completed' | 'refunded_src' | 'refunded_dst' | 'failed';
  details?: {
    srcClaimTx?: string;
  };
}

export interface GetSecretResponse {
  secret: string;
}

export interface ResolverAssignment {
  _id: string;
  orderId: string;
  resolverAddress: string;
  effectiveAmount: string;
  assignedAt: Date;
  srcEscrowAddress?: string;
  dstEscrowAddress?: string;
  srcTimelock?: number;
  dstTimelock?: number;
  fillAmount?: string;
  takeAmount?: string;
  secret?: string;
  claimTxHash?: string;
  status:
    | "assigned"
    | "src_deployed"
    | "dst_deployed"
    | "claimed_src"
    | "completed"
    | "failed";
}

export interface FeedAssignmentUpdatePayload {
  srcEscrowAddress?: string;
  dstEscrowAddress?: string;
  srcTimelock?: number;
  dstTimelock?: number;
  fillAmount?: string;
  takeAmount?: string;
  status?:
    | "src_deployed"
    | "dst_deployed"
    | "claimed_src"
    | "completed"
    | "failed";
}
