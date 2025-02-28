import { WalletProviderLike } from '@etherspot/modular-sdk';
import React from 'react';

// providers
import EtherspotContextProvider from '../providers/EtherspotContextProvider';
import EtherspotTransactionKitContextProvider from '../providers/EtherspotTransactionKitContextProvider';
import ProviderWalletContextProvider from '../providers/ProviderWalletContextProvider';

interface EtherspotTransactionKitProps extends React.PropsWithChildren {
  provider: WalletProviderLike;
  chainId?: number;
  dataApiKey?: string;
  bundlerApiKey?: string;
}

const EtherspotTransactionKit = ({
  children,
  provider,
  chainId = 1,
  dataApiKey,
  bundlerApiKey,
}: EtherspotTransactionKitProps) => {
  return (
    <EtherspotContextProvider
      provider={provider}
      chainId={+chainId} // cast to make it less failproof when passed as string, i.e. from env file
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
};

export default EtherspotTransactionKit;
