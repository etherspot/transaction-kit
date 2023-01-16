import React, { useContext } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

// types
import { IBatch } from '../types/EtherspotUi';

interface EtherspotBatchProps extends IBatch {
  children?: React.ReactNode;
}

const EtherspotBatch = ({ children }: EtherspotBatchProps) => {
  const context = useContext(EtherspotUiContext);

  if (context === null) {
    throw new Error('No parent <EtherspotUi />');
  }

  return children;
}

export default EtherspotBatch;
