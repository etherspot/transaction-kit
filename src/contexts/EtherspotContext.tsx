import {
  ModularSdk,
  WalletProviderLike as WalletProviderLikeModular,
} from '@etherspot/modular-sdk';
import { DataUtils, PrimeSdk, WalletProviderLike } from '@etherspot/prime-sdk';
import { createContext } from 'react';

export interface EtherspotContextData {
  data: {
    getSdk: (
      chainId?: number,
      forceNewInstance?: boolean
    ) => Promise<ModularSdk | PrimeSdk>;
    getDataService: () => DataUtils;
    provider: WalletProviderLike | WalletProviderLikeModular | null | undefined;
    chainId: number;
    isModular: boolean;
  };
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;
