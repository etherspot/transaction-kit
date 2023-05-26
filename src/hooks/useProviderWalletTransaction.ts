import { useContext } from 'react';

// contexts
import ProviderWalletContext from '../contexts/ProviderWalletContext';

const useProviderWalletTransaction = () => {
  const context = useContext(ProviderWalletContext);

  if (context === null) {
    /**
     * No parent <EtherspotTransactionKit /> message is thrown because
     * <EtherspotTransactionKit /> tag includes <ProviderWalletContextProvider />
     * which holds ProviderWalletContext required for hook to work.
     */
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  return context.data;
};

export default useProviderWalletTransaction;
