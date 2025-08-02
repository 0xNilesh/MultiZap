import { config } from 'dotenv';
import { cleanEnv, str, num } from 'envalid';

config();

const env = cleanEnv(process.env, {
  RELAYER_API_URL: str(),
  RESOLVER_ADDRESS: str(),
  EVM_RPC_URL: str(),
  EVM_PRIVATE_KEY: str(),
  STARKNET_RPC_URL: str(),
  STARKNET_PRIVATE_KEY: str(),
  STARKNET_ACCOUNT_ADDRESS: str(),
  MIN_PROFITABLE_BUMP: num(),
  LOG_LEVEL: str({ default: 'info' }),
});

export default env;
