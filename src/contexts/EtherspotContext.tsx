import { createContext } from 'react';
import { PrimeSdk, WalletProviderLike } from '@etherspot/prime-sdk';

export interface EtherspotContextData {
  data: {
    getSdk: (chainId?: number, forceNewInstance?: boolean) => Promise<PrimeSdk>;
    provider: WalletProviderLike | null | undefined;
    chainId: number;
  }
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;
