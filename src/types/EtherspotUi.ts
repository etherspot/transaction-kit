import { BigNumber } from 'ethers';

export interface ITransaction {
  to: string;
  value?: string;
  data?: string;
}

export interface IBatch {
  chainId?: number;
  gasTokenAddress?: string;
  transactions?: ITransaction[];
}

export interface EstimatedBatch {
  errorMessage?: string;
  cost?: BigNumber;
}

interface EstimatedBatches {
  batches: EstimatedBatch[];
}

export interface IBatches {
  id?: string;
  batches?: IBatch[];
  onEstimated?: (estimated: EstimatedBatches) => void;
  skip?: boolean;
}

export interface IEstimatedBatches {
  id?: string;
  batches?: EstimatedBatches[];
}
