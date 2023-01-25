import React, { useContext, useEffect, useId, useState } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';
import EtherspotBatchesContext from '../contexts/EtherspotBatchesContext';
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IBatch, IBatches } from '../types/EtherspotUi';
import { TypePerId } from '../types/Helper';

// utils
import { getObjectSortedByKeys } from '../utils/common';

interface EtherspotBatchesProps extends IBatches {
  children?: React.ReactNode;
}

const EtherspotBatches = ({ children, skip, onEstimated, id: batchId }: EtherspotBatchesProps) => {
  const context = useContext(EtherspotUiContext);
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
    throw new Error('No parent <EtherspotUi />');
  }

  useEffect(() => {
    const groupedBatch = {
      id: batchId,
      skip,
      batches: getObjectSortedByKeys(batchesPerId),
      onEstimated,
    };

    context.setGroupedBatchesPerId((current) => ({ ...current, [componentId]: groupedBatch }));

    return () => {
      context.setGroupedBatchesPerId((current) => {
        delete current[componentId];
        return current;
      });
    }
  }, [componentId, batchesPerId, skip, batchId, onEstimated]);

  return (
    <EtherspotBatchesContext.Provider value={{ setBatchesPerId }}>
      {children}
    </EtherspotBatchesContext.Provider>
  );
}

export default EtherspotBatches;
