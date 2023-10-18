import { createContext } from 'react';
import { PrimeSdk, WalletProviderLike } from '@etherspot/prime-sdk';

export interface EtherspotContextData {
  data: {
    accountAddress: string | undefined;
    providerWalletAddress: string | undefined;
    getSdk: (chainId?: number, forceNewInstance?: boolean) => PrimeSdk | null;
    isConnected: (chainId?: number) => boolean;
    connect: (chainId?: number) => Promise<undefined | string>;
    provider: WalletProviderLike | null | undefined;
    chainId: number;
  }
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;
