import React, { Children, useContext, useEffect, useId } from 'react';
import { ethers } from 'ethers';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { ITransaction } from '../types/EtherspotUi';

interface EtherspotTransactionProps extends ITransaction {
  children?: React.ReactNode;
}

const EtherspotTransaction = ({ children, to, data, value, id: transactionId }: EtherspotTransactionProps) => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

  if (children && Children.toArray(children)?.length) {
    throw new Error(`No children components allowed within <EtherspotTransaction />`)
  }

  useEffect(() => {
    let valueBN;
    if (value) {
      valueBN = typeof value === 'string' && !ethers.BigNumber.isBigNumber(value)
        ? ethers.utils.parseEther(value)
        : value;
    }

    const transaction = { id: transactionId ?? componentId, to, data, value: valueBN };

    context.setTransactionsPerId((current) => ({ ...current, [componentId]: transaction }));

    return () => {
      context.setTransactionsPerId((current) => {
        delete current[componentId];
        return current;
      });
    }
  }, [componentId, to, data, value, transactionId]);

  return null;
};

export default EtherspotTransaction;
