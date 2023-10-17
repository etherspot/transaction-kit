import { createContext, Dispatch, SetStateAction } from 'react';

// types
import {
  IProviderWalletTransaction,
  IProviderWalletTransactionEstimated,
  IProviderWalletTransactionSent,
} from '../types/EtherspotTransactionKit';

interface IProviderWalletContext {
  data: {
    transaction: undefined | IProviderWalletTransaction;
    estimate: () => Promise<IProviderWalletTransactionEstimated>;
    send: () => Promise<IProviderWalletTransactionSent>;
  },
  setTransactionById: Dispatch<SetStateAction<{ [id: string]: IProviderWalletTransaction | undefined }>>;
}

const ProviderWalletContext = createContext<IProviderWalletContext | null>(null);

export default ProviderWalletContext;
