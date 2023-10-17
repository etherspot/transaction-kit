import { Fragment, JsonFragment } from '@ethersproject/abi/src.ts/fragments';
import { BigNumber, BigNumberish } from 'ethers';
import { ExchangeOffer } from 'etherspot';
import { Route } from '@lifi/sdk';
import { PaymasterApi } from '@etherspot/prime-sdk';

export interface ITransaction {
  id?: string;
  to: string;
  value?: BigNumberish;
  data?: string;
}

export interface IProviderWalletTransaction {
  id?: string;
  to: string;
  value?: BigNumberish;
  data?: string;
  chainId?: number;
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

export interface EtherspotPrimeSentBatch extends EstimatedBatch {
  userOpHash?: string;
}

export type SentBatch = {
  errorMessage?: string;
} & (EtherspotPrimeSentBatch);

export interface IBatches {
  id?: string;
  batches?: IBatch[];
  onEstimated?: (estimated: EstimatedBatch[]) => void;
  onSent?: (sent: SentBatch[]) => void;
  skip?: boolean;
  paymaster?: PaymasterApi,
}

export type IEstimatedBatches = IBatches & {
  estimatedBatches: EstimatedBatch[];
}

export type ISentBatches = IEstimatedBatches & {
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

export interface IEtherspotTokenTransferTransaction {
  id?: string;
  value: BigNumberish;
  tokenAddress: string;
  receiverAddress: string;
}

export interface ISmartWalletAddress {
  chainId: number;
  address: string;
  chainName: string,
}

export interface IEtherspotApprovalTransaction {
  id?: string;
  value: BigNumberish;
  tokenAddress: string;
  receiverAddress: string;
}

export interface ISameChainSwapOffers {
  type: 'same-chain';
  offers: ExchangeOffer[],
}

export interface ICrossChainSwapOffers {
  type: 'cross-chain';
  offers: Route[],
}

export interface IProviderWalletTransactionEstimated {
  gasCost?: BigNumberish;
  errorMessage?: string;
}

export interface IProviderWalletTransactionSent {
  transactionHash?: string;
  errorMessage?: string;
}

export type IWalletType = 'provider' | 'etherspot-prime';
