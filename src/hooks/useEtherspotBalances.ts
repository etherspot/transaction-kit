import { useEtherspot } from '@etherspot/react-etherspot';
import { AccountTypes, AccountBalance } from 'etherspot';
import { useMemo } from 'react';

interface IEtherspotBalancesHook {
  getAccountBalances: (accountAddress?: string) => Promise<AccountBalance[]>;
}

/**
 * Hook to fetch account balances
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotBalancesHook} - hook method to fetch Etherspot account balances
 */
const useEtherspotBalances = (chainId?: number): IEtherspotBalancesHook => {
  const { connect, getSdkForChainId, chainId: defaultChainId } = useEtherspot();

  const historyChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountBalances = async (accountAddress?: string) => {
    const sdkForChainId = getSdkForChainId(historyChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${historyChainId}`);
      return [];
    }

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(historyChainId);
    }

    try {
      const { items } = await sdkForChainId.getAccountBalances({
        account: accountAddress ?? sdkForChainId.state.account.address,
        chainId: historyChainId,
      });

      return items;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch the balances`
        + ` for ${sdkForChainId.state.account.address}. Please try again. Error:`,
        e,
      );
    }

    return [];
  }

  return { getAccountBalances };
};

export default useEtherspotBalances;
