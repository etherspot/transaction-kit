import {
  PrimeSdk,
  WalletProviderLike,
  isWalletProvider
} from '@etherspot/prime-sdk';
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

// contexts
import EtherspotContext from '../contexts/EtherspotContext';

let sdkPerChain: { [chainId: number]: PrimeSdk } = {};

const EtherspotContextProvider = ({
  children,
  provider,
  chainId = 1,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  chainId?: number;
}) => {
  const context = useContext(EtherspotContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  if (!isWalletProvider(provider)) {
    throw new Error('Invalid provider!')
  }

  useEffect(() => {
    // reset on provider change
    sdkPerChain = {};
  }, [provider]);

  const getSdk = useCallback(async (sdkChainId: number = chainId, forceNewInstance: boolean = false) => {
    if (sdkPerChain[sdkChainId] && !forceNewInstance) return sdkPerChain[sdkChainId];

    const sdkForChain = new PrimeSdk(provider, {
      chainId: sdkChainId,
      projectKey: '__ETHERSPOT_PROJECT_KEY__' || undefined,
    });

    sdkPerChain = {
      ...sdkPerChain,
      [sdkChainId]: sdkForChain,
    }

    // establishes connection, requests signature
    await sdkForChain.getCounterFactualAddress();

    return sdkForChain;
  }, [provider, chainId]);

  const contextData = useMemo(() => ({
    getSdk,
    provider,
    chainId,
  }), [
    getSdk,
    provider,
    chainId,
  ]);

  return (
    <EtherspotContext.Provider value={{ data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;
