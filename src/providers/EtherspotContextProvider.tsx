/* eslint-disable react/jsx-no-constructed-context-values */
import { DataUtils } from '@etherspot/data-utils';
import { EtherspotBundler, Factory, ModularSdk } from '@etherspot/modular-sdk';
import {
  WalletProvider,
  WalletProviderLike,
} from '@etherspot/modular-sdk/dist/cjs/sdk/wallet/providers/interfaces';
import { isEqual } from 'lodash';
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

// contexts
import EtherspotContext from '../contexts/EtherspotContext';

let sdkPerChain: { [chainId: number]: ModularSdk | Promise<ModularSdk> } = {};
let prevProvider: WalletProviderLike;

let dataService: DataUtils;

const EtherspotContextProvider = ({
  children,
  provider,
  chainId,
  dataApiKey,
  bundlerApiKey,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
  chainId: number;
  dataApiKey?: string;
  bundlerApiKey?: string;
}) => {
  const context = useContext(EtherspotContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.');
  }

  useEffect(() => {
    return () => {
      // reset on unmount
      sdkPerChain = {};
    };
  }, []);

  const getSdk = useCallback(
    async (sdkChainId: number = chainId, forceNewInstance: boolean = false) => {
      const providerChanged =
        prevProvider && !isEqual(prevProvider, provider as WalletProviderLike);

      if (sdkPerChain[sdkChainId] && !forceNewInstance && !providerChanged) {
        return sdkPerChain[sdkChainId];
      }

      sdkPerChain[sdkChainId] = (async () => {
        const etherspotModularSdk = new ModularSdk(provider as WalletProvider, {
          chainId: +sdkChainId,
          bundlerProvider: new EtherspotBundler(
            +sdkChainId,
            bundlerApiKey ?? '__ETHERSPOT_BUNDLER_API_KEY__'
          ),
          factoryWallet: 'etherspot' as Factory,
        });

        // load the address into SDK state
        await etherspotModularSdk.getCounterFactualAddress();

        prevProvider = provider as WalletProviderLike;

        return etherspotModularSdk;
      })();

      return sdkPerChain[sdkChainId];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider, chainId, bundlerApiKey]
  );

  const getDataService = useCallback(() => {
    if (dataService) return dataService;
    dataService = new DataUtils(dataApiKey ?? '__ETHERSPOT_DATA_API_KEY__');
    return dataService;
  }, [dataApiKey]);

  const contextData = useMemo(
    () => ({
      getSdk,
      getDataService,
      provider,
      chainId,
    }),
    [getSdk, getDataService, provider, chainId]
  );

  return (
    <EtherspotContext.Provider value={{ data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;
