import React, { useMemo, useState } from 'react';
import { useEtherspot } from '@etherspot/react-etherspot';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

// utils
import { getObjectSortedByKeys, isTestnetChainId, parseEtherspotErrorMessageIfAvailable } from '../utils/common';

// types
import { EstimatedBatch, IBatch, IBatches, IEstimatedBatches, ISentBatches, SentBatch } from '../types/EtherspotUi';
import { TypePerId } from '../types/Helper';
import { AccountStates, AccountTypes, Sdk } from 'etherspot';

interface EtherspotUiContextProviderProps {
  chainId?: number | undefined;
  children?: React.ReactNode;
}

let isSdkConnecting: Promise<any> | undefined;

const EtherspotUiContextProvider = ({ children, chainId = 1 }: EtherspotUiContextProviderProps) => {
  const { getSdkForChainId } = useEtherspot();
  const [groupedBatchesPerId, setGroupedBatchesPerId] = useState<TypePerId<IBatches>>({});

  // TODO: move to etherspot sdk context lib
  const connectToSdkForChainIfNeeded = async (sdkForChainId: Sdk) => {
    if (sdkForChainId.state.account.type === AccountTypes.Contract) return;
    isSdkConnecting = sdkForChainId.computeContractAccount({ sync: true });
    await isSdkConnecting;
    isSdkConnecting = undefined;
  }

  const estimate = async (
    batchesIds?: string[],
    forSending: boolean = false,
  ): Promise<IEstimatedBatches[]> => {
    const groupedBatchesToEstimate = Object.values<IBatches>(groupedBatchesPerId)
      .filter((groupedBatch) => (!batchesIds?.length|| batchesIds.some((batchesId) => batchesId === groupedBatch.id)));

    return Promise.all(groupedBatchesToEstimate.map(async (groupedBatch): Promise<IEstimatedBatches> => {
      // hold when connecting
      if (isSdkConnecting) await isSdkConnecting;

      const batches = (groupedBatch.batches ?? []) as IBatch[];

      const estimatedBatches: EstimatedBatch[] = [];

      // push estimations in same order
      for (const batch of batches) {
        const batchChainId = batch.chainId ?? chainId;
        const sdkForChainId = getSdkForChainId(batchChainId);

        if (!sdkForChainId) {
          estimatedBatches.push({ ...batch, errorMessage: 'Failed to get SDK for chain!' });
          continue;
        }

        await connectToSdkForChainIfNeeded(sdkForChainId);

        if (!batch.transactions) {
          estimatedBatches.push({ ...batch, errorMessage: 'No transactions to estimate!' });
          continue;
        }

        try {
          if (!forSending) sdkForChainId.clearGatewayBatch();

          if (sdkForChainId.state.account.state === AccountStates.UnDeployed) {
            await sdkForChainId.batchDeployAccount();
          }

          await Promise.all(batch.transactions.map(async ({ to, value, data }) => {
            await sdkForChainId.batchExecuteAccountTransaction(({ to, value, data }));
          }));

          const { estimation } = await sdkForChainId.estimateGatewayBatch({ feeToken: batch.gasTokenAddress });

          const cost = batch.gasTokenAddress
            ? estimation.feeAmount
            : estimation.estimatedGasPrice.mul(estimation.estimatedGas)

          estimatedBatches.push({ ...batch, cost });
        } catch (e) {
          const rawErrorMessage = e instanceof Error && e.message;
          const errorMessage = parseEtherspotErrorMessageIfAvailable(rawErrorMessage || 'Failed to estimate!');
          estimatedBatches.push({ ...batch, errorMessage });
        }
      }

      if (groupedBatch.onEstimated && !forSending) groupedBatch.onEstimated(estimatedBatches);

      return { ...groupedBatch, estimatedBatches };
    }));
  }

  const send = async (batchesIds?: string[]): Promise<ISentBatches[]> => {
    const estimated = await estimate(batchesIds, true);

    return Promise.all(estimated.map(async (estimatedBatches): Promise<ISentBatches> => {
      // hold when connecting
      if (isSdkConnecting) await isSdkConnecting;

      const sentBatches: SentBatch[] = [];

      // send in same order as estimated
      for (const estimatedBatch of estimatedBatches.estimatedBatches) {
        const batchChainId = estimatedBatch.chainId ?? chainId
        const sdkForChainId = getSdkForChainId(batchChainId);

        // return error message as provided by estimate
        if (estimatedBatch.errorMessage) {
          sentBatches.push({ ...estimatedBatch, errorMessage: estimatedBatch.errorMessage });
          continue;
        }

        if (!sdkForChainId) {
          sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get SDK for chain!' });
          continue;
        }

        await connectToSdkForChainIfNeeded(sdkForChainId);

        try {
          // testnets does not have guards
          const guarded = isTestnetChainId(batchChainId);
          const { hash: batchHash } = await sdkForChainId.submitGatewayBatch({ guarded });
          sentBatches.push({ ...estimatedBatch, batchHash });
        } catch (e) {
          const rawErrorMessage = e instanceof Error && e.message;
          const errorMessage = parseEtherspotErrorMessageIfAvailable(rawErrorMessage || 'Failed to send!');
          sentBatches.push({ ...estimatedBatch, errorMessage });
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
    <EtherspotUiContext.Provider value={{ data: contextData, setGroupedBatchesPerId }}>
      {children}
    </EtherspotUiContext.Provider>
  );
}

export default EtherspotUiContextProvider;
