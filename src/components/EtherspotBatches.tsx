import React, { useContext } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

// types
import { IBatchGroup } from '../types/EtherspotUi';

interface EtherspotBatchesProps extends IBatchGroup {
  children?: React.ReactNode;
}

const EtherspotBatches = ({ children }: EtherspotBatchesProps) => {
  const context = useContext(EtherspotUiContext);

  if (context === null) {
    throw new Error('No parent <EtherspotUi />');
  }

  return children;
}

export default EtherspotBatches;
