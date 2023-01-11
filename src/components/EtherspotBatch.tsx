import React, { useContext } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

interface EtherspotBatchProps {
  children?: React.ReactNode;
  chainId?: number;
  gasToken?: string;
}

const EtherspotBatch = ({ children }: EtherspotBatchProps) => {
  const context = useContext(EtherspotUiContext);

  if (context === null) {
    throw new Error('No parent <EtherspotUi />');
  }

  return children;
}

export default EtherspotBatch;
