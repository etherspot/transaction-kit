import React from 'react';
import { WalletProviderLike } from 'etherspot';
import EtherspotSdkContextProvider from '@etherspot/react-etherspot';

// utils
import EtherspotTransactionKitContextProvider from '../providers/EtherspotTransactionKitContextProvider';

interface EtherspotTransactionKitProps extends React.PropsWithChildren {
  provider?: WalletProviderLike | null | undefined;
  chainId?: number | undefined;
}

const EtherspotTransactionKit = ({ children, provider, chainId = 1 }: EtherspotTransactionKitProps) => (
  <EtherspotSdkContextProvider provider={provider} chainId={chainId}>
    <EtherspotTransactionKitContextProvider chainId={chainId}>
      {children}
    </EtherspotTransactionKitContextProvider>
  </EtherspotSdkContextProvider>
);

export default EtherspotTransactionKit;
