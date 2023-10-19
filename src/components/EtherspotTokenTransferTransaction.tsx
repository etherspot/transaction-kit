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
  const senderAddress = useWalletAddress('etherspot-prime', context?.chainId);

  if (context === null) {
    throw new Error('No parent <EtherspotBatch />');
  }

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
      methodName={'transferFrom'}
      abi={['function transferFrom(address from, address to, uint256 value)']}
      params={[senderAddress ?? '', receiverAddress, valueBN]}
    >
      {children}
    </EtherspotContractTransaction>
  )
};

export default EtherspotTokenTransferTransaction;
