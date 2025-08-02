export interface Order {
  _id: string;
  srcChain: string;
  dstChain: string;
  srcToken: string;
  dstToken: string;
  srcAmount: string;
  dstAmount: string;
  maker: string;
  status: OrderStatus;
  currentBump: number;
  deadline: number;
}

export type OrderStatus =
  | 'pending_auction'
  | 'assigned'
  | 'src_deployed'
  | 'dst_deployed'
  | 'claimed_src'
  | 'completed'
  | 'failed'
  | 'refunded_src'
  | 'refunded_dst';

export interface AssignmentRequest {
  orderId: string;
  resolverAddress: string;
  srcEscrowParams: {
    timelock: number;
  };
  dstEscrowParams: {
    timelock: number;
  };
}
