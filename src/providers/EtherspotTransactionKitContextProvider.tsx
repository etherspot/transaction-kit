import React, { useMemo, useState } from 'react';

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

const EtherspotTransactionKitContextProvider = ({ children }: EtherspotTransactionKitContextProviderProps) => {
  const { provider, chainId, getSdk } = useEtherspot();
  const [groupedBatchesPerId, setGroupedBatchesPerId] = useState<TypePerId<IBatches>>({});

  const estimate = async (
    batchesIds?: string[],
    forSending: boolean = false,
  ): Promise<IEstimatedBatches[]> => {
    const groupedBatchesToEstimate = Object.values<IBatches>(groupedBatchesPerId)
      .filter((groupedBatch) => (!batchesIds?.length|| batchesIds.some((batchesId) => batchesId === groupedBatch.id)));

    return Promise.all(groupedBatchesToEstimate.map(async (groupedBatch): Promise<IEstimatedBatches> => {
      const batches = (groupedBatch.batches ?? []) as IBatch[];

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

        const etherspotPrimeSdk = getSdk(batchChainId);
        if (!etherspotPrimeSdk) {
          estimatedBatches.push({ ...batch, errorMessage: 'Failed to get Etherspot Prime SDK for chain!' });
          continue;
        }

        try {
          if (!forSending) await etherspotPrimeSdk.clearUserOpsFromBatch();

          await Promise.all(batch.transactions.map(async ({ to, value, data }) => {
            await etherspotPrimeSdk.addUserOpsToBatch(({ to, value, data }));
          }));

          const userOp = await etherspotPrimeSdk.estimate(groupedBatch.paymaster);
          const totalGas = await etherspotPrimeSdk.totalGasEstimated(userOp);
          estimatedBatches.push({ ...batch, cost: totalGas, userOp });
        } catch (e) {
          estimatedBatches.push({ ...batch, errorMessage: (e instanceof Error && e.message) || 'Failed to estimate!' });
        }
      }

      if (groupedBatch.onEstimated && !forSending) groupedBatch.onEstimated(estimatedBatches);

      return { ...groupedBatch, estimatedBatches };
    }));
  }

  const send = async (batchesIds?: string[]): Promise<ISentBatches[]> => {
    const groupedBatchesToClean = Object.values<IBatches>(groupedBatchesPerId)
      .filter((groupedBatch) => (!batchesIds?.length|| batchesIds.some((batchesId) => batchesId === groupedBatch.id)));

    // clear any existing batches before new estimate & send
    await Promise.all(groupedBatchesToClean.map(async ({
      batches = [],
    }) => Promise.all(batches.map(async (batch) => {
      const batchChainId = batch.chainId ?? chainId;

      const etherspotPrimeSdk = getSdk(batchChainId);
      if (!etherspotPrimeSdk) return;

      await etherspotPrimeSdk.clearUserOpsFromBatch();
    }))));

    const estimated = await estimate(batchesIds, true);

    return Promise.all(estimated.map(async (estimatedBatches): Promise<ISentBatches> => {
      const sentBatches: SentBatch[] = [];

      // send in same order as estimated
      for (const estimatedBatch of estimatedBatches.estimatedBatches) {
        const batchChainId = estimatedBatch.chainId ?? chainId

        // return error message as provided by estimate
        if (estimatedBatch.errorMessage) {
          sentBatches.push({ ...estimatedBatch, errorMessage: estimatedBatch.errorMessage })
          continue;
        }

        const etherspotPrimeSdk = getSdk(batchChainId);
        if (!etherspotPrimeSdk) {
          sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get Etherspot Prime SDK for chain!' });
          continue;
        }

        if (!estimatedBatch.userOp) {
          sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get estimated UserOp!' });
          continue;
        }

        try {
          const userOpHash = await etherspotPrimeSdk.send(estimatedBatch.userOp);
          sentBatches.push({ ...estimatedBatch, userOpHash });
        } catch (e) {
          sentBatches.push({ ...estimatedBatch, errorMessage: (e instanceof Error && e.message) || 'Failed to estimate!' });
        }
      }

      if (estimatedBatches.onSent) estimatedBatches.onSent(sentBatches);

      return { ...estimatedBatches, sentBatches };
    }));
  }

  const contextData = useMemo(() => ({
    batches: getObjectSortedByKeys(groupedBatchesPerId),
    estimate,
    send,
    chainId,
  }), [
    chainId,
    groupedBatchesPerId,
  ]);

  return (
    <EtherspotTransactionKitContext.Provider value={{ data: contextData, setGroupedBatchesPerId }}>
      {children}
    </EtherspotTransactionKitContext.Provider>
  );
}

export default EtherspotTransactionKitContextProvider;
