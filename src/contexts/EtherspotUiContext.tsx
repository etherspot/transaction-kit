import React, { createContext, Dispatch, SetStateAction } from 'react';

// types
import { IBatches, IEstimatedBatches, ISentBatches } from '../types/EtherspotUi';
import { TypePerId } from '../types/Helper';

export interface IEtherspotUiContext {
  data: {
    chainId: number;
    batches: IBatches[];
    estimate: (batchesIds?: string[]) => Promise<IEstimatedBatches[]>;
    send: (batchesIds?: string[]) => Promise<ISentBatches[]>;
    smartWalletAddresses: any,
  },
  setGroupedBatchesPerId: Dispatch<SetStateAction<TypePerId<IBatches>>>;
}

const EtherspotUiContext = createContext<IEtherspotUiContext | null>(null);

export default EtherspotUiContext;
