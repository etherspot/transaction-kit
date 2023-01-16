import React, { useMemo } from 'react';
import { WalletProviderLike } from 'etherspot';
import EtherspotSdkContextProvider from '@etherspot/react-etherspot';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

// utils
import { findGroupedBatches } from '../utils/etherspotUi';

interface EtherspotUiProps {
  provider?: WalletProviderLike | null | undefined;
  chainId?: number | undefined;
  children?: React.ReactNode;
}

const EtherspotUi = ({ children, provider, chainId = 1 }: EtherspotUiProps) => {
  const groupedBatches = findGroupedBatches(children);

  const contextData = useMemo(
    () => ({
      batches: groupedBatches,
      chainId,
    }),
    [
      chainId
    ],
  );

  return (
    <EtherspotSdkContextProvider provider={provider} chainId={chainId}>
      <EtherspotUiContext.Provider value={{ data: contextData }}>
        {children}
      </EtherspotUiContext.Provider>
    </EtherspotSdkContextProvider>
  );
}

export default EtherspotUi;
