import React, { Children, useContext } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

// types
import { ITransaction } from '../types/EtherspotUi';

interface EtherspotTransactionProps extends ITransaction {
  children?: React.ReactNode;
}

const EtherspotTransaction = ({ children }: EtherspotTransactionProps) => {
  const context = useContext(EtherspotUiContext);

  if (context === null) {
    throw new Error('No parent <EtherspotUi />');
  }

  if (children && Children.toArray(children)?.length) {
    throw new Error(`No children components allowed within <EtherspotTransaction />`)
  }

  return null;
};

export default EtherspotTransaction;
