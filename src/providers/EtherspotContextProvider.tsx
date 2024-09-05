/* eslint-disable react/jsx-no-constructed-context-values */
import {
  EtherspotBundler as EtherspotBundlerModular,
  Factory as ModularFactory,
  ModularSdk,
  WalletProviderLike as WalletProviderLikeModular,
  Web3WalletProvider as Web3WalletModularProvider,
  isWalletProvider as isWalletProviderModular,
} from '@etherspot/modular-sdk';
import {
  DataUtils,
  EtherspotBundler,
  Factory,
  PrimeSdk,
  WalletProviderLike,
  Web3WalletProvider,
  isWalletProvider,
} from '@etherspot/prime-sdk';
import isEqual from 'lodash/isEqual';
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

let sdkPerChain: { [chainId: number]: PrimeSdk | Promise<PrimeSdk> } = {};
let prevProvider: WalletProviderLike;
let prevAccountTemplate: AccountTemplate | undefined;

let dataService: DataUtils;

let sdkPerChainModular: {
  [chainId: number]: ModularSdk | Promise<ModularSdk>;
} = {};
let prevProviderModular: WalletProviderLikeModular;

const EtherspotContextProvider = ({
  children,
  provider,
  chainId,
  accountTemplate,
  dataApiKey,
  bundlerApiKey,
  isModular,
}: {
  children: ReactNode;
  provider: WalletProviderLike | WalletProviderLikeModular;
  chainId: number;
  accountTemplate?: AccountTemplate;
  dataApiKey?: string;
  bundlerApiKey?: string;
  isModular: boolean;
}) => {
  const context = useContext(EtherspotContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.');
  }

  useEffect(() => {
    return () => {
      // reset on unmount
      sdkPerChain = {};
      sdkPerChainModular = {};
    };
  }, []);

  const getSdk = useCallback(
    async (sdkChainId: number = chainId, forceNewInstance: boolean = false) => {
      if (isModular) {
        const accountTemplateOrProviderChanged =
          (prevProvider &&
            !isEqual(
              prevProviderModular,
              provider as WalletProviderLikeModular
            )) ||
          (prevAccountTemplate && prevAccountTemplate !== accountTemplate);

        if (
          sdkPerChainModular[sdkChainId] &&
          !forceNewInstance &&
          !accountTemplateOrProviderChanged
        ) {
          return sdkPerChainModular[sdkChainId];
        }

        sdkPerChainModular[sdkChainId] = (async () => {
          let mappedProvider;

          if (!isWalletProviderModular(provider as WalletProviderLikeModular)) {
            try {
              mappedProvider = new Web3WalletModularProvider(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                provider as WalletProviderLikeModular
              );
              await mappedProvider.refresh();
            } catch (e) {
              // no need to log, this is an attempt
            }

            if (!mappedProvider) {
              throw new Error('Invalid provider!');
            }
          }

          const etherspotModularSdk = new ModularSdk(
            (mappedProvider as Web3WalletModularProvider) ??
              (provider as WalletProviderLikeModular),
            {
              chainId: +sdkChainId,
              bundlerProvider: new EtherspotBundlerModular(
                +sdkChainId,
                bundlerApiKey ?? ('__ETHERSPOT_BUNDLER_API_KEY__' || undefined)
              ),
              factoryWallet: accountTemplate as ModularFactory,
            }
          );

          // load the address into SDK state
          await etherspotModularSdk.getCounterFactualAddress();

          prevProviderModular = provider as WalletProviderLikeModular;
          prevAccountTemplate = accountTemplate;

          return etherspotModularSdk;
        })();

        return sdkPerChainModular[sdkChainId];
      }

      const accountTemplateOrProviderChanged =
        (prevProvider &&
          !isEqual(prevProvider, provider as WalletProviderLike)) ||
        (prevAccountTemplate && prevAccountTemplate !== accountTemplate);

      if (
        sdkPerChain[sdkChainId] &&
        !forceNewInstance &&
        !accountTemplateOrProviderChanged
      ) {
        return sdkPerChain[sdkChainId];
      }

      sdkPerChain[sdkChainId] = (async () => {
        let mappedProvider;

        if (!isWalletProvider(provider as WalletProviderLike)) {
          try {
            mappedProvider = new Web3WalletProvider(
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error
              provider as WalletProviderLike
            );
            await mappedProvider.refresh();
          } catch (e) {
            // no need to log, this is an attempt
          }

          if (!mappedProvider) {
            throw new Error('Invalid provider!');
          }
        }

        const etherspotPrimeSdk = new PrimeSdk(
          (mappedProvider as Web3WalletProvider) ??
            (provider as WalletProviderLike),
          {
            chainId: +sdkChainId,
            bundlerProvider: new EtherspotBundler(
              +sdkChainId,
              bundlerApiKey ?? ('__ETHERSPOT_BUNDLER_API_KEY__' || undefined)
            ),
            factoryWallet: accountTemplate as Factory,
          }
        );

        // load the address into SDK state
        await etherspotPrimeSdk.getCounterFactualAddress();

        prevProvider = provider as WalletProviderLike;
        prevAccountTemplate = accountTemplate;

        return etherspotPrimeSdk;
      })();

      return sdkPerChain[sdkChainId];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider, chainId, accountTemplate, bundlerApiKey]
  );

  const getDataService = useCallback(() => {
    if (dataService) return dataService;
    dataService = new DataUtils(
      dataApiKey ?? ('__ETHERSPOT_DATA_API_KEY__' || undefined)
    );
    return dataService;
  }, [dataApiKey]);

  const contextData = useMemo(
    () => ({
      getSdk,
      getDataService,
      provider,
      chainId,
      isModular,
    }),
    [getSdk, getDataService, provider, chainId, isModular]
  );

  return (
    <EtherspotContext.Provider value={{ data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;
