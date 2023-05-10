import { AccountTypes, Transaction } from 'etherspot';
import { useEtherspot } from '@etherspot/react-etherspot';

interface IEtherspotHistoryHook {
  getAccountTransactions: () => Promise<Transaction[]>;
  getAccountTransaction: (hash: string) => Promise<Transaction | undefined>;
}

/**
 * Hook to fetch Etherspot account transactions history
 * @param chainId {number} - Chain ID
 * @returns {IEtherspotHistoryHook} - hook methods to fetch Etherspot transactions history
 */
const useEtherspotHistory = (chainId: number = 1): IEtherspotHistoryHook => {
  const { connect, getSdkForChainId } = useEtherspot();

  const getAccountTransactions = async (): Promise<Transaction[]> => {
    const sdkForChainId = getSdkForChainId(chainId);
    if (!sdkForChainId) return [];

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(chainId);
    }

    let transactions: Transaction[] = [];

    try {
      ({ items: transactions } = await sdkForChainId.getTransactions({
        account: sdkForChainId.state.account.address,
      }));
    } catch (e) {
      console.warn(`Sorry, an error occurred whilst trying to fetch transactions for ${sdkForChainId.state.account.address}. Please try again. Error:`, e);
    }

    return transactions;
  };

  const getAccountTransaction = async (hash: string): Promise<Transaction | undefined> => {
    const sdkForChainId = getSdkForChainId(chainId);
    if (!sdkForChainId) return;

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(chainId);
    }

    try {
      return sdkForChainId.getTransaction({ hash });
    } catch (e) {
console.warn(`Sorry, an error occurred whilst trying to fetch the transaction for ${sdkForChainId.state.account.address}. Please try again. Error:`, e);
    }
  }

  return ({
    getAccountTransactions,
    getAccountTransaction,
  });
};

export default useEtherspotHistory;
