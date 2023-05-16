import React, { useMemo, useState } from 'react';
import { WalletProviderLike } from 'etherspot';
import Web3 from 'web3';

// contexts
import ProviderWalletContext from '../contexts/ProviderWalletContext';

// types
import {
  IProviderWalletTransaction,
  IProviderWalletTransactionEstimated,
  IProviderWalletTransactionSent,
} from '../types/EtherspotTransactionKit';

// utils
import { prepareValueForRpcCall } from '../utils/common';

interface ProviderWalletContextProviderProps {
  provider?: WalletProviderLike | null | undefined;
  children?: React.ReactNode;
  chainId?: number | undefined;
}

const ProviderWalletContextProvider = ({ children, chainId = 1, provider }: ProviderWalletContextProviderProps) => {
  const [transaction, setTransaction] = useState<undefined | IProviderWalletTransaction>(undefined);

  const estimate = async (): Promise<IProviderWalletTransactionEstimated> => {
    if (!transaction) {
      return { errorMessage: 'No transaction' };
    }

    try {
      const { to, data, value } = transaction;
      const web3Provider = new Web3(provider);
      const tx = {
        from: providerAddress,
        to,
        value: prepareValueForRpcCall(value),
        data,
      };
      const gasCost = await web3Provider.sendRequest('eth_estimateGas', [tx]);
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

    // TODO: switch chain if needed

    try {
      const { to, value, data } = transaction;
      const tx = {
        from: providerAddress,
        to,
        data,
        value: prepareValueForRpcCall(value),
      };
      const web3Provider = new Web3(provider);
      const transactionHash = await web3Provider.sendRequest('eth_sendTransaction', [tx]);
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
    <ProviderWalletContext.Provider value={{ data: contextData, setTransaction }}>
      {children}
    </ProviderWalletContext.Provider>
  );
}

export default ProviderWalletContextProvider;
