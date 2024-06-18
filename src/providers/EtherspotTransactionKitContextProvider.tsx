import React, { useMemo, useState } from 'react';
import { BigNumber } from 'ethers';

// contexts
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';

// utils
import { getObjectSortedByKeys } from '../utils/common';

// hooks
import useEtherspot from '../hooks/useEtherspot';

// types
import { EstimatedBatch, IBatch, IBatches, IEstimatedBatches, ISentBatches, SentBatch } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

interface EtherspotTransactionKitContextProviderProps {
  children?: React.ReactNode;
}

const parseEtherspotErrorMessage = (e: Error | unknown, defaultMessage: string ): string => {
  return (e instanceof Error && e.message)
    || defaultMessage;
}

const EtherspotTransactionKitContextProvider = ({ children }: EtherspotTransactionKitContextProviderProps) => {
  const { provider, chainId, getSdk } = useEtherspot();
  const [groupedBatchesPerId, setGroupedBatchesPerId] = useState<TypePerId<IBatches>>({});
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [containsSendingError, setContainsSendingError] = useState<boolean>(false);
  const [containsEstimatingError, setContainsEstimatingError] = useState<boolean>(false);

  const estimate = async (
    batchesIds?: string[],
    forSending: boolean = false,
  ): Promise<IEstimatedBatches[]> => {
    if (!forSending) {
      setIsEstimating(true);
      setContainsSendingError(false);
    }

    const groupedBatchesToEstimate = Object.values<IBatches>(groupedBatchesPerId)
      .filter((groupedBatch) => (!batchesIds?.length|| batchesIds.some((batchesId) => batchesId === groupedBatch.id)));

    const result = await Promise.all(groupedBatchesToEstimate.map(async (groupedBatch): Promise<IEstimatedBatches> => {
      const batches = (groupedBatch.batches ?? []) as IBatch[];

      if (groupedBatch.skip) return { ...groupedBatch, estimatedBatches: [] };

      const estimatedBatches: EstimatedBatch[] = [];

      // push estimations in same order
      for (const batch of batches) {
        if (!provider) {
          estimatedBatches.push({ ...batch, errorMessage: 'Failed to get Web3 provider!' });
          continue;
        }

        const batchChainId = batch.chainId ?? chainId;

        if (!batch.transactions) {
          estimatedBatches.push({ ...batch, errorMessage: 'No transactions to estimate!' });
          continue;
        }

        // force new instance for each batch to not mix up user ops added to SDK state batch
        const etherspotModularOrPrimeSdk = await getSdk(batchChainId, true);

        try {
          if (!forSending) await etherspotModularOrPrimeSdk.clearUserOpsFromBatch();

          await Promise.all(batch.transactions.map(async ({ to, value, data }) => {
            await etherspotModularOrPrimeSdk.addUserOpsToBatch(({ to, value, data }));
          }));

          const userOp = await etherspotModularOrPrimeSdk.estimate({ paymasterDetails: groupedBatch.paymaster });
          const totalGas = await etherspotModularOrPrimeSdk.totalGasEstimated(userOp);
          estimatedBatches.push({ ...batch, cost: totalGas.mul(userOp.maxFeePerGas as BigNumber), userOp });
        } catch (e) {
          const errorMessage = parseEtherspotErrorMessage(e, 'Failed to estimate!');
          estimatedBatches.push({ ...batch, errorMessage });
        }
      }

      if (groupedBatch.onEstimated && !forSending) groupedBatch.onEstimated(estimatedBatches);

      return { ...groupedBatch, estimatedBatches };
    }));

    if (!forSending) {
      const containsError = result.some((group) => group.estimatedBatches.some((batch) => !!batch.errorMessage));
      setContainsEstimatingError(containsError);
      setIsEstimating(false);
    }

    return result;
  }

  const send = async (batchesIds?: string[]): Promise<ISentBatches[]> => {
    setIsSending(true);
    setContainsSendingError(false);

    const groupedBatchesToClean = Object.values<IBatches>(groupedBatchesPerId)
      .filter((groupedBatch) => (!batchesIds?.length|| batchesIds.some((batchesId) => batchesId === groupedBatch.id)));

    // clear any existing batches before new estimate & send
    await Promise.all(groupedBatchesToClean.map(async ({
      batches = [],
    }) => Promise.all(batches.map(async (batch) => {
      const batchChainId = batch.chainId ?? chainId;

      const etherspotModularOrPrimeSdk = await getSdk(batchChainId);

      await etherspotModularOrPrimeSdk.clearUserOpsFromBatch();
    }))));

    const estimated = await estimate(batchesIds, true);

    const result = await Promise.all(estimated.map(async (estimatedBatches): Promise<ISentBatches> => {
      const sentBatches: SentBatch[] = [];

      // send in same order as estimated
      for (const estimatedBatch of estimatedBatches.estimatedBatches) {
        const batchChainId = estimatedBatch.chainId ?? chainId

        // return error message as provided by estimate
        if (estimatedBatch.errorMessage) {
          sentBatches.push({ ...estimatedBatch, errorMessage: estimatedBatch.errorMessage });
          continue;
        }

        const etherspotModularOrPrimeSdk = await getSdk(batchChainId);

        if (!estimatedBatch.userOp) {
          sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get estimated UserOp!' });
          continue;
        }

        try {
          const userOpHash = await etherspotModularOrPrimeSdk.send(estimatedBatch.userOp);
          sentBatches.push({ ...estimatedBatch, userOpHash });
        } catch (e) {
          const errorMessage = parseEtherspotErrorMessage(e, 'Failed to send!');
          sentBatches.push({ ...estimatedBatch, errorMessage });
        }
      }

      if (estimatedBatches.onSent) estimatedBatches.onSent(sentBatches);

      return { ...estimatedBatches, sentBatches };
    }));

    const containsError = result.some((group) => {
      return group.estimatedBatches.some((batch) => !!batch.errorMessage) // estimate error during sending
        || group.sentBatches.some((batch) => !!batch.errorMessage);
    });

    setContainsSendingError(containsError);
    setIsSending(false);

    return result;
  }

  const contextData = useMemo(() => ({
    batches: getObjectSortedByKeys(groupedBatchesPerId),
    estimate,
    send,
    chainId,
    isEstimating,
    isSending,
    containsEstimatingError,
    containsSendingError,
  }), [
    chainId,
    groupedBatchesPerId,
    isEstimating,
    isSending,
    containsEstimatingError,
    containsSendingError,
  ]);

  return (
    <EtherspotTransactionKitContext.Provider value={{ data: contextData, setGroupedBatchesPerId }}>
      {children}
    </EtherspotTransactionKitContext.Provider>
  );
}

export default EtherspotTransactionKitContextProvider;
