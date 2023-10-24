import { NftCollection } from '@etherspot/prime-sdk';
import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

interface IEtherspotNftsHook {
  getAccountNfts: (accountAddress?: string) => Promise<NftCollection[]>;
}

/**
 * Hook to fetch Etherspot account owned NFTs
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotNftsHook} - hook methods to fetch Etherspot account NFTs
 */
const useEtherspotNfts = (chainId?: number): IEtherspotNftsHook => {
  const { getSdk, chainId: defaultChainId } = useEtherspot();

  const nftsChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountNfts = async (accountAddress?: string) => {
    const sdkForChainId = await getSdk(nftsChainId);

    const nftsForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!nftsForAccount) {
      console.warn(`No account address provided!`);
      return [];
    }

    try {
      const { items } = await sdkForChainId.getNftList({
        account: nftsForAccount,
      });

      return items;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch account NFTs`
        + ` for ${nftsForAccount}. Please try again. Error:`,
        e,
      );
    }

    return [];
  }

  return { getAccountNfts };
};

export default useEtherspotNfts;
