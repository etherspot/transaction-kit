import React from 'react';
import { WalletProviderLike, Factory } from '@etherspot/prime-sdk';
import EtherspotContextProvider from '../providers/EtherspotContextProvider';

// providers
import EtherspotTransactionKitContextProvider from '../providers/EtherspotTransactionKitContextProvider';
import ProviderWalletContextProvider from '../providers/ProviderWalletContextProvider';

interface EtherspotTransactionKitProps extends React.PropsWithChildren {
  provider: WalletProviderLike;
  chainId?: number;
  accountTemplate?: Factory;
}

const EtherspotTransactionKit = ({
  children,
  provider,
  chainId = 1,
  accountTemplate = Factory.ETHERSPOT,
}: EtherspotTransactionKitProps) => (
  <EtherspotContextProvider
    provider={provider}
    chainId={chainId}
    accountTemplate={accountTemplate}
  >
    <EtherspotTransactionKitContextProvider>
      <ProviderWalletContextProvider>
        {children}
      </ProviderWalletContextProvider>
    </EtherspotTransactionKitContextProvider>
  </EtherspotContextProvider>
);

export default EtherspotTransactionKit;
