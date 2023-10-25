import { Fragment, JsonFragment } from '@ethersproject/abi';
import { BigNumber, BigNumberish, BytesLike } from 'ethers';
import { Route } from '@lifi/types';
import { PaymasterApi, ExchangeOffer } from '@etherspot/prime-sdk';

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
  transactions?: ITransaction[];
}

export interface EstimatedBatch extends IBatch {
  errorMessage?: string;
  cost?: BigNumber;
  userOp?: UserOp;
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
  addressTemplate?: string;
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

type EtherspotPromiseOrValue<T> = T | Promise<T>;

interface UserOp {
  sender: EtherspotPromiseOrValue<string>;
  nonce: EtherspotPromiseOrValue<BigNumberish>;
  initCode: EtherspotPromiseOrValue<BytesLike>;
  callData: EtherspotPromiseOrValue<BytesLike>;
  callGasLimit: EtherspotPromiseOrValue<BigNumberish>;
  verificationGasLimit: EtherspotPromiseOrValue<BigNumberish>;
  preVerificationGas: EtherspotPromiseOrValue<BigNumberish>;
  maxFeePerGas: EtherspotPromiseOrValue<BigNumberish>;
  maxPriorityFeePerGas: EtherspotPromiseOrValue<BigNumberish>;
  paymasterAndData: EtherspotPromiseOrValue<BytesLike>;
  signature: EtherspotPromiseOrValue<BytesLike>;
}
