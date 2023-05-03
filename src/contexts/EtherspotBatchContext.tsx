import React, { createContext, Dispatch, SetStateAction } from 'react';

// types
import { ITransaction } from '../types/EtherspotTransactionKit';
import { TypePerId } from '../types/Helper';

interface IEtherspotBatchContext {
  setTransactionsPerId: Dispatch<SetStateAction<TypePerId<ITransaction>>>;
  chainId?: number;
}

const EtherspotBatchContext = createContext<IEtherspotBatchContext | null>(null);

export default EtherspotBatchContext;
