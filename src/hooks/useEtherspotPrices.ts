import { RateInfo } from '@etherspot/prime-sdk/dist/sdk/data';
import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

/**
 * @typedef {Object} IEtherspotPricesHook
 * @property getPrices {function} - fetches assets prices from Etherspot
 * @property getPrice {function} - fetches single asset price from Etherspot
 */
interface IEtherspotPricesHook {
  getPrice: (
    assetAddress: string,
    assetChainId?: number
  ) => Promise<RateInfo | undefined>;
  getPrices: (
    assetAddresses: string[],
    assetsChainId?: number
  ) => Promise<RateInfo[]>;
}

/**
 * Hook to fetch asset prices from Etherspot
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotPricesHook} - hook method to fetch prices from Etherspot
 */
const useEtherspotPrices = (chainId?: number): IEtherspotPricesHook => {
  const { getDataService, chainId: etherspotChainId } = useEtherspot();

  const defaultChainId = useMemo(() => {
    if (chainId) return chainId;
    return etherspotChainId;
  }, [chainId, etherspotChainId]);

  const getPrices = async (
    assetAddresses: string[],
    assetsChainId: number = defaultChainId
  ) => {
    try {
      const dataService = getDataService();
      const result = await dataService.fetchExchangeRates({
        chainId: +assetsChainId,
        tokens: assetAddresses,
      });

      if (result.errored && result.error) {
        console.warn(
          'Sorry, an error occurred whilst trying to fetch prices from Etherspot.' +
            ` Please try again. Error: ${result.error}.`
        );
        return [];
      }

      return result.items;
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch prices from Etherspot.' +
          ' Please try again. Error:',
        e
      );
    }

    return [];
  };

  const getPrice = async (
    assetAddress: string,
    assetChainId: number = defaultChainId
  ) => {
    const [price] = await getPrices([assetAddress], +assetChainId);
    return price;
  };

  return { getPrice, getPrices };
};

export default useEtherspotPrices;
