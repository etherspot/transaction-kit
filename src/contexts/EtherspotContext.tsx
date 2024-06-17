import { createContext } from 'react';
import { DataUtils, PrimeSdk, WalletProviderLike } from '@etherspot/prime-sdk';
import { ModularSdk, WalletProviderLike as WalletProviderLikeModular } from '@etherspot/modular-sdk';

export interface EtherspotContextData {
  data: {
    getSdk: (modular?: boolean, chainId?: number, forceNewInstance?: boolean) => Promise<ModularSdk | PrimeSdk>;
    getDataService: () => DataUtils;
    provider: WalletProviderLike | WalletProviderLikeModular | null | undefined;
    chainId: number;
    isModular: boolean;
  }
}

const EtherspotContext = createContext<EtherspotContextData | null>(null);

export default EtherspotContext;
