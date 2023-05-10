import { useEffect, useState } from 'react';
import { AccountTypes, NftCollection } from 'etherspot';
import { useEtherspot } from '@etherspot/react-etherspot';

/**
 * Hook to fetch Etherspot account owned NFTs
 * @param chainId {number} - Chain ID
 * @returns {NftCollection[] | null} - Account NFTs
 */
const useEtherspotNfts = (chainId: number = 1): NftCollection[] | null => {
  const [nfts, setNfts] = useState<NftCollection[] | null>(null);
  const { connect, getSdkForChainId } = useEtherspot();

  useEffect(() => {
    let shouldUpdate = true;

    const updateNfts = async () => {
      const sdkForChainId = getSdkForChainId(chainId);
      if (!sdkForChainId) return;

      if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
        await connect(chainId);
      }

      try {
        const { items } = await sdkForChainId.getNftList({
          account: sdkForChainId.state.account.address,
        });
        if (shouldUpdate) setNfts(items);
      } catch (e) {
        console.warn(
          `Sorry, an error occurred whilst trying to fetch account NFTs`
          + ` for ${sdkForChainId.state.account.address}. Please try again. Error:`,
          e,
        );
      }
    }

    updateNfts();

    return () => { shouldUpdate = false; }
  }, [chainId, getSdkForChainId, connect]);


  return nfts;
};

export default useEtherspotNfts;
