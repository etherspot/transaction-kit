import { useEtherspot } from '@etherspot/react-etherspot';
import { useEffect, useState } from 'react';
import { AccountTypes, TokenListToken } from 'etherspot';

let isConnecting: Promise<any> | undefined;

/**
 * Hook to fetch supported assets
 * @param chainId {number} - Chain ID
 * @returns {TokenListToken[] | null} - Supported assets list
 */
const useEtherspotAssets = (chainId: number = 1): TokenListToken[] | null => {
  const [assets, setAssets] = useState<TokenListToken[] | null>(null);
  const { connect, getSdkForChainId } = useEtherspot();


  useEffect(() => {
    let shouldUpdate = true;

    const updateAssets = async () => {
      if (!!isConnecting) return;

      const sdkForChainId = getSdkForChainId(chainId);
      if (!sdkForChainId) return;

      if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
        isConnecting = connect(chainId);
        await isConnecting;
        isConnecting = undefined;
      }

      try {
        const items = await sdkForChainId.getTokenListTokens({
          name: 'EtherspotPopularTokens',
        });
        if (shouldUpdate) setAssets(items);
      } catch (e) {
        console.warn(e);
      }
    }

    updateAssets();

    return () => { shouldUpdate = false; }
  }, [chainId, getSdkForChainId, connect]);


  return assets;
};

export default useEtherspotAssets;
