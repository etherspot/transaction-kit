import { NftCollection } from '@etherspot/data-utils/dist/data';
import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

interface IEtherspotNftsHook {
  getAccountNfts: (
    accountAddress?: string,
    chainId?: number
  ) => Promise<NftCollection[]>;
}

/**
 * Hook to fetch Etherspot account owned NFTs
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotNftsHook} - hook methods to fetch Etherspot account NFTs
 */
const useEtherspotNfts = (chainId?: number): IEtherspotNftsHook => {
  const { getDataService, getSdk, chainId: etherspotChainId } = useEtherspot();

  const defaultChainId = useMemo(() => {
    if (chainId) return chainId;
    return etherspotChainId;
  }, [chainId, etherspotChainId]);

  const getAccountNfts = async (
    accountAddress?: string,
    nftsChainId: number = defaultChainId
  ) => {
    const sdkForChainId = await getSdk(nftsChainId);

    const nftsForAccount =
      accountAddress ?? (await sdkForChainId.getCounterFactualAddress());
    if (!nftsForAccount) {
      console.warn('No account address provided!');
      return [];
    }

    try {
      const dataService = getDataService();
      const { items } = await dataService.getNftList({
        account: nftsForAccount,
        chainId: +nftsChainId,
      });

      return items;
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch account NFTs' +
          ` for ${nftsForAccount}. Please try again. Error:`,
        e
      );
    }

    return [];
  };

  return { getAccountNfts };
};

export default useEtherspotNfts;
