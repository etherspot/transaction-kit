import React, { useContext, useEffect, useId, useState } from 'react';

// contexts
import EtherspotBatchesContext from '../contexts/EtherspotBatchesContext';
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IBatch, ITransaction } from '../types/EtherspotUi';
import { TypePerId } from '../types/Helper';

// utils
import { getObjectSortedByKeys } from '../utils/common';

interface EtherspotBatchProps extends IBatch {
  children?: React.ReactNode;
}

const EtherspotBatch = ({ children, chainId, gasTokenAddress }: EtherspotBatchProps) => {
  const context = useContext(EtherspotBatchesContext);
  const existingBatchContext = useContext(EtherspotBatchContext);
  const componentId = useId();
  const [transactionsPerId, setTransactionsPerId] = useState<TypePerId<ITransaction>>({});

  if (existingBatchContext !== null) {
    throw new Error('<EtherspotBatch /> cannot be inside <EtherspotBatch />');
  }

  if (context === null) {
    throw new Error('No parent <EtherspotBatches />');
  }

  useEffect(() => {
    const batch = {
      chainId,
      gasTokenAddress,
      transactions: getObjectSortedByKeys(transactionsPerId),
    };

    context.setBatchesPerId((current) => ({ ...current, [componentId]: batch }));

    return () => {
      context.setBatchesPerId((current) => {
        delete current[componentId];
        return current;
      });
    }
  }, [componentId, transactionsPerId, chainId, gasTokenAddress]);

  return (
    <EtherspotBatchContext.Provider value={{ setTransactionsPerId }}>
      {children}
    </EtherspotBatchContext.Provider>
  );
}

export default EtherspotBatch;
