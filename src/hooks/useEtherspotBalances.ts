import { useEtherspot } from '@etherspot/react-etherspot';
import { AccountTypes, AccountBalance } from 'etherspot';

interface IEtherspotBalancesHook {
  getAccountBalances: (accountAddress?: string) => Promise<AccountBalance[]>;
}

/**
 * Hook to fetch account balances
 * @param chainId {number} - Chain ID
 * @returns {IEtherspotBalancesHook} - hook method to fetch Etherspot account balances
 */
const useEtherspotBalances = (chainId: number = 1): IEtherspotBalancesHook => {
  const { connect, getSdkForChainId } = useEtherspot();

  const getAccountBalances = async (accountAddress?: string) => {
    const sdkForChainId = getSdkForChainId(chainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${chainId}`);
      return [];
    }

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(chainId);
    }

    try {
      const { items } = await sdkForChainId.getAccountBalances({
        account: accountAddress ?? sdkForChainId.state.account.address,
        chainId,
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
