import { Transaction } from '@etherspot/prime-sdk';
import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

interface IEtherspotHistoryHook {
  getAccountTransactions: (accountAddress?: string) => Promise<Transaction[]>;
  getAccountTransaction: (hash: string) => Promise<Transaction | undefined>;
}

/**
 * Hook to fetch Etherspot account transactions history
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotHistoryHook} - hook methods to fetch Etherspot transactions history
 */
const useEtherspotHistory = (chainId: number): IEtherspotHistoryHook => {
  const { connect, getSdk, chainId: defaultChainId, isConnected } = useEtherspot();

  const historyChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountTransactions = async (accountAddress?: string): Promise<Transaction[]> => {
    const sdkForChainId = getSdk(historyChainId);
    if (!sdkForChainId) return [];

    if (!isConnected(historyChainId)) {
      await connect(historyChainId);
    }

    let transactions: Transaction[] = [];

    try {
      // TODO: fix once available on Prime SDK
      // @ts-ignore
      ({ items: transactions } = await sdkForChainId.getTransactions({
        account: accountAddress ?? sdkForChainId.state.account.address,
      }));
    } catch (e) {

      console.warn(
        `Sorry, an error occurred whilst trying to fetch the transactions`
        + ` for ${sdkForChainId.state.account.address}. Please try again. Error:`,
        e,
      );
    }

    return transactions;
  };

  const getAccountTransaction = async (hash: string): Promise<Transaction | undefined> => {
    const sdkForChainId = getSdk(historyChainId);
    if (!sdkForChainId) return;

    if (!isConnected(historyChainId)) {
      await connect(historyChainId);
    }

    try {
      return sdkForChainId.getTransaction({ hash });
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch the transaction`
        + ` for ${sdkForChainId.state.account.address}. Please try again. Error:`,
        e,
      );
    }
  }

  return ({
    getAccountTransactions,
    getAccountTransaction,
  });
};

export default useEtherspotHistory;
