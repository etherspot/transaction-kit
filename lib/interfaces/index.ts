import {
  BytesLike,
  ModularSdk,
  PaymasterApi,
  WalletProviderLike,
} from '@etherspot/modular-sdk';

// types
import { BigNumberish } from '@etherspot/modular-sdk/dist/types/sdk/types/bignumber';

// EtherspotProvider
import { EtherspotProvider } from '../EtherspotProvider';

export interface TypePerId<T> {
  [id: string]: T;
}

// EtherspotProvider
export interface EtherspotProviderConfig {
  provider: WalletProviderLike;
  chainId: number;
  bundlerApiKey?: string;
}

// TransactionKit
export interface IInitial {
  // Methods to start with
  transaction(props: TransactionParams): ITransaction;
  name(props: NameParams): INamedTransaction;
  batch(props: BatchParams): IBatch;

  // Batch methods
  sendBatches(props?: SendBatchesParams): Promise<BatchSendResult>;
  estimateBatches(props?: EstimateBatchesParams): Promise<BatchEstimateResult>;

  // Standalone methods (not chainable)
  getWalletAddress(chainId?: number): Promise<string | undefined>;
  getState(): IInstance;
  setDebugMode(enabled: boolean): void;
  getProvider(): WalletProviderLike;
  getEtherspotProvider(): EtherspotProvider;
  getSdk(chainId?: number, forceNewInstance?: boolean): Promise<ModularSdk>;
  reset(): void;
  getTransactionHash(
    userOpHash: string,
    txChainId: number,
    timeout?: number,
    retryInterval?: number
  ): Promise<string | null>;
}

export interface ITransaction {
  name(props: NameParams): INamedTransaction;

  // Callable methods at any time
  getState(): IInstance;
  reset(): void;
}

export interface INamedTransaction {
  // Update with new transaction data
  transaction(props: TransactionParams): ITransaction;

  // Management methods
  remove(): IInitial;
  update(): INamedTransaction;
  addToBatch(props: AddToBatchParams): IBatchedTransaction;

  // Execution methods
  estimate(
    props?: EstimateSingleTransactionParams
  ): Promise<TransactionEstimateResult & IEstimatedTransaction>;
  send(
    props?: SendSingleTransactionParams
  ): Promise<TransactionSendResult & ISentTransaction>;

  // Callable methods at any time
  getState(): IInstance;
  reset(): void;
}

export interface IBatchedTransaction {
  // Update with new transaction data
  transaction(props: TransactionParams): ITransaction;

  // Management methods
  remove(): IInitial;
  update(): IBatchedTransaction;

  // Execution methods
  estimate(
    props?: EstimateSingleTransactionParams
  ): Promise<TransactionEstimateResult & IEstimatedTransaction>;
  send(
    props?: SendSingleTransactionParams
  ): Promise<TransactionSendResult & ISentTransaction>;

  // Callable methods at any time
  getState(): IInstance;
  reset(): void;
}

export interface IBatch {
  remove(): IInitial;

  // Callable methods at any time
  getState(): IInstance;
  reset(): void;
}

export interface IEstimatedTransaction {
  estimate(
    props?: EstimateSingleTransactionParams
  ): Promise<TransactionEstimateResult & IEstimatedTransaction>;

  // Callable methods at any time
  getState(): IInstance;
  reset(): void;
}

export interface ISentTransaction {
  send(
    props?: SendSingleTransactionParams
  ): Promise<TransactionSendResult & ISentTransaction>;

  // Callable methods at any time
  getState(): IInstance;
  reset(): void;
}

// Instance state data
export interface IInstance {
  selectedTransactionName?: string;
  selectedBatchName?: string;
  workingTransaction?: TransactionBuilder;
  namedTransactions: { [name: string]: TransactionBuilder };
  batches: { [batchName: string]: TransactionBuilder[] };
  isEstimating: boolean;
  isSending: boolean;
  containsSendingError: boolean;
  containsEstimatingError: boolean;
  walletAddresses: { [chainId: number]: string };
}

export interface EtherspotTransactionKitConfig extends EtherspotProviderConfig {
  debugMode?: boolean;
}

export interface TransactionBuilder {
  chainId?: number;
  to?: string;
  value?: bigint | string;
  data?: string;
  transactionName?: string;
  batchName?: string;
}

export interface AddToBatchParams {
  batchName: string;
}

export interface BatchParams {
  batchName: string;
}

export interface EstimateSingleTransactionParams {
  paymasterDetails?: PaymasterApi;
  gasDetails?: TransactionGasInfoForUserOp;
  callGasLimit?: bigint;
}

export interface SendSingleTransactionParams {
  paymasterDetails?: PaymasterApi;
  userOpOverrides?: Partial<UserOp>;
}

export interface TransactionEstimateResult {
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  cost?: bigint;
  userOp?: UserOp;
  errorMessage?: string;
  errorType?: 'ESTIMATION_ERROR' | 'VALIDATION_ERROR';
  isEstimatedSuccessfully: boolean;
}

export interface TransactionSendResult {
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  cost?: bigint;
  userOp?: UserOp;
  userOpHash?: string;
  errorMessage?: string;
  errorType?: 'ESTIMATION_ERROR' | 'SEND_ERROR' | 'VALIDATION_ERROR';
  isEstimatedSuccessfully: boolean;
  isSentSuccessfully: boolean;
}

export interface BatchSendResult {
  batches: {
    [batchName: string]: {
      transactions: TransactionSendResult[];
      userOpHash?: string;
      errorMessage?: string;
      isEstimatedSuccessfully: boolean;
      isSentSuccessfully: boolean;
    };
  };
  isEstimatedSuccessfully: boolean;
  isSentSuccessfully: boolean;
}

export interface BatchEstimateResult {
  batches: {
    [batchName: string]: {
      transactions: TransactionEstimateResult[];
      totalCost?: bigint;
      errorMessage?: string;
      isEstimatedSuccessfully: boolean;
    };
  };
  isEstimatedSuccessfully: boolean;
}

export interface NativeAmountParams {
  amount: number;
  chainId?: number;
}

export interface ToParams {
  address: string;
}

export interface TransactionParams {
  chainId?: number;
  to: string;
  value?: bigint | string;
  data?: string;
}

export interface NameParams {
  transactionName: string;
}

export interface SendBatchesParams {
  onlyBatchNames?: string[];
  paymasterDetails?: PaymasterApi;
}

export interface EstimateBatchesParams {
  onlyBatchNames?: string[];
  paymasterDetails?: PaymasterApi;
}

type EtherspotPromiseOrValue<T> = T | Promise<T>;

export interface UserOp {
  sender: EtherspotPromiseOrValue<string>;
  nonce: EtherspotPromiseOrValue<BigNumberish>;
  callData: EtherspotPromiseOrValue<BytesLike>;
  callGasLimit: EtherspotPromiseOrValue<BigNumberish>;
  verificationGasLimit: EtherspotPromiseOrValue<BigNumberish>;
  preVerificationGas: EtherspotPromiseOrValue<BigNumberish>;
  maxFeePerGas: EtherspotPromiseOrValue<BigNumberish>;
  maxPriorityFeePerGas: EtherspotPromiseOrValue<BigNumberish>;
  paymasterData: EtherspotPromiseOrValue<BytesLike>;
  signature: EtherspotPromiseOrValue<BytesLike>;
  factory?: EtherspotPromiseOrValue<string>;
  factoryData?: EtherspotPromiseOrValue<BytesLike>;
  paymaster?: EtherspotPromiseOrValue<string>;
  paymasterVerificationGasLimit?: EtherspotPromiseOrValue<BigNumberish>;
  paymasterPostOpGasLimit?: EtherspotPromiseOrValue<BigNumberish>;
}

export type TransactionGasInfoForUserOp = {
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
};

// TO DO - use when modules are added to transaction kit
// // eslint-disable-next-line @typescript-eslint/naming-convention
// export enum MODULE_TYPE {
//   VALIDATOR = '0x01',
//   EXECUTOR = '0x02',
//   FALLBACK = '0x03',
//   HOOK = '0x04',
// }

// export type ModuleInfo = {
//   validators?: string[];
//   executors?: string[];
//   hook?: string;
//   fallbacks?: FallbackInfo[];
// };

// export type FallbackInfo = {
//   selector: string;
//   handlerAddress: string;
// };
