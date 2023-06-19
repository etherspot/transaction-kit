import { createContext, Dispatch, SetStateAction } from 'react';
import { PrimeSdk } from '@etherspot/prime-sdk';

// types
import { IBatches, IEstimatedBatches, ISentBatches } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

export interface IEtherspotTransactionKitContext {
  data: {
    chainId: number;
    batches: IBatches[];
    estimate: (batchesIds?: string[]) => Promise<IEstimatedBatches[]>;
    send: (batchesIds?: string[]) => Promise<ISentBatches[]>;
    getEtherspotPrimeSdkForChainId: (chainId: number, force?: boolean) => Promise<PrimeSdk | null>;
  },
  setGroupedBatchesPerId: Dispatch<SetStateAction<TypePerId<IBatches>>>;
}

const EtherspotTransactionKitContext = createContext<IEtherspotTransactionKitContext | null>(null);

export default EtherspotTransactionKitContext;
