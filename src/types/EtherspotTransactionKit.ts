import { PaymasterApi } from '@etherspot/modular-sdk';
import { BigNumber, BigNumberish, BytesLike } from 'ethers';

export interface ITransaction {
  id?: string;
  to: string;
  value?: BigNumberish;
  data?: string;
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

export interface SentBatch extends EstimatedBatch {
  errorMessage?: string;
  userOpHash?: string;
}

export interface IBatches {
  id?: string;
  batches?: IBatch[];
  onEstimated?: (estimated: EstimatedBatch[]) => void;
  onSent?: (sent: SentBatch[]) => void;
  skip?: boolean;
  paymaster?: PaymasterApi;
}

export type IEstimatedBatches = IBatches & {
  estimatedBatches: EstimatedBatch[];
};

export type ISentBatches = IEstimatedBatches & {
  sentBatches: SentBatch[];
};

export type IWalletType = 'provider' | 'etherspot';

type EtherspotPromiseOrValue<T> = T | Promise<T>;

export interface UserOp {
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export enum MODULE_TYPE {
  VALIDATOR = '0x01',
  EXECUTOR = '0x02',
  FALLBACK = '0x03',
  HOOK = '0x04',
}

export type ModuleInfo = {
  validators?: string[];
  executors?: string[];
  hook?: string;
  fallbacks?: FallbackInfo[];
};

export type FallbackInfo = {
  selector: string;
  handlerAddress: string;
};

export type SendOptions = {
  retryOnFeeTooLow?: boolean;
  maxRetries?: number;
  feeMultiplier?: number;
};
