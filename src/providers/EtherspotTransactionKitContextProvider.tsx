/* eslint-disable react/jsx-no-constructed-context-values */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { BigNumber } from 'ethers';
import React, { useMemo, useState } from 'react';
import { toHex } from 'viem';

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
  SendOptions,
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

  const send = async (
    batchesIds?: string[],
    options?: SendOptions
  ): Promise<ISentBatches[]> => {
    const {
      retryOnFeeTooLow = false,
      maxRetries = 0,
      feeMultiplier = 1.1,
    } = options || {};

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

    // this will only try to resent if the maxRetries param is set higher than 0
    const sendWithRetries = async (
      estimatedBatch: EstimatedBatch
    ): Promise<SentBatch> => {
      let attempt = 0;
      let userOp = { ...estimatedBatch.userOp };
      const batchChainId = estimatedBatch.chainId ?? chainId;
      const sdk = await getSdk(batchChainId);

      while (attempt <= maxRetries) {
        try {
          const userOpHash = await sdk.send(userOp);
          return { ...estimatedBatch, userOpHash };
        } catch (e) {
          // if it catches an error that has fee too low issue, it will retry with a higher gas fee
          const errorMessage = parseEtherspotErrorMessage(e, 'Failed to send!');
          const isFeeTooLow = errorMessage.includes('fee too low');

          if (
            retryOnFeeTooLow &&
            isFeeTooLow &&
            userOp?.maxFeePerGas != null &&
            userOp?.maxPriorityFeePerGas != null
          ) {
            attempt++;
            const maxFee = BigInt(userOp.maxFeePerGas.toString());
            const maxFeeMultiplier = BigInt(Math.floor(feeMultiplier * 100));
            const maxNewFee = (maxFee * maxFeeMultiplier) / BigInt(100);

            const maxPriorityFee = BigInt(
              userOp.maxPriorityFeePerGas.toString()
            );
            const maxFeePriorityMultiplier = BigInt(
              Math.floor(feeMultiplier * 100)
            );
            const maxPriorityNewFee =
              (maxPriorityFee * maxFeePriorityMultiplier) / BigInt(100);

            userOp = {
              ...userOp,
              maxFeePerGas: toHex(maxNewFee),
              maxPriorityFeePerGas: toHex(maxPriorityNewFee),
            };
          } else {
            throw e;
          }
        }
      }

      throw new Error('Failed to send after retries.');
    };

    const result: ISentBatches[] = await Promise.all(
      estimated.map(async (estimatedBatches): Promise<ISentBatches> => {
        const sentBatches: SentBatch[] = [];

        // send in same order as estimated
        for (const estimatedBatch of estimatedBatches.estimatedBatches) {
          // return error message as provided by estimate
          if (estimatedBatch.errorMessage) {
            sentBatches.push({
              ...estimatedBatch,
              errorMessage: estimatedBatch.errorMessage,
            });
            continue;
          }

          if (!estimatedBatch.userOp) {
            sentBatches.push({
              ...estimatedBatch,
              errorMessage: 'Failed to get estimated UserOp!',
            });
            continue;
          }

          try {
            const sent = await sendWithRetries(estimatedBatch);
            sentBatches.push(sent);
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
    txChainId: number,
    timeout: number = 60 * 1000, // Default to 60 sec
    retryInterval: number = 2000 // Default to 2 sec
  ): Promise<string | null> => {
    const etherspotModulaSdk = await getSdk(txChainId);

    let transactionHash = null;
    const timeoutTotal = Date.now() + timeout; // Timeout duration

    while (!transactionHash && Date.now() < timeoutTotal) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, retryInterval);
      }); // Retry every retryInterval ms

      try {
        transactionHash = await etherspotModulaSdk.getUserOpReceipt(userOpHash);
      } catch (error) {
        console.error(
          'Error fetching transaction hash. Please check if the transaction has gone through, or try to send the transaction again:',
          error
        );
      }
    }

    if (!transactionHash) {
      console.warn(
        'Failed to get the transaction hash within time limit. Please try again'
      );
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
