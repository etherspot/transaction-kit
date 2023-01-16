export interface ITransaction {
  to: string;
  value?: string;
  data?: string;
}

export interface IBatch {
  chainId?: number;
  gasTokenAddress?: string;
  transactions?: ITransaction[],
}

export interface IBatchGroup {
  batches?: IBatch[],
  skip?: boolean,
}
