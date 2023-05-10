import { useContext } from 'react';

// contexts
import EtherspotTransactionKitContext from '../contexts/EtherspotTransactionKitContext';

const useEtherspotTransactions = () => {
  const context = useContext(EtherspotTransactionKitContext);

  if (context === null) {
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  return context.data;
};

export default useEtherspotTransactions;
