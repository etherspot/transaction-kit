import { AccountBalance } from '@etherspot/prime-sdk';
import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

interface IEtherspotBalancesHook {
  getAccountBalances: (accountAddress?: string) => Promise<AccountBalance[]>;
}

/**
 * Hook to fetch account balances
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotBalancesHook} - hook method to fetch Etherspot account balances
 */
const useEtherspotBalances = (chainId?: number): IEtherspotBalancesHook => {
  const { connect, getSdk, chainId: defaultChainId, isConnected } = useEtherspot();

  const balancesChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountBalances = async (accountAddress?: string) => {
    const sdkForChainId = getSdk(balancesChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${balancesChainId}`);
      return [];
    }

    if (!isConnected(balancesChainId)) {
      await connect(balancesChainId);
    }

    try {
      const { items } = await sdkForChainId.getAccountBalances({
        account: accountAddress ?? sdkForChainId.state.account.address,
        chainId: balancesChainId,
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
