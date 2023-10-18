import React, { useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { AccountTypes } from '@etherspot/prime-sdk';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IEtherspotTokenTransferTransaction } from '../types/EtherspotTransactionKit';

// hooks
import useId from '../hooks/useId';
import useEtherspot from '../hooks/useEtherspot';

// components
import EtherspotContractTransaction from './EtherspotContractTransaction';

interface EtherspotTokenTransferTransactionProps extends IEtherspotTokenTransferTransaction {
  children?: React.ReactNode;
}

/**
 * @name EtherspotTokenTransferTransaction
 * @description Component allowing to token transfer transactions.
 * @param {EtherspotTokenTransferTransactionProps} props
 * @returns {React.ReactNode}
 */
const EtherspotTokenTransferTransaction = ({
  children,
  value,
  tokenAddress,
  receiverAddress,
  id: transactionId
}: EtherspotTokenTransferTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

  const { getSdk, connect } = useEtherspot();

  const sdkForChainId = getSdk(context?.chainId ?? 1);

  const [senderAddress, setSenderAddress] = useState<string | undefined>(sdkForChainId?.state?.account?.address);

  useEffect(() => {
    setSenderAddress(undefined);
    let shouldUpdate = true;

    const update = async () => {
      const address = sdkForChainId?.state?.account?.type === AccountTypes.Contract
        ? sdkForChainId?.state?.account?.address
        : await connect(context.chainId);

      if (!shouldUpdate) return;

      setSenderAddress(address ?? sdkForChainId?.state?.account?.address);
    }

    update();

    return () => { shouldUpdate = false };
  }, []);

  let valueBN;
  try {
    valueBN = typeof value === 'string' && !ethers.BigNumber.isBigNumber(value)
      ? ethers.utils.parseEther(value)
      : value;
  } catch (e) {
    if (e instanceof Error && e?.message) {
      throw new Error(`Failed to parse provided value, please make sure value is wei: ${e.message}`);
    }
  }

  if (!valueBN) {
    throw new Error(`Failed to parse provided value, please make sure value is wei.`);
  }

  return (
    <EtherspotContractTransaction
      id={transactionId ?? componentId}
      contractAddress={tokenAddress}
      methodName={'transferFrom'}
      abi={['function transferFrom(address from, address to, uint256 value)']}
      params={[senderAddress ?? '', receiverAddress, valueBN]}
    >
      {children}
    </EtherspotContractTransaction>
  )
};

export default EtherspotTokenTransferTransaction;
