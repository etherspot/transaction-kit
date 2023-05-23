import React, { useContext, useEffect } from 'react';
import { ethers } from 'ethers';

// contexts
import ProviderWalletContext from '../contexts/ProviderWalletContext';

// types
import { IProviderWalletTransaction } from '../types/EtherspotTransactionKit';
import useId from '../hooks/useId';
import useProviderWalletTransaction from '../hooks/useProviderWalletTransaction';

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
  const componentId = useId();
  const { transaction } = useProviderWalletTransaction();

  if (context === null) {
    // <EtherspotTransactionKit /> includes ProviderWalletContextProvider
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  if (transaction && transaction.id !== componentId) {
    throw new Error('Multiple <ProviderWalletTransaction /> not allowed');
  }

  useEffect(() => {
    let valueBN;
    if (value) {
      valueBN = typeof value === 'string' && !ethers.BigNumber.isBigNumber(value)
        ? ethers.utils.parseEther(value)
        : value;
    }

    const transaction = {
      id: componentId,
      from: context.providerAddress,
      to,
      value: valueBN,
      data,
    };

    context.setTransaction(transaction);

    return () => {
      context.setTransaction(undefined);
    }
  }, [to, data, value, componentId]);

  return <>{children}</>;
};

export default ProviderWalletTransaction;
