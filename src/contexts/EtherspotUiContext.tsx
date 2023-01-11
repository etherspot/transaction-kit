import React, { createContext } from 'react';

// types
import { IBatchGroup } from '../components/EtherspotUi';

export interface EtherspotUiContext {
  data: {
    chainId: number;
    batches: IBatchGroup[];
  }
}

const EtherspotUiContext = createContext<EtherspotUiContext | null>(null);


export default EtherspotUiContext;
