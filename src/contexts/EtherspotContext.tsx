import { DataUtils } from '@etherspot/data-utils';
import { ModularSdk, WalletProviderLike } from '@etherspot/modular-sdk';
import { createContext } from 'react';

export interface EtherspotContextData {
  data: {
    getSdk: (
      chainId?: number,
      forceNewInstance?: boolean
    ) => Promise<ModularSdk>;
    getDataService: () => DataUtils;
    provider: WalletProviderLike | null | undefined;
    chainId: number;
  };
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;
