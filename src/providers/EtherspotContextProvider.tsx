/* eslint-disable default-case */
/* eslint-disable react/jsx-no-constructed-context-values */
import DataUtils from '@etherspot/data-utils';
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

// types
import { AccountTemplate } from '../types/EtherspotTransactionKit';

let sdkPerChain: { [chainId: number]: ModularSdk | Promise<ModularSdk> } = {};
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
  isModular,
}: {
  children: ReactNode;
  provider: WalletProviderLike;
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
    };
  }, []);

  const getSdk = useCallback(
    async (sdkChainId: number = chainId, forceNewInstance: boolean = false) => {
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
        // let mappedProvider;

        // if (!isWalletProviderModular(provider as WalletProviderLikeModular)) {
        //   try {
        //     mappedProvider = createWalletClient({
        //       chain: getNetworkViem(sdkChainId),
        //       transport: custom(provider),
        //     });
        //     // mappedProvider = new Web3WalletModularProvider(
        //     //   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //     //   // @ts-expect-error
        //     //   provider as WalletProviderLikeModular
        //     // );
        //     await mappedProvider.refresh();
        //   } catch (e) {
        //     // no need to log, this is an attempt
        //   }

        //   if (!mappedProvider) {
        //     throw new Error('Invalid provider!');
        //   }
        // }

        // const mappedProvider = createWalletClient({
        //   chain: getNetworkViem(sdkChainId),
        //   transport: custom(provider as EthereumProvider),
        // });

        const etherspotModularSdk = new ModularSdk(provider as WalletProvider, {
          chainId: +sdkChainId,
          bundlerProvider: new EtherspotBundler(
            +sdkChainId,
            bundlerApiKey ?? '__ETHERSPOT_BUNDLER_API_KEY__'
          ),
          factoryWallet: accountTemplate as Factory,
        });

        // load the address into SDK state
        await etherspotModularSdk.getCounterFactualAddress();

        prevProvider = provider as WalletProviderLike;
        prevAccountTemplate = accountTemplate;

        return etherspotModularSdk;
      })();

      return sdkPerChain[sdkChainId];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider, chainId, accountTemplate, bundlerApiKey]
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
