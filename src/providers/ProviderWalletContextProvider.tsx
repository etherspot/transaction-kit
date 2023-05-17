import React, { useEffect, useMemo, useState } from 'react';
import { WalletProviderLike } from 'etherspot';
import { ethers } from 'ethers';

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
  const [transaction, setTransaction] = useState<undefined | IProviderWalletTransaction>(undefined);
  const [providerAddress, setProviderAddress] = useState<undefined | string>(undefined);

  const web3Provider = useMemo(() => {
    // @ts-ignore
    return new ethers.providers.Web3Provider(provider)
  }, [provider]);

  useEffect(() => {
    let shouldUpdate = true;

    const update = async () => {
      const newProviderAddress = await web3Provider.getSigner().getAddress();
      if (shouldUpdate) {
        setProviderAddress(newProviderAddress);
      }
    }

    update();

    return () => { shouldUpdate = false; };
  }, [web3Provider]);

  const estimate = async (): Promise<IProviderWalletTransactionEstimated> => {
    if (!transaction) {
      return { errorMessage: 'No transaction' };
    }

    const changed = await switchWalletProviderToChain(transaction.chainId ?? chainId);
    if (!changed) {
      return { errorMessage: 'Failed to change to selected network!' };
    }

    try {
      const gasCost = await web3Provider.estimateGas(transaction);
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

    const changed = await switchWalletProviderToChain(transaction.chainId ?? chainId);
    if (!changed) {
      return { errorMessage: 'Failed to change to selected network!' };
    }

    try {
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
    <ProviderWalletContext.Provider value={{ data: contextData, setTransaction, providerAddress }}>
      {children}
    </ProviderWalletContext.Provider>
  );
}

export default ProviderWalletContextProvider;
