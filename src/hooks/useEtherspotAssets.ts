import { useMemo } from 'react';
import { BridgingProvider, Token, TokenListToken } from '@etherspot/prime-sdk/dist/sdk/data';

// hooks
import useEtherspot from './useEtherspot';

interface IEtherspotAssetsHook {
  getAssets: (chainId?: number, name?: string) => Promise<TokenListToken[]>;
  getSupportedAssets: (chainId?: number, bridgingProvider?: BridgingProvider) => Promise<Token[]>
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
    chainId?: number,
    name?: string,
  ): Promise<TokenListToken[]> => {
    let assets: TokenListToken[] = [];

    const assetsChainId = chainId ?? defaultChainId;

    try {
      const dataService = getDataService();
      assets = await dataService.getTokenListTokens({
        chainId: +assetsChainId,
        name,
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

  const getSupportedAssets = async (chainId?: number, bridgingProvider?: BridgingProvider): Promise<Token[]> => {
    let supportedAssets: Token[] = [];

    try {
      const dataService = getDataService();
      supportedAssets = await dataService.getSupportedAssets({ chainId, provider: bridgingProvider });
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch supported Etherspot assets.`
        + ` Please try again. Error:`,
        e,
      );
    }

    return supportedAssets;
  };

  return ({
    getAssets,
    getSupportedAssets,
  });
};

export default useEtherspotAssets;
