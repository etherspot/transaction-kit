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
  dataApiKey?: string;
  bundlerApiKey?: string;
}

const EtherspotTransactionKit = ({
  children,
  provider,
  chainId = 1,
  accountTemplate = Factory.ETHERSPOT,
  dataApiKey,
  bundlerApiKey,
}: EtherspotTransactionKitProps) => (
  <EtherspotContextProvider
    provider={provider}
    chainId={+chainId} // cast to make it less failproof when passed as string, i.e. from env file
    accountTemplate={accountTemplate}
    dataApiKey={dataApiKey}
    bundlerApiKey={bundlerApiKey}
  >
    <EtherspotTransactionKitContextProvider>
      <ProviderWalletContextProvider>
        {children}
      </ProviderWalletContextProvider>
    </EtherspotTransactionKitContextProvider>
  </EtherspotContextProvider>
);

export default EtherspotTransactionKit;
