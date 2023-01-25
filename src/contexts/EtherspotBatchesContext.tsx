import React, { createContext, Dispatch, SetStateAction } from 'react';

// types
import { IBatch } from '../types/EtherspotUi';
import { TypePerId } from '../types/Helper';

interface IEtherspotBatchesContext {
  setBatchesPerId: Dispatch<SetStateAction<TypePerId<IBatch>>>;
}

const EtherspotBatchesContext = createContext<IEtherspotBatchesContext | null>(null);

export default EtherspotBatchesContext;
