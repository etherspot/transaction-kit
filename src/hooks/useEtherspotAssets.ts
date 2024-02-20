import { useMemo } from 'react';
import { TokenListToken } from '@etherspot/prime-sdk';

// hooks
import useEtherspot from './useEtherspot';

interface IEtherspotAssetsHook {
  getAssets: (chainId?: number) => Promise<TokenListToken[]>;
}

/**
 * Hook to fetch Etherspot supported assets
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotAssetsHook} - hook method to fetch Etherspot supported assets
 */
const useEtherspotAssets = (chainId?: number): IEtherspotAssetsHook => {
  const { getSdk, chainId: etherspotChainId } = useEtherspot();

  const defaultChainId = useMemo(() => {
    if (chainId) return chainId;
    return etherspotChainId;
  }, [chainId, etherspotChainId]);

  const getAssets = async (
    assetsChainId: number = defaultChainId,
  ): Promise<TokenListToken[]> => {
    const sdkForChainId = await getSdk(assetsChainId);

    let assets: TokenListToken[] = [];

    try {
      assets = await sdkForChainId.getTokenListTokens({
        name: 'EtherspotPopularTokens',
      });
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch Etherspot assets.`
        + ` Please try again. Error:`,
        e,
      );
    }

    return assets;
  };

  return ({
    getAssets,
  });
};

export default useEtherspotAssets;
