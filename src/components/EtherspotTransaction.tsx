import React, { useContext, useEffect } from 'react';
import { ethers } from 'ethers';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { ITransaction } from '../types/EtherspotTransactionKit';

// hooks
import useId from '../hooks/useId';

interface EtherspotTransactionProps extends ITransaction {
  children?: React.ReactNode;
}

const EtherspotTransaction = ({
  children,
  to,
  data,
  value,
  id: transactionId,
}: EtherspotTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
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

  return <>{children}</>;
};

export default EtherspotTransaction;
