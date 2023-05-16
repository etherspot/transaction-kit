import React from 'react';
import { WalletProviderLike } from 'etherspot';
import EtherspotSdkContextProvider from '@etherspot/react-etherspot';

// providers
import EtherspotTransactionKitContextProvider from '../providers/EtherspotTransactionKitContextProvider';
import ProviderWalletContextProvider from '../providers/ProviderWalletContextProvider';

interface EtherspotTransactionKitProps extends React.PropsWithChildren {
  provider?: WalletProviderLike | null | undefined;
  chainId?: number | undefined;
}

const EtherspotTransactionKit = ({ children, provider, chainId = 1 }: EtherspotTransactionKitProps) => (
  <EtherspotSdkContextProvider provider={provider} chainId={chainId}>
    <EtherspotTransactionKitContextProvider chainId={chainId}>
      <ProviderWalletContextProvider provider={provider} chainId={chainId}>
        {children}
      </ProviderWalletContextProvider>
    </EtherspotTransactionKitContextProvider>
  </EtherspotSdkContextProvider>
);

export default EtherspotTransactionKit;
