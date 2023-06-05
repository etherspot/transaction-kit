import { useEtherspot } from '@etherspot/react-etherspot';
import React, { useMemo, useState } from 'react';
import { PrimeSdk } from 'etherspot-prime';
import { AccountStates, EnvNames, NETWORK_NAME_TO_CHAIN_ID } from 'etherspot';
import { ethers } from 'ethers';

// contexts
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';

// utils
import { getObjectSortedByKeys, isTestnetChainId, parseEtherspotErrorMessageIfAvailable } from '../utils/common';

// types
import { EstimatedBatch, IBatch, IBatches, IEstimatedBatches, ISentBatches, SentBatch } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

interface EtherspotTransactionKitContextProviderProps {
  chainId?: number | undefined;
  children?: React.ReactNode;
}

let isSdkConnecting: Promise<any> | undefined;

let etherspotPrimeSdkPerChain: { [chainId: number]: PrimeSdk } = {};

const EtherspotTransactionKitContextProvider = ({ children, chainId = 1 }: EtherspotTransactionKitContextProviderProps) => {
  const { getSdkForChainId, connect, provider } = useEtherspot();
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
          const etherspotPrimeSdkForChainId = getEtherspotPrimeSdkForChainId(batchChainId);
          if (!etherspotPrimeSdkForChainId) {
            estimatedBatches.push({ ...batch, errorMessage: 'Failed to get Etherspot Prime SDK for chain!' });
            continue;
          }

          try {
            if (!forSending) await etherspotPrimeSdkForChainId.clearTransactionsFromBatch();

            await Promise.all(batch.transactions.map(async ({ to, value, data }) => {
              await etherspotPrimeSdkForChainId.addTransactionToBatch(({ to, value, data }));
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

  const getEtherspotPrimeSdkForChainId = (sdkChainId: number, forceNewInstance: boolean = false) => {
    if (etherspotPrimeSdkPerChain[sdkChainId] && !forceNewInstance) return etherspotPrimeSdkPerChain[sdkChainId];

    if (!provider) return null;

    const networkNames = Object.keys(NETWORK_NAME_TO_CHAIN_ID);
    const matchingNetworkName = networkNames.find((networkName) => NETWORK_NAME_TO_CHAIN_ID[networkName] === sdkChainId);
    if (!matchingNetworkName) return null;

    // @ts-ignore
    const sdkForChain = new PrimeSdk(provider, {
      networkName: matchingNetworkName,
      env: isTestnetChainId(sdkChainId) ? EnvNames.TestNets : EnvNames.MainNets,
    });

    etherspotPrimeSdkPerChain = {
      ...etherspotPrimeSdkPerChain,
      [sdkChainId]: sdkForChain,
    }

    return sdkForChain;
  }

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
        const etherspotPrimeSdkForChainId = getEtherspotPrimeSdkForChainId(batchChainId);
        if (!etherspotPrimeSdkForChainId) return;
        await etherspotPrimeSdkForChainId.clearTransactionsFromBatch();
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

      // send in same order as estimated
      for (const estimatedBatch of estimatedBatches.estimatedBatches) {
        const batchChainId = estimatedBatch.chainId ?? chainId

        // return error message as provided by estimate
        if (estimatedBatch.errorMessage) {
          sentBatches.push({ ...estimatedBatch, errorMessage: estimatedBatch.errorMessage });
          continue;
        }

        if (estimatedBatches.via === 'etherspot-prime') {
          const etherspotPrimeSdkForChainId = getEtherspotPrimeSdkForChainId(batchChainId);
          if (!etherspotPrimeSdkForChainId) {
            sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get Etherspot Prime SDK for chain!' });
            continue;
          }

          try {
            // @ts-ignore
            const op = await etherspotPrimeSdkForChainId.sign();
            const uoHash = await etherspotPrimeSdkForChainId.send(op);
            console.log({ uoHash })
            const txHash = await etherspotPrimeSdkForChainId.getUserOpReceipt(uoHash);
            console.log({ txHash })
            sentBatches.push({ ...estimatedBatch, batchHash: '0x' });
          } catch (e) {
            sentBatches.push({ ...estimatedBatch, errorMessage: (e instanceof Error && e.message) || 'Failed to estimate!' });
          }
        } else {
          const sdkForChainId = getSdkForChainId(batchChainId);
          if (!sdkForChainId) {
            sentBatches.push({ ...estimatedBatch, errorMessage: 'Failed to get Etherspot SDK for chain!' });
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
