import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

interface TokenListToken {

}

interface IEtherspotAssetsHook {
  getAssets: () => Promise<TokenListToken[]>;
}

/**
 * Hook to fetch Etherspot supported assets
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotAssetsHook} - hook method to fetch Etherspot supported assets
 */
const useEtherspotAssets = (chainId?: number): IEtherspotAssetsHook => {
  const { getSdk, chainId: defaultChainId } = useEtherspot();

  const assetsChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAssets = async (): Promise<TokenListToken[]> => {
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
