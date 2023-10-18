import { StepTransaction } from '@etherspot/prime-sdk';
import { Route } from '@lifi/types';
import { BigNumber } from 'ethers';
import { useMemo } from 'react';

// types
import { ICrossChainSwapOffers, ISameChainSwapOffers } from '../types/EtherspotTransactionKit';

// hopoks
import useEtherspot from './useEtherspot';

/**
 * @typedef {Object} IEtherspotSwapsHook
 * @property getOffers {function} - fetches Etherspot aggregated offers for same-chain and cross-chain swaps
 * @property prepareCrossChainOfferTransactions {function} - fetches Etherspot cross-chain offer transactions
 */
interface IEtherspotSwapsHook {
  getOffers: (
    fromAmount: BigNumber,
    fromTokenAddress: string,
    toTokenAddress: string,
    toChainId?: number,
  ) => Promise<ISameChainSwapOffers | ICrossChainSwapOffers | undefined>;
  prepareCrossChainOfferTransactions: (offer: Route) => Promise<StepTransaction[] | undefined>;
}

/**
 * Hook to fetch Etherspot aggregated offers for same-chain and cross-chain swaps
 * @param chainId {number | undefined} - Source Chain ID
 * @returns {IEtherspotSwapsHook} - hook method to fetch Etherspot aggregated offers for same-chain and cross-chain swaps
 */
const useEtherspotSwaps = (chainId?: number): IEtherspotSwapsHook => {
  const { connect, getSdk, chainId: defaultChainId, isConnected } = useEtherspot();

  const swapsChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const prepareCrossChainOfferTransactions = async (offer: Route): Promise<StepTransaction[] | undefined> => {
    const sdkForChainId = getSdk(swapsChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${swapsChainId}`);
      return;
    }

    if (!isConnected(swapsChainId)) {
      await connect(swapsChainId);
    }

    try {
      const { items } = await sdkForChainId.getStepTransaction({ route: offer });
      return items;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch cross-chain offer transactions.`
        + ` Please try again. Error:`,
        e,
      );
    }
  }

  const getOffers = async (
    fromAmount: BigNumber,
    fromTokenAddress: string,
    toTokenAddress: string,
    toChainId?: number,
  ): Promise<ISameChainSwapOffers | ICrossChainSwapOffers | undefined> => {
    const sdkForChainId = getSdk(swapsChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${swapsChainId}`);
      return;
    }

    if (!isConnected(swapsChainId)) {
      await connect(swapsChainId);
    }

    if (toChainId && toChainId !== chainId) {
      try {
        const { items: offers } = await sdkForChainId.getAdvanceRoutesLiFi({
          fromChainId: swapsChainId,
          toChainId,
          fromAmount,
          fromTokenAddress,
          toTokenAddress,
        });
        return { type: 'cross-chain', offers };
      } catch (e) {
        console.warn(
          `Sorry, an error occurred whilst trying to fetch cross-chain offers.`
          + ` Please try again. Error:`,
          e,
        );
      }
      return;
    }

    try {
      const offers = await sdkForChainId.getExchangeOffers({
        fromAmount,
        fromTokenAddress,
        toTokenAddress,
      });
      return { type: 'same-chain', offers };
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch same-chain offers.`
        + ` Please try again. Error:`,
        e,
      );
    }
  };

  return ({
    getOffers,
    prepareCrossChainOfferTransactions,
  });
};

export default useEtherspotSwaps;
