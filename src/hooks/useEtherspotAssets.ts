import { AccountTypes } from 'etherspot';
import { useEtherspot } from '@etherspot/react-etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';
import { useMemo } from 'react';

interface IEtherspotAssetsHook {
  getAssets: () => Promise<TokenListToken[]>;
}

/**
 * Hook to fetch Etherspot supported assets
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotAssetsHook} - hook method to fetch Etherspot supported assets
 */
const useEtherspotAssets = (chainId?: number): IEtherspotAssetsHook => {
  const { connect, getSdkForChainId, chainId: defaultChainId } = useEtherspot();

  const assetsChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAssets = async (): Promise<TokenListToken[]> => {
    const sdkForChainId = getSdkForChainId(assetsChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${assetsChainId}`);
      return [];
    }

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(assetsChainId);
    }

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
