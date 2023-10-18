import {
  AccountTypes,
  PrimeSdk,
  SessionStorage,
  WalletProviderLike,
  Web3WalletProvider,
  isWalletProvider
} from '@etherspot/prime-sdk';
import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

// contexts
import EtherspotContext from '../contexts/EtherspotContext';

// services
import { sessionStorageInstance } from '../services/EtherspotSessionStorage';

let sdkPerChain: { [chainId: number]: PrimeSdk } = {};

let isConnectingPerChain: { [chainId: number]: Promise<any> | undefined } = {};

const EtherspotContextProvider = ({
  children,
  provider: defaultProvider,
  chainId = 1,
  etherspotSessionStorage,
}: {
  children: ReactNode;
  provider?: WalletProviderLike | null | undefined;
  chainId?: number;
  etherspotSessionStorage?: SessionStorage;
}) => {
  const context = useContext(EtherspotContext);

  if (context !== null) {
    throw new Error('<EtherspotContextProvider /> has already been declared.')
  }

  const sessionStorage = etherspotSessionStorage ?? sessionStorageInstance;

  const [accountAddress, setAccountAddress] = useState<string | undefined>(undefined);
  const [providerWalletAddress, setProviderWalletAddress] = useState<string | undefined>(undefined);
  const [provider, setProvider] = useState<WalletProviderLike | Web3WalletProvider | null>(null);

  // map from generic web3 provider if needed
  useEffect(() => {
    let expired = false;

    const setMappedProvider = async () => {
      if (!defaultProvider) return;

      sdkPerChain = {};
      isConnectingPerChain = {};

      if (isWalletProvider(defaultProvider)) {
        setProvider(defaultProvider);
        return;
      }

      // @ts-ignore
      const mappedProvider = new Web3WalletProvider(defaultProvider);
      await mappedProvider.refresh();
      if (!expired) setProvider(mappedProvider);
    };

    setMappedProvider();

    return () => { expired = true };
  }, [defaultProvider]);

  const getSdk = useCallback((sdkChainId: number = chainId, forceNewInstance: boolean = false) => {
    if (sdkPerChain[sdkChainId] && !forceNewInstance) return sdkPerChain[sdkChainId];

    if (!provider) return null;

    const sdkForChain = new PrimeSdk(provider, {
      chainId,
      sessionStorage,
      projectKey: '__ETHERSPOT_PROJECT_KEY__' || undefined,
    });

    sdkPerChain = {
      ...sdkPerChain,
      [sdkChainId]: sdkForChain,
    }

    return sdkForChain;
  }, [provider, chainId]);

  useEffect(() => {
    let shouldUpdate = true;

    try {
      getSdk()?.state$?.subscribe?.(async (sdkState) => {
        if (!shouldUpdate) return;

        if (sdkState?.account?.type === AccountTypes.Key) {
          setProviderWalletAddress(sdkState.account.address);
          return;
        }

        if (sdkState?.account?.type === AccountTypes.Contract) {
          setAccountAddress(sdkState.account.address);
          return;
        }
      });
    } catch (e) {
      //
    }

    return () => {
      shouldUpdate = false;
    };
  }, [getSdk]);

  const isConnected = useCallback((sdkChainId: number = chainId) => {
    const sdk = getSdk(sdkChainId);
    return sdk?.state?.account?.type === AccountTypes.Contract;
  }, [chainId, getSdk]);

  const connect = async (connectToChainId: number = chainId): Promise<undefined | string> => {
    // nothing to do if provider not loaded in, reduces unnecessary logged errors output
    if (!provider) return;

    let connectSdk = getSdk(connectToChainId);
    if (!connectSdk) {
      console.error('Unable to get SDK!');
      return;
    }

    // if currently connecting return connection promise otherwise store new connect promise
    isConnectingPerChain[connectToChainId] = isConnectingPerChain[connectToChainId]
      ?? connectSdk.createSession();

    // complete promise
    await isConnectingPerChain[connectToChainId];

    // load smart contract account address into state
    await connectSdk.getCounterFactualAddress();

    // reset promise
    isConnectingPerChain[connectToChainId] = undefined;
  }

  const contextData = useMemo(
    () => ({
      accountAddress,
      providerWalletAddress,
      getSdk,
      connect,
      provider,
      chainId,
      isConnected,
    }),
    [
      accountAddress,
      providerWalletAddress,
      getSdk,
      provider,
      chainId,
      isConnected,
    ],
  );

  return (
    <EtherspotContext.Provider value={{ data: contextData }}>
      {children}
    </EtherspotContext.Provider>
  );
};

export default EtherspotContextProvider;
