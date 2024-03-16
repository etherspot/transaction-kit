import { createContext } from 'react';
import { DataUtils, PrimeSdk, WalletProviderLike } from '@etherspot/prime-sdk';

export interface EtherspotContextData {
  data: {
    getSdk: (chainId?: number, forceNewInstance?: boolean) => Promise<PrimeSdk>;
    getDataService: () => DataUtils;
    provider: WalletProviderLike | null | undefined;
    chainId: number;
  }
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;
