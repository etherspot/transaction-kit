import React, { useMemo, useState } from 'react';
import { useEtherspot } from '@etherspot/react-etherspot';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

// utils
import { getObjectSortedByKeys } from '../utils/common';

// types
import { EstimatedBatch, IBatch, IBatches, IEstimatedBatches } from '../types/EtherspotUi';
import { TypePerId } from '../types/Helper';

interface EtherspotUiContextProviderProps {
  chainId?: number | undefined;
  children?: React.ReactNode;
}

const EtherspotUiContextProvider = ({ children, chainId = 1 }: EtherspotUiContextProviderProps) => {
  const { getSdkForChainId } = useEtherspot();
  const [groupedBatchesPerId, setGroupedBatchesPerId] = useState<TypePerId<IBatches>>({});

  const estimate = async (batchesIds?: string[]): Promise<IEstimatedBatches[]> => {
    const groupedBatchesToEstimate = Object.values<IBatches>(groupedBatchesPerId)
      .filter((groupedBatch) => (!batchesIds?.length|| batchesIds.some((batchesId) => batchesId === groupedBatch.id)));

    let isSdkConnecting: Promise<any> | undefined;

    return Promise.all(groupedBatchesToEstimate.map(async (groupedBatch) => {
      // hold when connecting
      if (isSdkConnecting) await isSdkConnecting;

      const batches = (groupedBatch.batches ?? []) as IBatch[];

      const estimatesBatches: EstimatedBatch[] = [];

      // push estimations in same order
      for (const batch of batches) {
        const batchChainId = batch.chainId ?? chainId
        const sdkForChainId = getSdkForChainId(batchChainId);

        if (!sdkForChainId) {
          estimatesBatches.push({ errorMessage: 'Failed to get SDK for chain!' });
          continue;
        }

        // TODO: move to etherspot sdk context lib
        if (!sdkForChainId.state.accountAddress) {
          isSdkConnecting = sdkForChainId.computeContractAccount({ sync: true });
          await isSdkConnecting;
          isSdkConnecting = undefined;
        }

        if (!batch.transactions) {
          estimatesBatches.push({ errorMessage: 'No transactions to estimate!' });
          continue;
        }

        try {
          sdkForChainId.clearGatewayBatch();

          await Promise.all(batch.transactions.map(async ({ to, value, data }) => {
            await sdkForChainId.batchExecuteAccountTransaction(({ to, value, data }));
          }));

          const { estimation } = await sdkForChainId.estimateGatewayBatch({ feeToken: batch.gasTokenAddress });

          const cost = batch.gasTokenAddress
            ? estimation.feeAmount
            : estimation.estimatedGasPrice.mul(estimation.estimatedGas)

          estimatesBatches.push({ cost });
        } catch (e) {
          // @ts-ignore
          estimatesBatches.push({ errorMessage: e?.message ?? 'Failed to estimate!' });
        }
      }

      return { id: groupedBatch.id, estimatedBatches: estimatesBatches };
    }));
  }

  const send = (batchesIds: string[]) => {

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
