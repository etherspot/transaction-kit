import React, { useMemo, useState } from 'react';
import { useEtherspot } from '@etherspot/react-etherspot';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

// utils
import { getObjectSortedByKeys, isTestnetChainId, parseEtherspotErrorMessageIfAvailable } from '../utils/common';
import uniq from 'lodash.uniq';

// types
import { EstimatedBatch, IBatch, IBatches, IEstimatedBatches, ISentBatches, ISmartWalletAddress, SentBatch } from '../types/EtherspotUi';
import { TypePerId } from '../types/Helper';
import { AccountStates } from 'etherspot';

interface EtherspotUiContextProviderProps {
  chainId?: number | undefined;
  children?: React.ReactNode;
}

let isSdkConnecting: Promise<any> | undefined;

const EtherspotUiContextProvider = ({ children, chainId = 1 }: EtherspotUiContextProviderProps) => {
  const { getSdkForChainId, connect } = useEtherspot();
  const [groupedBatchesPerId, setGroupedBatchesPerId] = useState<TypePerId<IBatches>>({});

  const connectToSdkForChainIfNeeded = async (chainId: number) => {
    isSdkConnecting = connect(chainId);
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

        await connectToSdkForChainIfNeeded(batchChainId);

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

        await connectToSdkForChainIfNeeded(batchChainId);

        try {
          // testnets does not have guards
          const guarded = !isTestnetChainId(batchChainId);
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

  /**
   * @name smartWalletAddresses
   * @description Accesses the underlying Etherspot SDK
   * and returns the smart wallet address for each chain.
   *
   * @returns Array[ISmartWalletAddress]
   */
  const smartWalletAddresses = async (): Promise<(ISmartWalletAddress[])> => {
    // Lets set our definitions
    let chainIds: (number | undefined)[] = [];
    const computedContractResponses: ISmartWalletAddress[] = [];

    // Next, let's get our grouped batches
    const groupedBatches = Object.values<IBatches>(groupedBatchesPerId);

    // Next, loop through the grouped batches, if any...
    for (let index = 0; index < groupedBatches.length; index++) {
      // And collect all the data we need about our batches.
      const groupedBatch = groupedBatches[index];
      const batches = (groupedBatch.batches ?? []) as IBatch[];

      // Collect the chain IDs used here...
      chainIds = batches.map((batch) => batch.chainId || chainId);
    }

    // A little housekeeping - clean up any duplicates
    chainIds = uniq(chainIds);

    // Our next step is to cycle through all our chain IDs found
    // in each batch and call the corresponding Etherspot SDK
    // and computeContractAccount method which will return the
    // smart wallet address that users can use.
    for (let index = 0; index < chainIds.length; index++) {
      const batchChainId = chainIds[index];

      if (batchChainId) {
        const sdk = getSdkForChainId(batchChainId);

        if (sdk) {
          const response = await sdk.computeContractAccount();
          computedContractResponses.push({
            chainId: batchChainId,
            address: response.address,
          });
        }
      }
    }

    // FInally, return this to the caller.
    return computedContractResponses;
  }

  const contextData = useMemo(() => ({
    batches: getObjectSortedByKeys(groupedBatchesPerId),
    estimate,
    send,
    smartWalletAddresses,
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
