import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

interface RateInfo {
  address: string;
  eth: number;
  eur: number;
  gbp: number;
  usd: number;
}

/**
 * @typedef {Object} IEtherspotPricesHook
 * @property getPrices {function} - fetches assets prices from Etherspot
 * @property getPrice {function} - fetches single asset price from Etherspot
 */
interface IEtherspotPricesHook {
  getPrice: (assetAddress: string, assetChainId?: number) => Promise<RateInfo | undefined>;
  getPrices: (assetAddresses: string[], assetsChainId?: number) => Promise<RateInfo[]>;
}

/**
 * Hook to fetch asset prices from Etherspot
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotPricesHook} - hook method to fetch prices from Etherspot
 */
const useEtherspotPrices = (chainId?: number): IEtherspotPricesHook => {
  const { connect, getSdk, chainId: etherspotChainId, isConnected } = useEtherspot();

  const defaultChainId = useMemo(() => {
    if (chainId) return chainId;
    return etherspotChainId;
  }, [chainId, etherspotChainId]);

  const getPrice = async (assetAddress: string, assetChainId: number = defaultChainId) => {
    const [price] = await getPrices([assetAddress], assetChainId);
    return price;
  }

  const getPrices = async (assetAddresses: string[], assetsChainId: number = defaultChainId) => {
    const sdkForChainId = getSdk(assetsChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${assetsChainId}`);
      return [];
    }

    if (!isConnected(assetsChainId)) {
      await connect(assetsChainId);
    }

    try {
      // TODO: fix once available on Prime SDK
      // @ts-ignore
      const result = await sdkForChainId.fetchExchangeRates({
        chainId: assetsChainId,
        tokens: assetAddresses,
      });

      if (result.errored && result.error) {
        console.warn(
          `Sorry, an error occurred whilst trying to fetch prices from Etherspot.`
          + ` Please try again. Error: ${result.error}.`
        );
        return [];
      }

      return result.items;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch prices from Etherspot.`
        + ` Please try again. Error:`,
        e,
      );
    }

    return [];
  }

  return { getPrice, getPrices };
};

export default useEtherspotPrices;
