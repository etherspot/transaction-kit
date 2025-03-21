import { BigNumber } from 'ethers';
import React, { useContext, useEffect } from 'react';
import { Abi, encodeFunctionData, parseEther } from 'viem';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IEtherspotContractTransaction } from '../types/EtherspotTransactionKit';

// hooks
import useId from '../hooks/useId';

interface EtherspotContractTransactionProps
  extends IEtherspotContractTransaction {
  children?: React.ReactNode;
}

/**
 * @name EtherspotContractTransaction
 * @description Component allowing to build ABI based data transactions.
 * @param {EtherspotContractTransactionProps} props
 * @returns {JSX.Element}
 */
const EtherspotContractTransaction = ({
  children,
  value,
  contractAddress,
  params,
  methodName,
  abi,
  id: transactionId,
}: EtherspotContractTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

  let data: string | undefined;
  try {
    data = encodeFunctionData({
      abi: abi as Abi,
      functionName: methodName,
      args: params,
    });
  } catch (e) {
    if (e instanceof Error && e?.message) {
      throw new Error(
        `Failed to build transaction data, please check data/method formatting: ${e.message}`
      );
    }
  }

  if (!data) {
    throw new Error(
      'Failed to build transaction data, please check data/method formatting.'
    );
  }

  useEffect(() => {
    let valueBN;
    if (value) {
      valueBN =
        typeof value === 'string' && !BigNumber.isBigNumber(value)
          ? parseEther(value)
          : value;
    }

    const transaction = {
      id: transactionId ?? componentId,
      to: contractAddress,
      data,
      value: valueBN,
    };

    context.setTransactionsPerId((current) => ({
      ...current,
      [componentId]: transaction,
    }));

    return () => {
      context.setTransactionsPerId((current) => {
        // eslint-disable-next-line no-param-reassign
        delete current[componentId];
        return current;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentId, value, transactionId]);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
};

export default EtherspotContractTransaction;
