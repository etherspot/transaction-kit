import React, { useContext } from 'react';
import { ethers } from 'ethers';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IEtherspotTokenTransferTransaction } from '../types/EtherspotTransactionKit';

// hooks
import useId from '../hooks/useId';
import useWalletAddress from '../hooks/useWalletAddress';

// components
import EtherspotContractTransaction from './EtherspotContractTransaction';

interface EtherspotTokenTransferTransactionProps extends IEtherspotTokenTransferTransaction {
  children?: React.ReactNode;
}

/**
 * @name EtherspotTokenTransferTransaction
 * @description Component allowing to token transfer transactions.
 * @param {EtherspotTokenTransferTransactionProps} props
 * @returns {JSX.Element}
 */
const EtherspotTokenTransferTransaction = ({
  children,
  value,
  tokenAddress,
  receiverAddress,
  id: transactionId,
  tokenDecimals = 18,
}: EtherspotTokenTransferTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();
  const senderAddress = useWalletAddress('etherspot', context?.chainId);

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

  let valueBN;
  try {
    valueBN = typeof value === 'string' && !ethers.BigNumber.isBigNumber(value)
      ? ethers.utils.parseUnits(value, tokenDecimals)
      : value;
  } catch (e) {
    if (e instanceof Error && e?.message) {
      throw new Error(`Failed to parse provided value, please make sure value is wei: ${e.message}`);
    }
  }

  if (!valueBN) {
    throw new Error(`Failed to parse provided value, please make sure value is wei.`);
  }

  // wait for sender address to be available
  if (!senderAddress) {
    return (
      <>{children}</>
    )
  }

  return (
    <EtherspotContractTransaction
      id={transactionId ?? componentId}
      contractAddress={tokenAddress}
      methodName={'transfer'}
      abi={['function transfer(address to, uint256 value)']}
      params={[receiverAddress, valueBN]}
    >
      {children}
    </EtherspotContractTransaction>
  )
};

export default EtherspotTokenTransferTransaction;
