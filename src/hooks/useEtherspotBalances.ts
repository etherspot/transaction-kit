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
  const { getSdk, chainId: defaultChainId } = useEtherspot();

  const balancesChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountBalances = async (accountAddress?: string) => {
    const sdkForChainId = await getSdk(balancesChainId);

    const balancesForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!balancesForAccount) {
      console.warn(`No account address provided!`);
      return [];
    }

    try {
      const { items } = await sdkForChainId.getAccountBalances({
        account: balancesForAccount,
        chainId: balancesChainId,
      });

      return items;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch the balances`
        + ` for ${balancesForAccount}. Please try again. Error:`,
        e,
      );
    }

    return [];
  }

  return { getAccountBalances };
};

export default useEtherspotBalances;
