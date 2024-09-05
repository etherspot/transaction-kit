import {
  BridgingProvider,
  Quote,
  StepTransaction,
} from '@etherspot/prime-sdk/dist/sdk/data';
import { Route } from '@lifi/types';
import { BigNumber } from 'ethers';
import { useMemo } from 'react';

// types
import {
  ICrossChainSwapOffers,
  ISameChainSwapOffers,
} from '../types/EtherspotTransactionKit';

// hooks
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
    fromAccountAddress?: string
  ) => Promise<ISameChainSwapOffers | ICrossChainSwapOffers | undefined>;
  prepareCrossChainOfferTransactions: (
    offer: Route,
    accountAddress?: string
  ) => Promise<StepTransaction[] | undefined>;
  getQuotes: (
    toAddress: string,
    toChainId: number,
    fromToken: string,
    fromAmount: BigNumber,
    slippage: number,
    fromAccountAddress?: string,
    provider?: BridgingProvider
  ) => Promise<Quote[] | undefined>;
}

/**
 * Hook to fetch Etherspot aggregated offers for same-chain and cross-chain swaps
 * @param chainId {number | undefined} - Source Chain ID
 * @returns {IEtherspotSwapsHook} - hook method to fetch Etherspot aggregated offers for same-chain and cross-chain swaps
 */
const useEtherspotSwaps = (chainId?: number): IEtherspotSwapsHook => {
  const { getDataService, getSdk, chainId: defaultChainId } = useEtherspot();

  const swapsChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const prepareCrossChainOfferTransactions = async (
    offer: Route,
    accountAddress?: string
  ): Promise<StepTransaction[] | undefined> => {
    const sdkForChainId = await getSdk(swapsChainId);

    const forAccount =
      accountAddress ?? (await sdkForChainId.getCounterFactualAddress());
    if (!forAccount) {
      console.warn('No account address provided!');
      return [];
    }

    try {
      const dataService = getDataService();
      const { items } = await dataService.getStepTransaction({
        route: offer,
        account: forAccount,
      });
      return items;
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch cross-chain offer transactions.' +
          ' Please try again. Error:',
        e
      );
      return [];
    }
  };

  // getOffers is to get different tokens & same/cross-chain offers
  const getOffers = async (
    fromAmount: BigNumber,
    fromTokenAddress: string,
    toTokenAddress: string,
    toChainId?: number,
    fromAccountAddress?: string
  ): Promise<ISameChainSwapOffers | ICrossChainSwapOffers | undefined> => {
    const sdkForChainId = await getSdk(swapsChainId);

    const fromAccount =
      fromAccountAddress ?? (await sdkForChainId.getCounterFactualAddress());
    if (!fromAccount) {
      console.warn('No account address provided!');
      return undefined;
    }

    const dataService = getDataService();

    if (toChainId && toChainId !== chainId) {
      try {
        const { items: offers } = await dataService.getAdvanceRoutesLiFi({
          fromChainId: +swapsChainId,
          toChainId,
          fromAmount,
          fromTokenAddress,
          toTokenAddress,
          fromAddress: fromAccount,
        });
        return { type: 'cross-chain', offers };
      } catch (e) {
        console.warn(
          'Sorry, an error occurred whilst trying to fetch cross-chain offers.' +
            ' Please try again. Error:',
          e
        );
      }
      return undefined;
    }

    try {
      const offers = await dataService.getExchangeOffers({
        fromAmount,
        fromTokenAddress,
        toTokenAddress,
        fromAddress: fromAccount,
        fromChainId: +swapsChainId,
      });
      return { type: 'same-chain', offers };
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch same-chain offers.' +
          ' Please try again. Error:',
        e
      );
      return undefined;
    }
  };

  // getQuotes is to get same tokens & cross-chain offers only
  const getQuotes = async (
    toAddress: string,
    toChainId: number,
    fromToken: string,
    fromAmount: BigNumber,
    slippage: number,
    fromAccountAddress?: string,
    provider?: BridgingProvider
  ): Promise<Quote[] | undefined> => {
    const sdkForChainId = await getSdk(swapsChainId);

    const fromAccount =
      fromAccountAddress ?? (await sdkForChainId.getCounterFactualAddress());
    if (!fromAccount) {
      console.warn('No account address provided!');
      return undefined;
    }

    const dataService = getDataService();

    try {
      const quotes = await dataService.getQuotes({
        fromAddress: fromAccount,
        toAddress,
        fromChainId: +swapsChainId,
        toChainId,
        fromToken,
        fromAmount,
        slippage,
        provider,
      });

      return quotes;
    } catch (e) {
      console.warn(
        'Sorry, an error occurred whilst trying to fetch cross-chain quotes.' +
          ' Please try again. Error:',
        e
      );
      return [];
    }
  };

  return {
    getOffers,
    prepareCrossChainOfferTransactions,
    getQuotes,
  };
};

export default useEtherspotSwaps;
