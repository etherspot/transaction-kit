import { BigNumber } from 'ethers';
import React, { useContext, useEffect } from 'react';
import { parseEther } from 'viem';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { ITransaction } from '../types/EtherspotTransactionKit';

// hooks
import useId from '../hooks/useId';

interface EtherspotTransactionProps extends ITransaction {
  children?: React.ReactNode;
}

const EtherspotTransaction = ({
  children,
  to,
  data,
  value,
  id: transactionId,
}: EtherspotTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

  useEffect(() => {
    let valueBN;
    if (value) {
      valueBN =
        typeof value === 'string' && !BigNumber.isBigNumber(value)
          ? parseEther(value)
          : value;
    }

    const transaction = {
      id: transactionId ?? componentId,
      to,
      data,
      value: valueBN,
    };

    context.setTransactionsPerId((current) => ({
      ...current,
      [componentId]: transaction,
    }));

    return () => {
      context.setTransactionsPerId((current) => {
        // eslint-disable-next-line no-param-reassign
        delete current[componentId];
        return current;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentId, to, data, value, transactionId]);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
};

export default EtherspotTransaction;
