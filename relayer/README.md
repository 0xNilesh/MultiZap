# Unite DeFi Relayer Service

A production-ready relayer service for coordinating cross-chain Dutch auctions between Ethereum and Starknet. The service handles auction lifecycle, secret observation, and on-chain escrow orchestration.

## Features

- **Dutch Auction System**: Off-chain decay of spread from initial rate bump
- **Cross-Chain Swaps**: Ethereum ↔ Starknet with 100% fill guarantee
- **Secret Management**: Hashlock-based secret revelation system
- **Production Ready**: Idempotency, clear state transitions, failure handling
- **RESTful API**: Complete API for order management and event handling
- **MongoDB Integration**: Persistent storage with proper indexing
- **Security**: Rate limiting, CORS, input validation, logging

## Architecture

### Core Concepts

1. **Maker (Alice)**: Submits intent with hashlock H = hash(X)
2. **Resolver**: Wins Dutch auction, deploys escrows on both chains
3. **Dutch Auction**: Off-chain decay of spread from initialRateBump
4. **Secret Reveal**: Alice claims on destination, exposing X on-chain

### State Flow

```
pending_auction → assigned → src_deployed → dst_deployed → claimed_src → completed
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB 5+
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd relayer
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp config/env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**:
   ```bash
   # Start MongoDB (if not running)
   mongod
   ```

4. **Build and run**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Documentation

### Orders API

#### POST /orders
Create a new cross-chain intent.

**Request Body**:
```json
{
  "makerAddress": "0x...",
  "makerChain": "ethereum",
  "takerChain": "starknet",
  "makingAmount": "100000000",
  "takingAmount": "99000000",
  "makerAsset": "USDC_ETH_ADDR",
  "takerAsset": "USDC_STARKNET_ADDR",
  "hashlock": "0x...",
  "timelocks": {
    "srcWithdrawal": 10,
    "dstWithdrawal": 10
  },
  "auction": {
    "initialRateBump": 0.05,
    "duration": 120,
    "startTime": 1690880000
  },
  "signature": "...",
  "orderNonce": "..."
}
```

**Response**:
```json
{
  "orderId": "uuid",
  "status": "pending_auction"
}
```

#### GET /orders?status=pending_auction
Get all pending auction orders with current bump calculation.

**Response**:
```json
[
  {
    "orderId": "uuid",
    "makerAddress": "0x...",
    "makingAmount": "100000000",
    "takingAmount": "99000000",
    "auction": {
      "initialRateBump": 0.05,
      "duration": 120,
      "startTime": 1690880000
    },
    "currentBump": 0.032,
    "status": "pending_auction"
  }
]
```

#### POST /orders/:orderId/assign
Resolver takes the order (wins the auction).

**Request Body**:
```json
{
  "resolverAddress": "0xResolverContract",
  "effectiveBump": 0.032
}
```

**Response**:
```json
{
  "orderId": "uuid",
  "assignedResolver": "0xResolverContract",
  "status": "assigned"
}
```

#### GET /orders/:orderId
Get detailed order information.

**Response**:
```json
{
  "order": {
    "_id": "uuid",
    "makerAddress": "0x...",
    "status": "assigned",
    "secretRevealed": false,
    "secret": null,
    // ... other order fields
  },
  "assignment": {
    "resolverAddress": "0x...",
    "effectiveBump": 0.032,
    "status": "assigned"
  },
  "events": [
    {
      "type": "order_created",
      "timestamp": "2023-08-01T10:00:00Z",
      "payload": { ... }
    }
  ]
}
```

#### POST /orders/:orderId/complete
Finalize order status.

**Request Body**:
```json
{
  "status": "completed",
  "details": {
    "srcClaimTx": "0x..."
  }
}
```

**Note**: The `srcClaimTx` is stored as `srcClaimTxHash` in the assignment, while `destinationTxHash` from upload-secret is stored as `destClaimTxHash`.

#### POST /orders/:orderId/upload-secret
Upload secret after user claims from source escrow.

**Request Body**:
```json
{
  "secret": "my-secret-key-123",
  "destinationTxHash": "0x..."
}
```

**Response**:
```json
{
  "success": true
}
```

#### GET /orders/:orderId/get-secret
Get secret for resolver to claim from destination escrow.

**Response**:
```json
{
  "secret": "my-secret-key-123"
}
```



## Dutch Auction Logic

The auction calculates the current rate bump using:

```javascript
elapsed = current_timestamp - auction.startTime
fraction = clamp(elapsed / duration, 0, 1)
currentBump = auction.initialRateBump * (1 - fraction)
```

Resolvers poll `/orders?status=pending_auction` and accept when `currentBump >= their_threshold`.

## Database Schema

### Orders Collection
```javascript
{
  "_id": "uuid",
  "makerAddress": "string",
  "makerChain": "string",
  "takerChain": "string",
  "makingAmount": "string",
  "takingAmount": "string",
  "makerAsset": "string",
  "takerAsset": "string",
  "hashlock": "string",
  "secretRevealed": false,
  "secret": null,
  "auction": {
    "initialRateBump": 0.05,
    "duration": 120,
    "startTime": 1690880000
  },
  "timelocks": {
    "srcWithdrawal": 10,
    "dstWithdrawal": 10
  },
  "orderNonce": "string",
  "signature": "string",
  "status": "pending_auction",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### ResolverAssignments Collection
```javascript
{
  "_id": "uuid",
  "orderId": "uuid",
  "resolverAddress": "string",
  "effectiveAmount": "string",
  "assignedAt": "ISODate",
  "srcEscrowAddress": "string",
  "dstEscrowAddress": "string",
  "srcTimelock": "number",
  "dstTimelock": "number",
  "fillAmount": "string",
  "takeAmount": "string",
  "secret": "string",
  "destClaimTxHash": "string",
  "srcClaimTxHash": "string",
  "status": "assigned"
}
```

### Events Collection
```javascript
{
  "_id": "uuid",
  "orderId": "uuid",
  "type": "string",
  "payload": {},
  "timestamp": "ISODate"
}
```

## Development

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Environment Variables

See `config/env.example` for all available environment variables.

## Production Deployment

1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Use production MongoDB instance
3. **Security**: Configure proper CORS origins and rate limits
4. **Monitoring**: Set up logging and health checks
5. **SSL**: Use HTTPS in production

## Security Considerations

- Input validation on all endpoints
- Rate limiting to prevent abuse
- CORS configuration
- Helmet.js for security headers
- Comprehensive logging
- Idempotent operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License 