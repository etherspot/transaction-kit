import { AccountTypes, Transaction } from 'etherspot';
import { useEtherspot } from '@etherspot/react-etherspot';
import { TokenListToken } from 'etherspot/dist/sdk/assets/classes/token-list-token';

interface IEtherspotAssetsHook {
  getAssets: () => Promise<TokenListToken[]>;
}

/**
 * Hook to fetch Etherspot supported assets
 * @param chainId {number} - Chain ID
 * @returns {IEtherspotAssetsHook} - hook method to fetch Etherspot supported assets
 */
const useEtherspotAssets = (chainId: number = 1): IEtherspotAssetsHook => {
  const { connect, getSdkForChainId } = useEtherspot();

  const getAssets = async (): Promise<TokenListToken[]> => {
    const sdkForChainId = getSdkForChainId(chainId);
    if (!sdkForChainId) return [];

    if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      await connect(chainId);
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
