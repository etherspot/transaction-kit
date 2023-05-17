import React, { useContext, useEffect } from 'react';
import { ethers } from 'ethers';

// contexts
import ProviderWalletContext from '../contexts/ProviderWalletContext';

// types
import { IProviderWalletTransaction } from '../types/EtherspotTransactionKit';

interface ProviderWalletTransactionProps extends IProviderWalletTransaction {
  children?: React.ReactNode;
}

const ProviderWalletTransaction = ({
  children,
  to,
  data,
  value,
}: ProviderWalletTransactionProps): JSX.Element => {
  const context = useContext(ProviderWalletContext);

  if (context === null) {
    // <EtherspotTransactionKit /> includes ProviderWalletContextProvider
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  useEffect(() => {
    let valueBN;
    if (value) {
      valueBN = typeof value === 'string' && !ethers.BigNumber.isBigNumber(value)
        ? ethers.utils.parseEther(value)
        : value;
    }

    const transaction = {
      from: context.providerAddress,
      to,
      value: valueBN,
      data,
    };

    context.setTransaction(transaction);
  }, [to, data, value]);

  return <>{children}</>;
};

export default ProviderWalletTransaction;
