import { useEtherspot } from '@etherspot/react-etherspot';
import { useEffect, useState } from 'react';
import { AccountBalance, AccountTypes } from 'etherspot';

let isConnecting: Promise<any> | undefined;

/**
 * Hook to fetch account balances
 * @param chainId {number} - Chain ID
 * @returns {AccountBalance[] | null} - Account balances
 */
const useEtherspotBalances = (chainId: number = 1): AccountBalance[] | null => {
  const [balances, setBalances] = useState<AccountBalance[] | null>(null);
  const { connect, getSdkForChainId } = useEtherspot();

  useEffect(() => {
    let shouldUpdate = true;

    const updateBalance = async () => {
      if (!!isConnecting) return;

      const sdkForChainId = getSdkForChainId(chainId);
      if (!sdkForChainId) return;

      if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
        isConnecting = connect(chainId);
        await isConnecting;
        isConnecting = undefined;
      }

      try {
        const { items } = await sdkForChainId.getAccountBalances({
          account: sdkForChainId.state.account.address,
          chainId,
        });
        if (shouldUpdate) setBalances(items);
      } catch (e) {
        console.warn(e);
      }
    }

    updateBalance();

    return () => { shouldUpdate = false; }
  }, [chainId, getSdkForChainId, connect]);


  return balances;
};

export default useEtherspotBalances;
