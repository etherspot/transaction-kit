import React, { Children, useContext, useEffect, useId } from 'react';

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
    const transaction = { id: transactionId ?? componentId, to, data, value };

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
