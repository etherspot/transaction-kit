import { AccountTypes, NftCollection } from 'etherspot';
import { useEtherspot } from '@etherspot/react-etherspot';
import { useMemo } from 'react';

interface IEtherspotNftsHook {
  getAccountNfts: (accountAddress?: string) => Promise<NftCollection[]>;
}

/**
 * Hook to fetch Etherspot account owned NFTs
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotNftsHook} - hook methods to fetch Etherspot account NFTs
 */
const useEtherspotNfts = (chainId?: number): IEtherspotNftsHook => {
  const { connect, getSdkForChainId, chainId: defaultChainId } = useEtherspot();

  const nftsChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountNfts = async (accountAddress?: string) => {
    const sdkForChainId = getSdkForChainId(nftsChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${nftsChainId}`);
      return [];
    }

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(nftsChainId);
    }

    try {
      const { items } = await sdkForChainId.getNftList({
        account: accountAddress ?? sdkForChainId.state.account.address,
      });

      return items;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch account NFTs`
        + ` for ${sdkForChainId.state.account.address}. Please try again. Error:`,
        e,
      );
    }

    return [];
  }

  return { getAccountNfts };
};

export default useEtherspotNfts;
