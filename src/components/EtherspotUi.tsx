import React from 'react';
import { WalletProviderLike } from 'etherspot';
import EtherspotSdkContextProvider from '@etherspot/react-etherspot';

// utils
import EtherspotUiContextProvider from '../providers/EtherspotUiContextProvider';

interface EtherspotUiProps extends React.PropsWithChildren {
  provider?: WalletProviderLike | null | undefined;
  chainId?: number | undefined;
}

const EtherspotUi = ({ children, provider, chainId = 1 }: EtherspotUiProps) => (
  <EtherspotSdkContextProvider provider={provider} chainId={chainId}>
    <EtherspotUiContextProvider chainId={chainId}>
      {children}
    </EtherspotUiContextProvider>
  </EtherspotSdkContextProvider>
);

export default EtherspotUi;
