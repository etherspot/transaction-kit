/* eslint-disable no-await-in-loop */
/* eslint-disable react/jsx-no-constructed-context-values */
import { DataUtils } from '@etherspot/data-utils';
import {
  EtherspotBundler,
  Factory,
  ModularSdk,
  WalletProvider,
  WalletProviderLike,
} from '@etherspot/modular-sdk';
import { isEqual } from 'lodash';
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

// contexts
import { Chain } from 'viem';
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
    async (
      sdkChainId: number = chainId,
      forceNewInstance: boolean = false,
      customChain?: Chain
    ) => {
      const providerChanged =
        prevProvider && !isEqual(prevProvider, provider as WalletProviderLike);

      if (sdkPerChain[sdkChainId] && !forceNewInstance && !providerChanged) {
        return sdkPerChain[sdkChainId];
      }

      sdkPerChain[sdkChainId] = (async () => {
        const etherspotModularSdk = new ModularSdk(provider as WalletProvider, {
          chainId: +sdkChainId,
          chain: customChain,
          bundlerProvider: new EtherspotBundler(
            +sdkChainId,
            bundlerApiKey ?? '__ETHERSPOT_BUNDLER_API_KEY__'
          ),
          factoryWallet: 'etherspot' as Factory,
        });

        // Retry 3 times to load the address into SDK state
        for (let i = 1; i <= 3; i++) {
          try {
            await etherspotModularSdk.getCounterFactualAddress();
            break;
          } catch (error) {
            console.error(
              `Attempt ${i} failed to get counter factual address when initialising the Etherspot Modular SDK:`,
              error
            );

            if (i < 3) {
              await new Promise((resolve) => {
                setTimeout(resolve, 1000);
              }); // Wait 1 sec before retrying
            } else {
              throw new Error(
                'Failed to get counter factual address when initialising the Etherspot Modular SDK after 3 attempts.'
              );
            }
          }
        }

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
