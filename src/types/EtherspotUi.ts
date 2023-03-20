import { BigNumber, BigNumberish } from 'ethers';
import { Fragment, JsonFragment } from '@ethersproject/abi/src.ts/fragments';

export interface ITransaction {
  id?: string;
  to: string;
  value?: BigNumberish;
  data?: string;
}

export interface IBatch {
  id?: string;
  chainId?: number;
  gasTokenAddress?: string;
  transactions?: ITransaction[];
}

export interface EstimatedBatch extends IBatch {
  errorMessage?: string;
  cost?: BigNumber;
}

export interface SentBatch extends EstimatedBatch {
  errorMessage?: string;
  batchHash?: string;
}

export interface IBatches {
  id?: string;
  batches?: IBatch[];
  onEstimated?: (estimated: EstimatedBatch[]) => void;
  onSent?: (sent: SentBatch[]) => void;
  skip?: boolean;
}

export interface IEstimatedBatches extends IBatches {
  estimatedBatches: EstimatedBatch[];
}

export interface ISentBatches extends IEstimatedBatches {
  sentBatches: SentBatch[];
}

export interface IEtherspotContractTransaction {
  id?: string;
  value?: BigNumberish;
  params?: ReadonlyArray<BigNumberish>;
  contractAddress: string;
  methodName: string;
  abi: string | ReadonlyArray<Fragment | JsonFragment | string>;
}

export interface ISmartWalletAddress {
  chainId: number;
  address: string;
}

export interface IEtherspotApprovalTransaction {
  id?: string;
  value: BigNumberish;
  contractAddress: string;
  receiverAddress: string;
}
