import { useEtherspot } from '@etherspot/react-etherspot';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PrimeSdk, isWalletProvider, Web3WalletProvider } from '@etherspot/prime-sdk';
import { AccountStates } from 'etherspot';
import { ethers } from 'ethers';

// contexts
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';

// utils
import { getObjectSortedByKeys, isTestnetChainId, parseEtherspotErrorMessageIfAvailable } from '../utils/common';

// types
import { EstimatedBatch, IBatch, IBatches, IEstimatedBatches, ISentBatches, SentBatch } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

interface EtherspotTransactionKitContextProviderProps {
  children?: React.ReactNode;
}

let isSdkConnecting: Promise<any> | undefined;

let etherspotPrimeSdkPerChain: { [chainId: number]: PrimeSdk } = {};

const EtherspotTransactionKitContextProvider = ({ children }: EtherspotTransactionKitContextProviderProps) => {
  const { getSdkForChainId, connect, provider, chainId } = useEtherspot();
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
        if (!provider) {
          estimatedBatches.push({ ...batch, errorMessage: 'Failed to get Web3 provider!' });
          continue;
        }

        const batchChainId = batch.chainId ?? chainId;

        if (!batch.transactions) {
          estimatedBatches.push({ ...batch, errorMessage: 'No transactions to estimate!' });
          continue;
        }

        if (groupedBatch.via === 'etherspot-prime') {
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

            // TODO: add actual estimation when available on Etherspot Prime
            estimatedBatches.push({ ...batch, cost: ethers.BigNumber.from(0) });
          } catch (e) {
            estimatedBatches.push({ ...batch, errorMessage: (e instanceof Error && e.message) || 'Failed to estimate!' });
          }
        } else {
          const sdkForChainId = getSdkForChainId(batchChainId);

          if (!sdkForChainId) {
            estimatedBatches.push({ ...batch, errorMessage: 'Failed to get Etherspot SDK for chain!' });
            continue;
          }

          await connectToSdkForChainIfNeeded(batchChainId);

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
      via,
    }) => Promise.all(batches.map(async (batch) => {
      const batchChainId = batch.chainId ?? chainId;

      if (via === 'etherspot-prime') {
        const etherspotPrimeSdkForChainId = await getEtherspotPrimeSdkForChainId(batchChainId);
        if (!etherspotPrimeSdkForChainId) return;
        await etherspotPrimeSdkForChainId.clearUserOpsFromBatch();
        return;
      }

      const sdkForChainId = getSdkForChainId(batchChainId);
      if (!sdkForChainId) return;

      sdkForChainId.clearGatewayBatch();
    }))));

    const estimated = await estimate(batchesIds, true);

    return Promise.all(estimated.map(async (estimatedBatches): Promise<ISentBatches> => {
      // hold when connecting
      if (isSdkConnecting) await isSdkConnecting;

      const sentBatches: SentBatch[] = [];

      const via = estimatedBatches.via ?? 'etherspot';

      // send in same order as estimated
      for (const estimatedBatch of estimatedBatches.estimatedBatches) {
        const batchChainId = estimatedBatch.chainId ?? chainId

        // return error message as provided by estimate
        if (estimatedBatch.errorMessage) {
          sentBatches.push({ ...estimatedBatch, via, errorMessage: estimatedBatch.errorMessage })
          continue;
        }

        if (estimatedBatches.via === 'etherspot-prime') {
          const etherspotPrimeSdkForChainId = await getEtherspotPrimeSdkForChainId(batchChainId);
          if (!etherspotPrimeSdkForChainId) {
            sentBatches.push({ ...estimatedBatch, via, errorMessage: 'Failed to get Etherspot Prime SDK for chain!' });
            continue;
          }

          try {
            const estimated = await etherspotPrimeSdkForChainId.estimate(estimatedBatches.paymaster);
            const userOpHash = await etherspotPrimeSdkForChainId.send(estimated);
            sentBatches.push({ ...estimatedBatch, via, userOpHash });
          } catch (e) {
            sentBatches.push({ ...estimatedBatch, via, errorMessage: (e instanceof Error && e.message) || 'Failed to estimate!' });
          }
        } else {
          const sdkForChainId = getSdkForChainId(batchChainId);
          if (!sdkForChainId) {
            sentBatches.push({ ...estimatedBatch, via, errorMessage: 'Failed to get Etherspot SDK for chain!' });
            continue;
          }

          await connectToSdkForChainIfNeeded(batchChainId);

          try {
            // testnets does not have guards
            const guarded = !isTestnetChainId(batchChainId);
            const { hash: batchHash } = await sdkForChainId.submitGatewayBatch({ guarded });
            sentBatches.push({ ...estimatedBatch, via, batchHash });
          } catch (e) {
            const rawErrorMessage = e instanceof Error && e.message;
            const errorMessage = parseEtherspotErrorMessageIfAvailable(rawErrorMessage || 'Failed to send!');
            sentBatches.push({ ...estimatedBatch, via, errorMessage });
          }
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
