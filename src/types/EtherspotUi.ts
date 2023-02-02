import { BigNumber } from 'ethers';

export interface ITransaction {
  id?: string;
  to: string;
  value?: string;
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
