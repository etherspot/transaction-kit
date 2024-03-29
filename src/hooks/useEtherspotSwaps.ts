import { StepTransaction } from '@etherspot/prime-sdk/dist/sdk/data';
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
    fromAccountAddress?: string
  ) => Promise<ISameChainSwapOffers | ICrossChainSwapOffers | undefined>;
  prepareCrossChainOfferTransactions: (offer: Route, accountAddress?: string) => Promise<StepTransaction[] | undefined>;
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

    const forAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!forAccount) {
      console.warn(`No account address provided!`);
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
    fromAccountAddress?: string,
  ): Promise<ISameChainSwapOffers | ICrossChainSwapOffers | undefined> => {
    const sdkForChainId = await getSdk(swapsChainId);

    const fromAccount = fromAccountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!fromAccount) {
      console.warn(`No account address provided!`);
      return;
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
          `Sorry, an error occurred whilst trying to fetch cross-chain offers.`
          + ` Please try again. Error:`,
          e,
        );
      }
      return;
    }

    try {
      // @ts-ignore
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
