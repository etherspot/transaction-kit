import React, { useContext } from 'react';
import { ethers } from 'ethers';

// contexts
import EtherspotBatchContext from '../contexts/EtherspotBatchContext';

// types
import { IEtherspotApprovalTransaction } from '../types/EtherspotTransactionKit';

// hooks
import useId from '../hooks/useId';

// components
import EtherspotContractTransaction from './EtherspotContractTransaction';

interface EtherspotApprovalTransactionProps extends IEtherspotApprovalTransaction {
  children?: React.ReactNode;
}

/**
 * @name EtherspotApprovalTransaction
 * @description Component allowing to build ERC20 token approval transactions.
 * @param {EtherspotApprovalTransactionProps} props
 * @returns {JSX.Element}
 */
const EtherspotApprovalTransaction = ({
  children,
  value,
  tokenAddress,
  receiverAddress,
  id: transactionId,
  tokenDecimals = 18,
}: EtherspotApprovalTransactionProps): JSX.Element => {
  const context = useContext(EtherspotBatchContext);
  const componentId = useId();

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

  return (
    <EtherspotContractTransaction
      id={transactionId ?? componentId}
      contractAddress={tokenAddress}
      methodName={'approve'}
      abi={['function approve(address, uint256)']}
      params={[receiverAddress, valueBN]}
    >
      {children}
    </EtherspotContractTransaction>
  )
};

export default EtherspotApprovalTransaction;
