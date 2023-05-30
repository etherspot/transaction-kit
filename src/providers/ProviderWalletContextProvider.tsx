import React, { useEffect, useMemo, useState } from 'react';
import { isWalletProvider, WalletProviderLike, Web3WalletProvider } from 'etherspot';

// contexts
import ProviderWalletContext from '../contexts/ProviderWalletContext';

// types
import {
  IProviderWalletTransaction,
  IProviderWalletTransactionEstimated,
  IProviderWalletTransactionSent,
} from '../types/EtherspotTransactionKit';

// utils
import { switchWalletProviderToChain } from '../utils/common';

interface ProviderWalletContextProviderProps {
  provider?: WalletProviderLike | null | undefined;
  children?: React.ReactNode;
  chainId?: number | undefined;
}

const ProviderWalletContextProvider = ({ children, chainId = 1, provider }: ProviderWalletContextProviderProps) => {
  const [transactionById, setTransactionById] = useState<{ [id: string]: IProviderWalletTransaction | undefined }>({});
  const [providerAddress, setProviderAddress] = useState<undefined | string>(undefined);
  const [web3Provider, setWeb3Provider] = useState<undefined | Web3WalletProvider>(undefined);

  useEffect(() => {
    let shouldUpdate = true;

    const update = async () => {
      if (!shouldUpdate) return;

      if (!provider) {
        console.warn('No provider set!');
        return;
      }

      let newWeb3Provider;
      // @ts-ignore
      if (isWalletProvider(provider)) {
        newWeb3Provider = provider;
        // @ts-ignore
      } else if (provider.isWalletConnect) {
        // @ts-ignore
        newWeb3Provider = WalletConnectWalletProvider.connect(provider.connector);
      } else {
        // @ts-ignore
        const mappedProvider = new Web3WalletProvider(provider);
        await mappedProvider.refresh();
        newWeb3Provider = mappedProvider;
      }

      if (!shouldUpdate) return;
      setWeb3Provider(newWeb3Provider);
      setProviderAddress(newWeb3Provider.address);
    }

    update();

    return () => { shouldUpdate = false; };
  }, [provider]);

  const transaction = useMemo(() => Object.values(transactionById)[0], [transactionById]);

  const estimate = async (): Promise<IProviderWalletTransactionEstimated> => {
    if (!web3Provider) {
      return { errorMessage: 'No Web3 provider' };
    }

    if (!transaction) {
      return { errorMessage: 'No transaction' };
    }

    const result = await switchWalletProviderToChain(transaction.chainId ?? chainId);
    if (result?.errorMessage) {
      return { errorMessage: result.errorMessage };
    }

    try {
      // @ts-ignore
      const gasCost = await web3Provider.sendRequest('eth_estimateGas', [transaction]);
      return { gasCost };
    } catch (e) {
      console.warn('Failed to estimate gas', transaction, e);
      const errorMessage = e instanceof Error && e?.message ? e.message : 'Unknown reason';
      return { errorMessage }
    }
  }

  const send = async (): Promise<IProviderWalletTransactionSent> => {
    if (!transaction) {
      return { errorMessage: 'No transaction' };
    }

    const result = await switchWalletProviderToChain(transaction.chainId ?? chainId);
    if (result?.errorMessage) {
      return { errorMessage: result.errorMessage };
    }

    try {
      // @ts-ignore
      const signer = web3Provider.getSigner();
      const { hash: transactionHash } = await signer.sendTransaction(transaction);
      return { transactionHash };
    } catch (e) {
      console.warn('Failed to send transaction', transaction, e);
      const errorMessage = e instanceof Error && e?.message ? e.message : 'Unknown reason';
      return { errorMessage }
    }
  }

  const contextData = useMemo(() => ({
    transaction,
    estimate,
    send,
  }), [
    transaction,
  ]);

  return (
    <ProviderWalletContext.Provider value={{ data: contextData, setTransactionById, providerAddress }}>
      {children}
    </ProviderWalletContext.Provider>
  );
}

export default ProviderWalletContextProvider;
