import { useContext } from 'react';

import EtherspotContext from '../contexts/EtherspotContext';

const useEtherspot = () => {
  const context = useContext(EtherspotContext);

  if (context === null) {
    throw new Error('No parent <EtherspotContextProvider />');
  }

  return context.data;
};

export default useEtherspot;
