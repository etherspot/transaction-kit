import { BigNumber } from 'ethers';
import React, { useContext, useEffect } from 'react';
import { parseEther } from 'viem';

// contexts
import ProviderWalletContext from '../contexts/ProviderWalletContext';

// types
import { IProviderWalletTransaction } from '../types/EtherspotTransactionKit';

// hooks
import useId from '../hooks/useId';
import useWalletAddress from '../hooks/useWalletAddress';

interface ProviderWalletTransactionProps extends IProviderWalletTransaction {
  children?: React.ReactNode;
}

let instances = 0;

const ProviderWalletTransaction = ({
  children,
  to,
  data,
  value,
  chainId,
}: ProviderWalletTransactionProps): JSX.Element => {
  const context = useContext(ProviderWalletContext);
  const componentId = useId();
  const providerWalletAddress = useWalletAddress('provider', chainId);

  if (context === null) {
    /**
     * No parent <EtherspotTransactionKit /> message is thrown because
     * <EtherspotTransactionKit /> tag includes <ProviderWalletContextProvider />
     * which holds ProviderWalletContext required for hook to work.
     */
    throw new Error('No parent <EtherspotTransactionKit />');
  }

  useEffect(() => {
    instances++;

    if (instances > 1) {
      throw new Error('Multiple <ProviderWalletTransaction /> not allowed');
    }

    return () => {
      instances--;
    };
  }, []);

  useEffect(() => {
    let valueBN;
    if (value) {
      valueBN =
        typeof value === 'string' && !BigNumber.isBigNumber(value)
          ? parseEther(value)
          : value;
    }

    const transaction = {
      id: componentId,
      from: providerWalletAddress,
      to,
      value: valueBN,
      data,
      chainId,
    };

    context.setTransactionById((current) => ({
      ...current,
      [componentId]: transaction,
    }));

    return () => {
      context.setTransactionById((current) => {
        const updated = { ...current };
        delete updated[componentId];
        return updated;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, data, value, chainId, componentId, providerWalletAddress]);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
};

export default ProviderWalletTransaction;
