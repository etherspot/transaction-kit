import { AccountTypes, NftCollection } from 'etherspot';
import { useEtherspot } from '@etherspot/react-etherspot';

interface IEtherspotNftsHook {
  getAccountNfts: (accountAddress?: string) => Promise<NftCollection[]>;
}

/**
 * Hook to fetch Etherspot account owned NFTs
 * @param chainId {number} - Chain ID
 * @returns {IEtherspotNftsHook} - hook methods to fetch Etherspot account NFTs
 */
const useEtherspotNfts = (chainId: number = 1): IEtherspotNftsHook => {
  const { connect, getSdkForChainId } = useEtherspot();

  const getAccountNfts = async (accountAddress?: string) => {
    const sdkForChainId = getSdkForChainId(chainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${chainId}`);
      return [];
    }

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(chainId);
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
