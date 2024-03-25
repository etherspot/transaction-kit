import {
  PrimeSdk,
  WalletProviderLike,
  isWalletProvider,
  Factory,
  Web3WalletProvider,
  DataUtils,
  EtherspotBundler,
} from '@etherspot/prime-sdk';
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import isEqual from 'lodash/isEqual';

// contexts
import EtherspotContext from '../contexts/EtherspotContext';

// types
import { AccountTemplate } from '../types/EtherspotTransactionKit';

let sdkPerChain: { [chainId: number]: PrimeSdk | Promise<PrimeSdk> } = {};
let prevProvider: WalletProviderLike;
let prevAccountTemplate: AccountTemplate | undefined;

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
  accountTemplate?: AccountTemplate;
  dataApiKey?: string;
  bundlerApiKey?: string;
}) => {
  const context = useContext(EtherspotContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  useEffect(() => {
    return () => {
      // reset on unmount
      sdkPerChain = {};
    }
  }, []);

  const getSdk = useCallback(async (sdkChainId: number = chainId, forceNewInstance: boolean = false) => {
    const accountTemplateOrProviderChanged = (prevProvider && !isEqual(prevProvider, provider))
      || (prevAccountTemplate && prevAccountTemplate !== accountTemplate);

    if (sdkPerChain[sdkChainId] && !forceNewInstance && !accountTemplateOrProviderChanged) {
      return sdkPerChain[sdkChainId];
    }

    sdkPerChain[sdkChainId] = (async () => {
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

      const etherspotPrimeSdk = new PrimeSdk(mappedProvider ?? provider, {
        chainId: +sdkChainId,
        bundlerProvider: new EtherspotBundler(+sdkChainId, bundlerApiKey ?? ('__ETHERSPOT_BUNDLER_API_KEY__' || undefined)),
        factoryWallet: accountTemplate as Factory,
      });

      // load the address into SDK state
      await etherspotPrimeSdk.getCounterFactualAddress();

      prevProvider = provider;
      prevAccountTemplate = accountTemplate;

      return etherspotPrimeSdk;
    })();

    return sdkPerChain[sdkChainId];
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
