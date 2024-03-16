import { useMemo } from 'react';
import { TokenListToken } from '@etherspot/prime-sdk/dist/sdk/data';

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
  const { getDataService, chainId: etherspotChainId } = useEtherspot();

  const defaultChainId = useMemo(() => {
    if (chainId) return chainId;
    return etherspotChainId;
  }, [chainId, etherspotChainId]);

  const getAssets = async (
    // TODO: use assetsChainId once available on Prime SDK
    assetsChainId: number = defaultChainId,
  ): Promise<TokenListToken[]> => {
    let assets: TokenListToken[] = [];

    try {
      const dataService = getDataService();
      assets = await dataService.getTokenListTokens({
        name: 'EtherspotPopularTokens',
        chainId: assetsChainId,
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
