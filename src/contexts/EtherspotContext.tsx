import { DataUtils } from '@etherspot/data-utils';
import { ModularSdk } from '@etherspot/modular-sdk';
import { WalletProviderLike } from '@etherspot/modular-sdk/dist/cjs/sdk/wallet/providers/interfaces';
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
