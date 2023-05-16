import { useContext } from 'react';

// contexts
import ProviderWalletContext from '../contexts/ProviderWalletContext';

const useProviderWalletTransaction = () => {
  const context = useContext(ProviderWalletContext);

  if (context === null) {
    // <EtherspotTransactionKit /> includes ProviderWalletContextProvider
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  return context.data;
};

export default useProviderWalletTransaction;
