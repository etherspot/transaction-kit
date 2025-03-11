/* eslint-disable react/jsx-no-constructed-context-values */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { BigNumber } from 'ethers';
import React, { useMemo, useState } from 'react';

// contexts
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';

// utils
import { getObjectSortedByKeys } from '../utils/common';

// hooks
import useEtherspot from '../hooks/useEtherspot';

// types
import {
  EstimatedBatch,
  IBatch,
  IBatches,
  IEstimatedBatches,
  ISentBatches,
  SentBatch,
} from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

interface EtherspotTransactionKitContextProviderProps {
  children?: React.ReactNode;
}

const parseEtherspotErrorMessage = (
  e: Error | unknown,
  defaultMessage: string
): string => {
  return (e instanceof Error && e.message) || defaultMessage;
};

const EtherspotTransactionKitContextProvider = ({
  children,
}: EtherspotTransactionKitContextProviderProps) => {
  const { provider, chainId, getSdk } = useEtherspot();
  const [groupedBatchesPerId, setGroupedBatchesPerId] = useState<
    TypePerId<IBatches>
  >({});
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [containsSendingError, setContainsSendingError] =
    useState<boolean>(false);
  const [containsEstimatingError, setContainsEstimatingError] =
    useState<boolean>(false);

  const estimate = async (
    batchesIds?: string[],
    forSending: boolean = false
  ): Promise<IEstimatedBatches[]> => {
    if (!forSending) {
      setIsEstimating(true);
      setContainsSendingError(false);
    }

    const groupedBatchesToEstimate = Object.values<IBatches>(
      groupedBatchesPerId
    ).filter(
      (groupedBatch) =>
        !batchesIds?.length ||
        batchesIds.some((batchesId) => batchesId === groupedBatch.id)
    );

    const result = await Promise.all(
      groupedBatchesToEstimate.map(
        async (groupedBatch): Promise<IEstimatedBatches> => {
          const batches = (groupedBatch.batches ?? []) as IBatch[];

          if (groupedBatch.skip)
            return { ...groupedBatch, estimatedBatches: [] };

          const estimatedBatches: EstimatedBatch[] = [];

          // push estimations in same order
          for (const batch of batches) {
            if (!provider) {
              estimatedBatches.push({
                ...batch,
                errorMessage: 'Failed to get Web3 provider!',
              });
              continue;
            }

            const batchChainId = batch.chainId ?? chainId;

            if (!batch.transactions) {
              estimatedBatches.push({
                ...batch,
                errorMessage: 'No transactions to estimate!',
              });
              continue;
            }

            // force new instance for each batch to not mix up user ops added to SDK state batch
            const etherspotModulaSdk = await getSdk(batchChainId, true);

            try {
              if (!forSending) await etherspotModulaSdk.clearUserOpsFromBatch();

              await Promise.all(
                batch.transactions.map(async ({ to, value, data }) => {
                  await etherspotModulaSdk.addUserOpsToBatch({
                    to,
                    value,
                    data,
                  });
                })
              );

              const userOp = await etherspotModulaSdk.estimate({
                paymasterDetails: groupedBatch.paymaster,
              });
              const totalGas =
                await etherspotModulaSdk.totalGasEstimated(userOp);
              estimatedBatches.push({
                ...batch,
                cost: totalGas.mul(userOp.maxFeePerGas as BigNumber),
                userOp,
              });
            } catch (e) {
              const errorMessage = parseEtherspotErrorMessage(
                e,
                'Failed to estimate!'
              );
              estimatedBatches.push({ ...batch, errorMessage });
            }
          }

          if (groupedBatch.onEstimated && !forSending)
            groupedBatch.onEstimated(estimatedBatches);

          return { ...groupedBatch, estimatedBatches };
        }
      )
    );

    if (!forSending) {
      const containsError = result.some((group) =>
        group.estimatedBatches.some((batch) => !!batch.errorMessage)
      );
      setContainsEstimatingError(containsError);
      setIsEstimating(false);
    }

    return result;
  };

  const send = async (batchesIds?: string[]): Promise<ISentBatches[]> => {
    setIsSending(true);
    setContainsSendingError(false);

    const groupedBatchesToClean = Object.values<IBatches>(
      groupedBatchesPerId
    ).filter(
      (groupedBatch) =>
        !batchesIds?.length ||
        batchesIds.some((batchesId) => batchesId === groupedBatch.id)
    );

    // clear any existing batches before new estimate & send
    await Promise.all(
      groupedBatchesToClean.map(async ({ batches = [] }) =>
        Promise.all(
          batches.map(async (batch) => {
            const batchChainId = batch.chainId ?? chainId;

            const etherspotModulaSdk = await getSdk(batchChainId);

            await etherspotModulaSdk.clearUserOpsFromBatch();
          })
        )
      )
    );

    const estimated = await estimate(batchesIds, true);

    const result = await Promise.all(
      estimated.map(async (estimatedBatches): Promise<ISentBatches> => {
        const sentBatches: SentBatch[] = [];

        // send in same order as estimated
        for (const estimatedBatch of estimatedBatches.estimatedBatches) {
          const batchChainId = estimatedBatch.chainId ?? chainId;

          // return error message as provided by estimate
          if (estimatedBatch.errorMessage) {
            sentBatches.push({
              ...estimatedBatch,
              errorMessage: estimatedBatch.errorMessage,
            });
            continue;
          }

          const etherspotModulaSdk = await getSdk(batchChainId);

          if (!estimatedBatch.userOp) {
            sentBatches.push({
              ...estimatedBatch,
              errorMessage: 'Failed to get estimated UserOp!',
            });
            continue;
          }

          try {
            const userOpHash = await etherspotModulaSdk.send(
              estimatedBatch.userOp
            );

            // get transaction hash or userOp receipt...
            let userOpsReceipt = null;
            const timeout = Date.now() + 30 * 1000; // 30 seconds timeout

            while (!userOpsReceipt && Date.now() < timeout) {
              await new Promise<void>((resolve) => {
                setTimeout(resolve, 2000);
              }); // Retry every 2 sec

              try {
                userOpsReceipt =
                  await etherspotModulaSdk.getUserOpReceipt(userOpHash);
              } catch (error) {
                console.error('Error fetching transaction hash:', error);
              }
            }

            if (!userOpsReceipt) {
              console.warn(
                'Failed to get the transaction hash within 30 seconds.'
              );
            } else {
              sentBatches.push({
                ...estimatedBatch,
                userOpHash,
                transactionHash: userOpsReceipt,
              });
            }
          } catch (e) {
            const errorMessage = parseEtherspotErrorMessage(
              e,
              'Failed to send!'
            );
            sentBatches.push({ ...estimatedBatch, errorMessage });
          }
        }

        if (estimatedBatches.onSent) estimatedBatches.onSent(sentBatches);

        return { ...estimatedBatches, sentBatches };
      })
    );

    const containsError = result.some((group) => {
      return (
        group.estimatedBatches.some((batch) => !!batch.errorMessage) || // estimate error during sending
        group.sentBatches.some((batch) => !!batch.errorMessage)
      );
    });

    setContainsSendingError(containsError);
    setIsSending(false);

    return result;
  };

  const getTransactionHash = async (
    userOpHash: string,
    batchId: number
  ): Promise<string | null> => {
    const etherspotModulaSdk = await getSdk(batchId);

    let transactionHash = null;
    const timeout = Date.now() + 30 * 1000; // 30 seconds timeout

    while (!transactionHash && Date.now() < timeout) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      }); // Retry every 2 sec

      try {
        transactionHash = await etherspotModulaSdk.getUserOpReceipt(userOpHash);
      } catch (error) {
        console.error('Error fetching transaction hash:', error);
      }
    }

    if (!transactionHash) {
      console.warn('Failed to get the transaction hash within 30 seconds.');
    }

    return transactionHash;
  };

  const contextData = useMemo(
    () => ({
      batches: getObjectSortedByKeys(groupedBatchesPerId),
      estimate,
      send,
      getTransactionHash,
      chainId,
      isEstimating,
      isSending,
      containsEstimatingError,
      containsSendingError,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      chainId,
      groupedBatchesPerId,
      isEstimating,
      isSending,
      containsEstimatingError,
      containsSendingError,
    ]
  );

  return (
    <EtherspotTransactionKitContext.Provider
      value={{ data: contextData, setGroupedBatchesPerId }}
    >
      {children}
    </EtherspotTransactionKitContext.Provider>
  );
};

export default EtherspotTransactionKitContextProvider;
