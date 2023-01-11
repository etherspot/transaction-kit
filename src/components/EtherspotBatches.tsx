import React, { useContext } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

interface EtherspotBatchesProps {
  children?: React.ReactNode;
  skip?: boolean;
}

const EtherspotBatches = ({ children }: EtherspotBatchesProps) => {
  const context = useContext(EtherspotUiContext);

  if (context === null) {
    throw new Error('No parent <EtherspotUi />');
  }

  return children;
}

export default EtherspotBatches;
