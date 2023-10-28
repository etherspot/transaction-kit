import React, { useContext, useEffect, useState } from 'react';

// contexts
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';
import EtherspotBatchesContext from '../contexts/EtherspotBatchesContext';
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IBatch, IBatches } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

// utils
import { getObjectSortedByKeys } from '../utils/common';

// hooks
import useId from '../hooks/useId';

type EtherspotBatchesProps = IBatches & {
  children?: React.ReactNode;
}

const EtherspotBatches = (props: EtherspotBatchesProps) => {
  const {
    children,
    skip,
    onEstimated,
    onSent,
    id: batchesId,
    paymaster,
  } = props;

  const context = useContext(EtherspotTransactionKitContext);
  const existingBatchesContext = useContext(EtherspotBatchesContext);
  const existingBatchContext = useContext(EtherspotBatchContext);

  const componentId = useId();
  const [batchesPerId, setBatchesPerId] = useState<TypePerId<IBatch>>({});

  if (existingBatchesContext !== null) {
    throw new Error('<EtherspotBatches /> cannot be inside <EtherspotBatches />');
  }

  if (existingBatchContext !== null) {
    throw new Error('<EtherspotBatches /> cannot be inside <EtherspotBatch />');
  }

  if (context === null) {
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  useEffect(() => {
    let groupedBatch: IBatches = {
      id: batchesId ?? componentId,
      skip,
      batches: getObjectSortedByKeys(batchesPerId),
      onEstimated,
      onSent,
      paymaster,
    };

    context.setGroupedBatchesPerId((current) => ({ ...current, [componentId]: groupedBatch }));

    return () => {
      context.setGroupedBatchesPerId((current) => {
        delete current[componentId];
        return current;
      });
    }
  }, [
    componentId,
    batchesPerId,
    skip,
    batchesId,
    paymaster?.url,
    paymaster?.api_key,
    paymaster?.context,
  ]);

  return (
    <EtherspotBatchesContext.Provider value={{ setBatchesPerId }}>
      {children}
    </EtherspotBatchesContext.Provider>
  );
}

export default EtherspotBatches;
