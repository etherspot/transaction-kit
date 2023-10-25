import React from 'react';
import { WalletProviderLike, Factory } from '@etherspot/prime-sdk';

// types
import { AccountTemplate } from '../types/EtherspotTransactionKit';

// providers
import EtherspotTransactionKitContextProvider from '../providers/EtherspotTransactionKitContextProvider';
import ProviderWalletContextProvider from '../providers/ProviderWalletContextProvider';
import EtherspotContextProvider from '../providers/EtherspotContextProvider';

interface EtherspotTransactionKitProps extends React.PropsWithChildren {
  provider: WalletProviderLike;
  chainId?: number;
  accountTemplate?: AccountTemplate;
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
