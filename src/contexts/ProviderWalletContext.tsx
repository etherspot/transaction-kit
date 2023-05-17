import React, { createContext, Dispatch, SetStateAction } from 'react';

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
  setTransaction: Dispatch<SetStateAction<IProviderWalletTransaction | undefined>>;
  providerAddress: string | undefined;
}

const ProviderWalletContext = createContext<IProviderWalletContext | null>(null);

export default ProviderWalletContext;
