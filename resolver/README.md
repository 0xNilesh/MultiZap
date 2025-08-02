# Drogon Resolver

A production-grade resolver server for Drogon Protocol that participates in cross-chain swaps between EVM chains and Starknet.

## Features

- Monitors relayer API for new orders
- Participates in Dutch auctions for orders
- Creates and manages HTLC contracts on both EVM and Starknet chains
- Handles cross-chain swap execution
- Production-ready logging and monitoring
- Environment-based configuration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Copy `.env.example` to `.env` and fill in your configuration:
```bash
cp .env.example .env
```

3. Build the project:
```bash
npm run build
```

4. Start the resolver:
```bash
npm start
```

For development:
```bash
npm run dev
```

## Configuration

Required environment variables:
- `RELAYER_API_URL`: URL of the Drogon relayer API
- `EVM_RPC_URL`: RPC URL for the EVM chain
- `EVM_PRIVATE_KEY`: Private key for EVM transactions
- `STARKNET_RPC_URL`: RPC URL for Starknet
- `STARKNET_PRIVATE_KEY`: Private key for Starknet transactions
- `MIN_PROFITABLE_BUMP`: Minimum acceptable rate bump for orders

## Architecture

- `src/config`: Configuration and environment setup
- `src/services`: Core business logic services
- `src/contracts`: Contract interaction logic
- `src/types`: TypeScript type definitions
- `src/utils`: Utility functions and helpers

## Testing

Run the test suite:
```bash
npm test
```

## Production Deployment

For production deployment:
1. Ensure all environment variables are properly set
2. Build the project
3. Use process manager like PM2:
```bash
npm run build
pm2 start dist/index.js --name drogon-resolver
```
