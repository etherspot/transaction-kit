import React, { useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { AccountTypes } from 'etherspot';
import { useEtherspot } from '@etherspot/react-etherspot';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IEtherspotTokenTransferTransaction } from '../types/EtherspotUi';

// hooks
import useId from '../hooks/useId';

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
  contractAddress,
  receiverAddress,
  id: transactionId
}: EtherspotTokenTransferTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

  const { getSdkForChainId, connect } = useEtherspot();
  const [senderAddress, setSenderAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSenderAddress(undefined);
    let shouldUpdate = true;

    const update = async () => {
      const sdkForChainId = getSdkForChainId(context?.chainId ?? 1);
      if (!sdkForChainId) return;

      const address = sdkForChainId?.state?.account?.type === AccountTypes.Contract
        ? sdkForChainId?.state?.account?.address
        : await connect(context.chainId);

      if (!shouldUpdate) return;

      setSenderAddress(address ?? sdkForChainId?.state?.account?.address);
    }

    update();

    return () => { shouldUpdate = false };
  }, [getSdkForChainId, context]);

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
      contractAddress={contractAddress}
      methodName={'transferFrom'}
      abi={['function transferFrom(address from, address to, uint256 value)']}
      params={[senderAddress ?? '', receiverAddress, valueBN]}
    >
      {children}
    </EtherspotContractTransaction>
  )
};

export default EtherspotTokenTransferTransaction;
