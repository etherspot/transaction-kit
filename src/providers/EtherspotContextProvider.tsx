import {
  PrimeSdk,
  WalletProviderLike,
  isWalletProvider,
  Factory,
  Web3WalletProvider,
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

// types
import { AccountTemplate } from '../types/EtherspotTransactionKit';

let sdkPerChain: { [chainId: number]: PrimeSdk } = {};

const EtherspotContextProvider = ({
  children,
  provider,
  chainId,
  accountTemplate,
  projectKey,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  chainId: number;
  accountTemplate: AccountTemplate;
  projectKey?: string;
}) => {
  const context = useContext(EtherspotContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  useEffect(() => {
    // reset on provider change
    sdkPerChain = {};
  }, [provider]);

  const getSdk = useCallback(async (sdkChainId: number = chainId, forceNewInstance: boolean = false) => {
    if (sdkPerChain[sdkChainId] && !forceNewInstance) return sdkPerChain[sdkChainId];

    let mappedProvider;
    if (!isWalletProvider(provider)) {
      try {
        // @ts-ignore
        mappedProvider = new Web3WalletProvider(provider);
        await mappedProvider.refresh();
      } catch (e) {
        // no need to log, this is an attempt
      }

      if (!mappedProvider) {
        throw new Error('Invalid provider!');
      }
    }

    const sdkForChain = new PrimeSdk(mappedProvider ?? provider, {
      chainId: sdkChainId,
      projectKey: projectKey ?? ('__ETHERSPOT_PROJECT_KEY__' || undefined),
      factoryWallet: accountTemplate as Factory,
    });

    sdkPerChain = {
      ...sdkPerChain,
      [sdkChainId]: sdkForChain,
    }

    // establishes connection, requests signature
    await sdkForChain.getCounterFactualAddress();

    return sdkForChain;
  }, [provider, chainId, accountTemplate]);

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
