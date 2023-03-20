import React, { useContext, useEffect } from 'react';
import { ethers } from 'ethers';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IEtherspotContractTransaction } from '../types/EtherspotUi';

// hooks
import useId from '../hooks/useId';

interface EtherspotContractTransactionProps extends IEtherspotContractTransaction {
  children?: React.ReactNode;
}

/**
 * @name EtherspotContractTransaction
 * @description Component allowing to build ABI based data transactions.
 * @param {EtherspotContractTransactionProps} props
 * @returns {React.ReactNode}
 */
const EtherspotContractTransaction = ({
  children,
  value,
  contractAddress,
  params,
  methodName,
  abi,
  id: transactionId
}: EtherspotContractTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

  let contractInterface;
  try {
    contractInterface = new ethers.utils.Interface(abi);
  } catch (e) {
    if (e instanceof Error && e?.message) {
      throw new Error(`Failed to build contract interface from provided ABI, please check ABI formatting: ${e.message}`);
    }
  }

  if (!contractInterface) {
    throw new Error(`Failed to build contract interface from provided ABI, please check ABI formatting.`);
  }

  let data: string | undefined;
  try {
    data = contractInterface.encodeFunctionData(methodName, params);
  } catch (e) {
    if (e instanceof Error && e?.message) {
      throw new Error(`Failed to build transaction data, please check data/method formatting: ${e.message}`);
    }
  }

  if (!data) {
    throw new Error(`Failed to build transaction data, please check data/method formatting.`);
  }

  useEffect(() => {
    let valueBN;
    if (value) {
      valueBN = typeof value === 'string' && !ethers.BigNumber.isBigNumber(value)
        ? ethers.utils.parseEther(value)
        : value;
    }

    const transaction = {
      id: transactionId ?? componentId,
      to: contractAddress,
      data,
      value: valueBN
    };

    context.setTransactionsPerId((current) => ({ ...current, [componentId]: transaction }));

    return () => {
      context.setTransactionsPerId((current) => {
        delete current[componentId];
        return current;
      });
    }
  }, [componentId, value, transactionId]);

  return <>{children}</>;
};

export default EtherspotContractTransaction;
