import {
  PrimeSdk,
  WalletProviderLike,
  isWalletProvider,
  Factory,
  Web3WalletProvider,
  DataUtils,
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
let dataService: DataUtils;

const EtherspotContextProvider = ({
  children,
  provider,
  chainId,
  accountTemplate,
  dataApiKey,
  bundlerApiKey,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  chainId: number;
  accountTemplate: AccountTemplate;
  dataApiKey?: string;
  bundlerApiKey?: string;
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

    // @ts-ignore
    const sdkForChain = new PrimeSdk(mappedProvider ?? provider, {
      chainId: +sdkChainId,
      etherspotBundlerApiKey: bundlerApiKey ?? ('__ETHERSPOT_BUNDLER_API_KEY__' || undefined),
      factoryWallet: accountTemplate as Factory,
    });

    sdkPerChain = {
      ...sdkPerChain,
      [sdkChainId]: sdkForChain,
    }

    // establishes connection, requests signature
    await sdkForChain.getCounterFactualAddress();

    return sdkForChain;
  }, [provider, chainId, accountTemplate, bundlerApiKey]);

  const getDataService = useCallback(() => {
    if (dataService) return dataService;
    dataService = new DataUtils(dataApiKey ?? ('__ETHERSPOT_DATA_API_KEY__' || undefined));
    return dataService;
  }, [dataApiKey]);

  const contextData = useMemo(() => ({
    getSdk,
    getDataService,
    provider,
    chainId,
  }), [
    getSdk,
    getDataService,
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
