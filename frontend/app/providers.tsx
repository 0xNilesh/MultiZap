'use client';

import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { sepolia } from 'wagmi/chains';
import { StarknetConfig, publicProvider, braavos, ready } from '@starknet-react/core';
import { sepolia as starknetSepolia } from '@starknet-react/chains';
import { connectors } from "@/connectors"


const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: '234dfa1391aa7810be5c0ba869b1d27d',
  chains: [sepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const chains = [starknetSepolia];
  const provider = publicProvider();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <StarknetConfig chains={chains} provider={provider} connectors={connectors}>
            {children}
          </StarknetConfig>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 