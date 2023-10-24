import React, { useMemo, useState } from 'react';

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

// hooks
import useEtherspot from '../hooks/useEtherspot';

interface ProviderWalletContextProviderProps {
  children?: React.ReactNode;
}

const ProviderWalletContextProvider = ({ children }: ProviderWalletContextProviderProps) => {
  const [transactionById, setTransactionById] = useState<{ [id: string]: IProviderWalletTransaction | undefined }>({});
  const { provider, chainId } = useEtherspot();

  const transaction = useMemo(() => Object.values(transactionById)[0], [transactionById]);

  const estimate = async (): Promise<IProviderWalletTransactionEstimated> => {
    if (!provider) {
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
    <ProviderWalletContext.Provider value={{ data: contextData, setTransactionById }}>
      {children}
    </ProviderWalletContext.Provider>
  );
}

export default ProviderWalletContextProvider;
