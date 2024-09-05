/* eslint-disable react/jsx-no-constructed-context-values */
import React, { useContext, useEffect, useState } from 'react';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';
import EtherspotBatchesContext from '../contexts/EtherspotBatchesContext';
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';

// types
import { IBatch, IBatches } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

// utils
import { getObjectSortedByKeys } from '../utils/common';

// hooks
import useDeepCompare from '../hooks/useDeepCompare';
import useId from '../hooks/useId';

type EtherspotBatchesProps = IBatches & {
  children?: React.ReactNode;
};

const EtherspotBatches = (props: EtherspotBatchesProps) => {
  const {
    children,
    skip,
    onEstimated,
    onSent,
    id: batchesId,
    paymaster: paymasterObject,
  } = props;

  const context = useContext(EtherspotTransactionKitContext);
  const existingBatchesContext = useContext(EtherspotBatchesContext);
  const existingBatchContext = useContext(EtherspotBatchContext);

  const componentId = useId();
  const [batchesPerId, setBatchesPerId] = useState<TypePerId<IBatch>>({});
  const paymaster = useDeepCompare(paymasterObject);

  if (existingBatchesContext !== null) {
    throw new Error(
      '<EtherspotBatches /> cannot be inside <EtherspotBatches />'
    );
  }

  if (existingBatchContext !== null) {
    throw new Error('<EtherspotBatches /> cannot be inside <EtherspotBatch />');
  }

  if (context === null) {
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  useEffect(() => {
    const groupedBatch: IBatches = {
      id: batchesId ?? componentId,
      skip,
      batches: getObjectSortedByKeys(batchesPerId),
      onEstimated,
      onSent,
      paymaster,
    };

    context.setGroupedBatchesPerId((current) => ({
      ...current,
      [componentId]: groupedBatch,
    }));

    return () => {
      context.setGroupedBatchesPerId((current) => {
        // eslint-disable-next-line no-param-reassign
        delete current[componentId];
        return current;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentId, batchesPerId, skip, batchesId, paymaster]);

  return (
    <EtherspotBatchesContext.Provider value={{ setBatchesPerId }}>
      {children}
    </EtherspotBatchesContext.Provider>
  );
};

export default EtherspotBatches;
