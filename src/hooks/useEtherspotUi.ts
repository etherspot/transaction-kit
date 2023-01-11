import { useContext } from 'react';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

const useEtherspotUi = () => {
  const context = useContext(EtherspotUiContext);

  if (context === null) {
    throw new Error('No parent <EtherspotUi />');
  }

  return context.data;
};

export default useEtherspotUi;
