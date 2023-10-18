import { useEtherspot } from '@etherspot/react-etherspot';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PrimeSdk, isWalletProvider, Web3WalletProvider } from '@etherspot/prime-sdk';

// contexts
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';

// utils
import { getObjectSortedByKeys } from '../utils/common';

// types
import { EstimatedBatch, IBatch, IBatches, IEstimatedBatches, ISentBatches, SentBatch } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

interface EtherspotTransactionKitContextProviderProps {
  children?: React.ReactNode;
}

let isSdkConnecting: Promise<any> | undefined;

let etherspotPrimeSdkPerChain: { [chainId: number]: PrimeSdk } = {};

const EtherspotTransactionKitContextProvider = ({ children }: EtherspotTransactionKitContextProviderProps) => {
  const { provider, chainId } = useEtherspot();
  const [groupedBatchesPerId, setGroupedBatchesPerId] = useState<TypePerId<IBatches>>({});

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
        if (!provider) {
          estimatedBatches.push({ ...batch, errorMessage: 'Failed to get Web3 provider!' });
          continue;
        }

        const batchChainId = batch.chainId ?? chainId;

        if (!batch.transactions) {
          estimatedBatches.push({ ...batch, errorMessage: 'No transactions to estimate!' });
          continue;
        }

        const etherspotPrimeSdkForChainId = await getEtherspotPrimeSdkForChainId(batchChainId);
        if (!etherspotPrimeSdkForChainId) {
          estimatedBatches.push({ ...batch, errorMessage: 'Failed to get Etherspot Prime SDK for chain!' });
          continue;
        }

        try {
          if (!forSending) await etherspotPrimeSdkForChainId.clearUserOpsFromBatch();

          await Promise.all(batch.transactions.map(async ({ to, value, data }) => {
            await etherspotPrimeSdkForChainId.addUserOpsToBatch(({ to, value, data }));
          }));

          const userOp = await etherspotPrimeSdkForChainId.estimate(groupedBatch.paymaster);
          const totalGas = await etherspotPrimeSdkForChainId.totalGasEstimated(userOp);
          estimatedBatches.push({ ...batch, cost: totalGas, userOp });
        } catch (e) {
          estimatedBatches.push({ ...batch, errorMessage: (e instanceof Error && e.message) || 'Failed to estimate!' });
        }
      }

      if (groupedBatch.onEstimated && !forSending) groupedBatch.onEstimated(estimatedBatches);

      return { ...groupedBatch, estimatedBatches };
    }));
  }

  useEffect(() => {
    // reset prime sdk instances on provider change
    etherspotPrimeSdkPerChain = {};
  }, [provider]);

  const getEtherspotPrimeSdkForChainId = useCallback(async (sdkChainId: number, forceNewInstance: boolean = false) => {
    if (etherspotPrimeSdkPerChain[sdkChainId] && !forceNewInstance) return etherspotPrimeSdkPerChain[sdkChainId];

    if (!provider) {
      console.warn('No initial provider set for Etherspot Prime');
      return null;
    }

    let mappedProvider;

    try {
      // @ts-ignore
      mappedProvider = isWalletProvider(provider) ? provider : new Web3WalletProvider(provider);
    } catch (e) {
      console.warn('Failed to map Etherspot Prime provider', e);
    }

    if (!mappedProvider) {
      console.warn('No mapped provider set for Etherspot Prime');
      return null;
    }

    try {
      // @ts-ignore
      if (mappedProvider) await mappedProvider.refresh();
    } catch (e) {
      // this should be ok to throw warning but proceed
      console.warn('Failed to refresh Etherspot Prime provider', e);
    }

    let sdkForChain = null;

    try {
      // @ts-ignore
      sdkForChain = new PrimeSdk(mappedProvider, { chainId: sdkChainId });

      etherspotPrimeSdkPerChain = {
        ...etherspotPrimeSdkPerChain,
        [sdkChainId]: sdkForChain,
      }
    } catch (e) {
      console.warn('Failed to create Etherspot Prime SDK', e);
    }

    return sdkForChain;
  }, [provider]);

  const send = async (batchesIds?: string[]): Promise<ISentBatches[]> => {
    const groupedBatchesToClean = Object.values<IBatches>(groupedBatchesPerId)
      .filter((groupedBatch) => (!batchesIds?.length|| batchesIds.some((batchesId) => batchesId === groupedBatch.id)));

    // clear any existing batches before new estimate & send
    await Promise.all(groupedBatchesToClean.map(async ({
      batches = [],
    }) => Promise.all(batches.map(async (batch) => {
      const batchChainId = batch.chainId ?? chainId;

      const etherspotPrimeSdkForChainId = await getEtherspotPrimeSdkForChainId(batchChainId);
      if (!etherspotPrimeSdkForChainId) return;

      await etherspotPrimeSdkForChainId.clearUserOpsFromBatch();
    }))));

    const estimated = await estimate(batchesIds, true);

    return Promise.all(estimated.map(async (estimatedBatches): Promise<ISentBatches> => {
      // hold when connecting
      if (isSdkConnecting) await isSdkConnecting;

      const sentBatches: SentBatch[] = [];

      // send in same order as estimated
      for (const estimatedBatch of estimatedBatches.estimatedBatches) {
        const batchChainId = estimatedBatch.chainId ?? chainId

        // return error message as provided by estimate
        if (estimatedBatch.errorMessage) {
          sentBatches.push({ ...estimatedBatch, errorMessage: estimatedBatch.errorMessage })
          continue;
        }

        const etherspotPrimeSdkForChainId = await getEtherspotPrimeSdkForChainId(batchChainId);
        if (!etherspotPrimeSdkForChainId) {
          sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get Etherspot Prime SDK for chain!' });
          continue;
        }

        if (!estimatedBatch.userOp) {
          sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get estimated UserOp!' });
          continue;
        }

        try {
          const userOpHash = await etherspotPrimeSdkForChainId.send(estimatedBatch.userOp);
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
    getEtherspotPrimeSdkForChainId,
  }), [
    chainId,
    groupedBatchesPerId,
    getEtherspotPrimeSdkForChainId,
  ]);

  return (
    <EtherspotTransactionKitContext.Provider value={{ data: contextData, setGroupedBatchesPerId }}>
      {children}
    </EtherspotTransactionKitContext.Provider>
  );
}

export default EtherspotTransactionKitContextProvider;
