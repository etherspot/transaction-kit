import {
  BridgingProvider,
  Transaction,
  TransactionStatus,
} from '@etherspot/data-utils/dist/data';
import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

// types
import { UserOpTransaction } from '../types/EtherspotTransactionKit';

interface IEtherspotHistoryHook {
  getAccountTransactions: (
    accountAddress?: string,
    chainId?: number
  ) => Promise<UserOpTransaction[]>;
  getAccountTransaction: (
    hash: string,
    chainId?: number
  ) => Promise<Transaction | undefined>;
  getAccountTransactionStatus: (
    fromChainId: number,
    toChainId: number,
    hash: string,
    provider?: BridgingProvider
  ) => Promise<TransactionStatus | undefined>;
}

/**
 * Hook to fetch Etherspot account transactions history
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotHistoryHook} - hook methods to fetch Etherspot transactions history
 */
const useEtherspotHistory = (chainId?: number): IEtherspotHistoryHook => {
  const { getDataService, getSdk, chainId: etherspotChainId } = useEtherspot();

  const defaultChainId = useMemo(() => {
    if (chainId) return chainId;
    return etherspotChainId;
  }, [chainId, etherspotChainId]);

  const getAccountTransactions = async (
    accountAddress?: string,
    historyChainId: number = defaultChainId
  ): Promise<UserOpTransaction[]> => {
    const sdkForChainId = await getSdk(historyChainId);

    let transactions: UserOpTransaction[] = [];

    const transactionsForAccount =
      accountAddress ?? (await sdkForChainId.getCounterFactualAddress());
    if (!transactionsForAccount) {
      console.warn('No account address provided!');
      return [];
    }

    try {
      const dataService = getDataService();
      ({ transactions } = await dataService.getTransactions({
        account: transactionsForAccount,
        chainId: +historyChainId,
      }));
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch the transactions' +
          ` for account ${transactionsForAccount}. Please try again. Error:`,
        e
      );
    }

    return transactions;
  };

  const getAccountTransaction = async (
    hash: string,
    historyChainId: number = defaultChainId
  ): Promise<Transaction | undefined> => {
    try {
      const dataService = getDataService();
      return await dataService.getTransaction({
        hash,
        chainId: +historyChainId,
      });
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch the transaction' +
          ` for hash ${hash}. Please try again. Error:`,
        e
      );
      return undefined;
    }
  };

  const getAccountTransactionStatus = async (
    fromChainId: number,
    toChainId: number,
    hash: string,
    provider?: BridgingProvider
  ): Promise<TransactionStatus | undefined> => {
    try {
      const dataService = getDataService();
      return await dataService.getTransactionStatus({
        fromChainId,
        toChainId,
        transactionHash: hash,
        provider,
      });
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch the transaction status' +
          ` from chain id ${fromChainId}` +
          ` to chain id ${toChainId}` +
          ` for hash ${hash}. Please try again. Error:`,
        e
      );
      return undefined;
    }
  };

  return {
    getAccountTransactions,
    getAccountTransaction,
    getAccountTransactionStatus,
  };
};

export default useEtherspotHistory;
