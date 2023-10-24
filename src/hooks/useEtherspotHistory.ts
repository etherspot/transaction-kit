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
  const { getSdk, chainId: defaultChainId } = useEtherspot();

  const historyChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountTransactions = async (accountAddress?: string): Promise<Transaction[]> => {
    const sdkForChainId = await getSdk(historyChainId);

    let transactions: Transaction[] = [];

    const transactionsForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!transactionsForAccount) {
      console.warn(`No account address provided!`);
      return [];
    }

    try {
      // TODO: fix once available on Prime SDK
      // @ts-ignore
      ({ items: transactions } = await sdkForChainId.getTransactions({
        account: transactionsForAccount,
      }));
    } catch (e) {

      console.warn(
        `Sorry, an error occurred whilst trying to fetch the transactions`
        + ` for account ${transactionsForAccount}. Please try again. Error:`,
        e,
      );
    }

    return transactions;
  };

  const getAccountTransaction = async (hash: string): Promise<Transaction | undefined> => {
    const sdkForChainId = await getSdk(historyChainId);

    try {
      return sdkForChainId.getTransaction({ hash });
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch the transaction`
        + ` for hash ${hash}. Please try again. Error:`,
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
