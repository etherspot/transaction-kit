import React, { createContext } from 'react';

// types
import { IBatchGroup } from '../types/EtherspotUi';

export interface EtherspotUiContext {
  data: {
    chainId: number;
    batches: IBatchGroup[];
  }
}

const EtherspotUiContext = createContext<EtherspotUiContext | null>(null);

export default EtherspotUiContext;
