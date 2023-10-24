import React from 'react';
import { WalletProviderLike } from '@etherspot/prime-sdk';
import EtherspotContextProvider from '../providers/EtherspotContextProvider';

// providers
import EtherspotTransactionKitContextProvider from '../providers/EtherspotTransactionKitContextProvider';
import ProviderWalletContextProvider from '../providers/ProviderWalletContextProvider';

interface EtherspotTransactionKitProps extends React.PropsWithChildren {
  provider?: WalletProviderLike | null | undefined;
  chainId?: number | undefined;
}

const EtherspotTransactionKit = ({ children, provider, chainId = 1 }: EtherspotTransactionKitProps) => (
  <EtherspotContextProvider provider={provider} chainId={chainId}>
    <EtherspotTransactionKitContextProvider>
      <ProviderWalletContextProvider>
        {children}
      </ProviderWalletContextProvider>
    </EtherspotTransactionKitContextProvider>
  </EtherspotContextProvider>
);

export default EtherspotTransactionKit;
