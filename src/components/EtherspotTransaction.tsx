import React, { useContext } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

interface EtherspotTransactionProps extends React.PropsWithRef<any>{
  to: string;
  value?: number;
  data?: string;
}

const EtherspotTransaction = ({}: EtherspotTransactionProps) => {
  const context = useContext(EtherspotUiContext);

  if (context === null) {
    throw new Error('No parent <EtherspotUi />');
  }

  return null;
};

export default EtherspotTransaction;
