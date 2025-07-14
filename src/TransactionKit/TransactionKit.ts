import { ModularSdk, PaymasterApi } from '@etherspot/modular-sdk';
import { isAddress } from 'viem';

// types
import {
  TransactionGasInfoForUserOp,
  UserOp,
} from '../types/TransactionKitTypes';

// provider
import {
  EtherspotProvider,
  EtherspotProviderConfig,
} from './EtherspotProvider';

// utils
import { EtherspotUtils } from './EtherspotUtils';

interface InitialState {
  // Methods to start with
  transaction(props: TransactionProps): TransactionState;
  name(props: NameProps): NamedTransactionState;
  batch(props: BatchProps): BatchState;

  // Batch methods
  sendBatches(props?: SendBatchesProps): Promise<BatchSendResult>;
  estimateBatches(props?: EstimateBatchesProps): Promise<BatchEstimateResult>;

  // Standalone methods (not chainable)
  getWalletAddress(chainId?: number): Promise<string | undefined>;
  getState(): InstanceState;
  setDebugMode(enabled: boolean): void;
  getProvider(): EtherspotProvider;
  getSdk(chainId?: number, forceNewInstance?: boolean): Promise<ModularSdk>;
  reset(): void;
}
interface TransactionState {
  name(props: NameProps): NamedTransactionState;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

export interface NamedTransactionState {
  // Update with new transaction data
  transaction(props: TransactionProps): TransactionState;

  // Management methods
  remove(): InitialState;
  update(): NamedTransactionState;
  addToBatch(props: AddToBatchProps): BatchedTransactionState;

  // Execution methods
  estimate(
    props?: EstimateSingleTransactionProps
  ): Promise<SingleTransactionEstimate & EstimatedTransactionState>;
  send(
    props?: SendSingleTransactionProps
  ): Promise<SingleTransactionSend & SentTransactionState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

export interface BatchedTransactionState {
  // Update with new transaction data
  transaction(props: TransactionProps): TransactionState;

  // Management methods
  remove(): InitialState;
  update(): BatchedTransactionState;

  // Execution methods
  estimate(
    props?: EstimateSingleTransactionProps
  ): Promise<SingleTransactionEstimate & EstimatedTransactionState>;
  send(
    props?: SendSingleTransactionProps
  ): Promise<SingleTransactionSend & SentTransactionState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

export interface BatchState {
  remove(): InitialState;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface EstimatedTransactionState {
  estimate(
    props?: EstimateSingleTransactionProps
  ): Promise<SingleTransactionEstimate & EstimatedTransactionState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface SentTransactionState {
  send(
    props?: SendSingleTransactionProps
  ): Promise<SingleTransactionSend & SentTransactionState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

// Instance state data
export interface InstanceState {
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

export interface AddToBatchProps {
  batchName: string;
}

export interface BatchProps {
  batchName: string;
}

export interface EstimateSingleTransactionProps {
  paymasterDetails?: PaymasterApi;
  gasDetails?: TransactionGasInfoForUserOp;
  callGasLimit?: bigint;
}

export interface SendSingleTransactionProps {
  paymasterDetails?: PaymasterApi;
  userOpOverrides?: Partial<UserOp>;
}

export interface SingleTransactionEstimate {
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  cost?: bigint;
  userOp?: UserOp;
  errorMessage?: string;
  errorType?: 'ESTIMATION_ERROR' | 'VALIDATION_ERROR';
  isSuccess: boolean;
}

export interface SingleTransactionSend {
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  cost?: bigint;
  userOp?: UserOp;
  userOpHash?: string;
  errorMessage?: string;
  errorType?: 'ESTIMATION_ERROR' | 'SEND_ERROR' | 'VALIDATION_ERROR';
  isSuccess: boolean;
}

export interface SendBatchesProps {
  onlyBatchNames?: string[];
  paymasterDetails?: PaymasterApi;
}

export interface EstimateBatchesProps {
  onlyBatchNames?: string[];
  paymasterDetails?: PaymasterApi;
}

export interface BatchSendResult {
  batches: {
    [batchName: string]: {
      transactions: SingleTransactionSend[];
      userOpHash?: string;
      errorMessage?: string;
      isSuccess: boolean;
    };
  };
  isSuccess: boolean;
}

export interface BatchEstimateResult {
  batches: {
    [batchName: string]: {
      transactions: SingleTransactionEstimate[];
      totalCost?: bigint;
      errorMessage?: string;
      isSuccess: boolean;
    };
  };
  isSuccess: boolean;
}

export interface NativeAmountProps {
  amount: number;
  chainId?: number;
}

export interface ToProps {
  address: string;
}

export interface TransactionProps {
  chainId?: number;
  to: string;
  value?: bigint | string;
  data?: string;
}

export interface NameProps {
  transactionName: string;
}

const parseEtherspotErrorMessage = (
  e: Error | unknown,
  defaultMessage: string
): string => {
  return (e instanceof Error && e.message) || defaultMessage;
};

export class EtherspotTransactionKit implements InitialState {
  private etherspotProvider: EtherspotProvider;

  private batches: { [batchName: string]: TransactionBuilder[] } = {};

  private namedTransactions: { [name: string]: TransactionBuilder } = {};

  private isEstimating: boolean = false;

  private isSending: boolean = false;

  private containsSendingError: boolean = false;

  private containsEstimatingError: boolean = false;

  private debugMode: boolean = false;

  private walletAddresses: { [chainId: number]: string } = {};

  // State management
  private selectedTransactionName?: string;

  private selectedBatchName?: string;

  private workingTransaction?: TransactionBuilder;

  constructor(config: EtherspotTransactionKitConfig) {
    this.etherspotProvider = new EtherspotProvider(config);
    this.debugMode = config.debugMode || false;
  }

  /**
   * Debug utility to log messages
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private log(message: string, data?: any): void {
    if (this.debugMode) {
      // eslint-disable-next-line no-console
      console.log(`[EtherspotTransactionKit] ${message}`, data || '');
    }
  }

  /**
   * Error handling utility
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private throwError(message: string, context?: any): never {
    this.log(`ERROR: ${message}`, context);
    throw new Error(`EtherspotTransactionKit: ${message}`);
  }

  /**
   * Clear working state
   */
  private clearWorkingState(): void {
    this.selectedTransactionName = undefined;
    this.selectedBatchName = undefined;
    this.workingTransaction = undefined;
  }

  /**
   * Get wallet address for the 'etherspot' wallet type
   */
  async getWalletAddress(chainId?: number): Promise<string | undefined> {
    this.log('getWalletAddress(): Called with chainId', chainId);
    const walletAddressChainId = chainId || this.etherspotProvider.getChainId();

    // Check if the walletAddress is already in the instance
    if (this.walletAddresses[walletAddressChainId]) {
      this.log(
        `Returning wallet address for chain ${walletAddressChainId}`,
        this.walletAddresses[walletAddressChainId]
      );
      return this.walletAddresses[walletAddressChainId];
    }

    try {
      // Get SDK instance for the chain
      const etherspotModulaSdk =
        await this.etherspotProvider.getSdk(walletAddressChainId);

      let walletAddress: string | undefined;
      try {
        walletAddress = await etherspotModulaSdk.getCounterFactualAddress();
        this.log(
          `Got wallet address from getCounterFactualAddress for chain ${walletAddressChainId}`,
          walletAddress
        );
      } catch (e) {
        this.log(
          `Unable to get wallet address using getCounterFactualAddress for chain ${walletAddressChainId}`,
          e
        );
      }

      if (walletAddress) {
        this.walletAddresses[walletAddressChainId] = walletAddress;
      }

      return walletAddress;
    } catch (error) {
      this.log(
        `Failed to get wallet address for chain ${walletAddressChainId}`,
        error
      );
      return undefined;
    }
  }

  /**
   * Specify any transaction to be sent
   */
  transaction({
    chainId = 1,
    to,
    value = '0',
    data = '0x',
  }: TransactionProps): TransactionState {
    if (!to) {
      this.throwError('transaction(): to is required.');
    }

    if (!isAddress(to)) {
      this.throwError(`transaction(): '${to}' is not a valid address.`);
    }

    if (typeof chainId !== 'number' || !Number.isInteger(chainId)) {
      this.throwError('transaction(): chainId must be a valid number.');
    }

    let parsedValue: bigint;
    try {
      parsedValue = typeof value === 'bigint' ? value : BigInt(value);
      if (parsedValue < BigInt(0)) {
        throw new Error();
      }
    } catch {
      this.throwError(
        'transaction(): value must be a non-negative bigint or numeric string.'
      );
    }

    // Start new transaction or update existing
    if (this.selectedTransactionName) {
      // Updating existing transaction
      this.workingTransaction = {
        ...this.workingTransaction,
        chainId,
        to,
        value,
        data,
      };
      this.log(
        'transaction(): Updated existing transaction',
        this.workingTransaction
      );
    } else {
      // Creating new transaction
      this.workingTransaction = {
        chainId,
        to,
        value,
        data,
      };
      this.log(
        'transaction(): Created new transaction',
        this.workingTransaction
      );
    }

    return this;
  }

  /**
   * Name a transaction (create new or select existing)
   */
  name({ transactionName }: NameProps): NamedTransactionState {
    if (typeof transactionName !== 'string' || transactionName.trim() === '') {
      this.throwError(
        'name(): transactionName is required and must be a non-empty string.'
      );
    }

    // Check if transaction exists
    if (this.namedTransactions[transactionName]) {
      // Selecting existing transaction
      this.selectedTransactionName = transactionName;
      this.workingTransaction = { ...this.namedTransactions[transactionName] };
      this.log(`name(): Selected existing transaction: ${transactionName}`);
    } else {
      // Creating new transaction
      if (!this.workingTransaction) {
        this.throwError(
          'name(): No transaction data to name. Call transaction() first.'
        );
      }
      this.selectedTransactionName = transactionName;
      this.workingTransaction.transactionName = transactionName;
      this.namedTransactions[transactionName] = { ...this.workingTransaction };
      this.log(`name(): Named new transaction: ${transactionName}`);
    }

    return this as NamedTransactionState;
  }

  /**
   * Select a batch by name. Only allows remove, getState, and reset after this.
   */
  batch({ batchName }: BatchProps): BatchState {
    if (typeof batchName !== 'string' || batchName.trim() === '') {
      this.throwError(
        'batch(): batchName is required and must be a non-empty string.'
      );
    }
    if (!this.batches[batchName]) {
      this.throwError(`batch(): Batch '${batchName}' does not exist.`);
    }
    this.selectedBatchName = batchName;
    this.workingTransaction = undefined;
    this.selectedTransactionName = undefined;
    this.log('batch(): Selected batch', batchName);
    // Only allow remove, getState, and reset after selecting a batch
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      remove() {
        return self.remove();
      },
      getState() {
        return self.getState();
      },
      reset() {
        return self.reset();
      },
    };
  }

  /**
   * Add the current transaction to a batch. If the batch does not exist, create it.
   */
  addToBatch({ batchName }: AddToBatchProps): BatchedTransactionState {
    if (!this.selectedTransactionName || !this.workingTransaction) {
      this.throwError(
        'addToBatch(): No named transaction to add to batch. Call name() first.'
      );
    }
    if (typeof batchName !== 'string' || batchName.trim() === '') {
      this.throwError(
        'addToBatch(): batchName is required and must be a non-empty string.'
      );
    }
    // If the batch does not exist, create it
    if (!this.batches[batchName]) {
      this.batches[batchName] = [];
      this.log(`addToBatch(): Created new batch: ${batchName}`);
    }
    this.workingTransaction.batchName = batchName;
    const existingIndex = this.batches[batchName].findIndex(
      (tx) => tx.transactionName === this.selectedTransactionName
    );

    if (existingIndex >= 0) {
      // Update existing transaction in batch
      this.batches[batchName][existingIndex] = { ...this.workingTransaction };
    } else {
      // Add new transaction to batch
      this.batches[batchName].push({ ...this.workingTransaction });
    }

    // Update namedTransactions
    this.namedTransactions[this.selectedTransactionName] = {
      ...this.workingTransaction,
    };

    this.log(
      `addToBatch(): Transaction '${this.selectedTransactionName}' added to batch '${batchName}'`
    );

    return this;
  }

  /**
   * Remove transaction or batch. If a batch is selected (via batch()), remove() deletes the batch and all its transactions.
   * If a transaction is selected, remove() deletes the transaction (and removes it from its batch if needed).
   */
  remove(): InitialState {
    if (this.selectedBatchName) {
      // Remove entire batch
      const batchName = this.selectedBatchName;
      if (!this.batches[batchName]) {
        this.throwError(`remove(): Batch '${batchName}' does not exist.`);
      }
      // Store the transactions to be deleted for logging
      const deletedTxs = [...this.batches[batchName]];
      // Remove all transactions from namedTransactions that belong to this batch
      this.batches[batchName].forEach((tx) => {
        if (tx.transactionName) {
          delete this.namedTransactions[tx.transactionName];
        }
      });
      delete this.batches[batchName];
      this.log(
        `remove(): Removed batch: ${batchName}. Deleted transactions:`,
        deletedTxs
      );
      this.clearWorkingState();
      return this;
    }

    if (this.selectedTransactionName) {
      // Remove single transaction
      const transactionName = this.selectedTransactionName;
      const transaction = this.namedTransactions[transactionName];
      if (!transaction) {
        this.throwError(
          `remove(): Transaction '${transactionName}' does not exist.`
        );
      }
      delete this.namedTransactions[transactionName];
      if (transaction.batchName && this.batches[transaction.batchName]) {
        this.batches[transaction.batchName] = this.batches[
          transaction.batchName
        ].filter((tx) => tx.transactionName !== transactionName);
        if (this.batches[transaction.batchName].length === 0) {
          delete this.batches[transaction.batchName];
        }
      }
      this.log(
        `remove(): Removed transaction: ${transactionName}. Deleted transaction object:`,
        transaction
      );
      this.clearWorkingState();
      return this;
    }

    this.throwError('remove(): No transaction or batch selected to remove.');

    return this;
  }

  /**
   * Update the current transaction. Throws if not selected or does not exist.
   */
  update(): NamedTransactionState | BatchedTransactionState {
    if (!this.selectedTransactionName || !this.workingTransaction) {
      this.throwError(
        'update(): No named transaction to update. Call name() first.'
      );
    }
    const transactionName = this.selectedTransactionName;
    const transaction = this.namedTransactions[transactionName];

    if (!transaction) {
      this.throwError(`update(): Transaction '${transactionName}' not found.`);
    }

    // Update namedTransactions
    this.namedTransactions[transactionName] = { ...this.workingTransaction };

    // Update in batch if it exists
    if (transaction.batchName && this.batches[transaction.batchName]) {
      const batchIndex = this.batches[transaction.batchName].findIndex(
        (tx) => tx.transactionName === transactionName
      );
      if (batchIndex >= 0) {
        this.batches[transaction.batchName][batchIndex] = {
          ...this.workingTransaction,
        };
      }
    }

    this.log(`update(): Updated transaction: ${transactionName}`);

    // Return appropriate state based on whether transaction is in batch
    return transaction.batchName
      ? (this as BatchedTransactionState)
      : (this as NamedTransactionState);
  }

  /**
   * Estimates the transaction (txs) in the instance. Throws if a batch is selected.
   */
  async estimate({
    paymasterDetails,
    gasDetails,
    callGasLimit,
  }: EstimateSingleTransactionProps = {}): Promise<
    SingleTransactionEstimate & EstimatedTransactionState
  > {
    if (this.selectedBatchName) {
      this.log('estimate(): Batch selected, throwing error.');
      this.throwError(
        'estimate(): Cannot estimate a batch with estimate(). Use estimateBatches() instead.'
      );
    }
    if (!this.selectedTransactionName || !this.workingTransaction) {
      const result = {
        to: '',
        chainId: this.etherspotProvider.getChainId(),
        errorMessage: 'No named transaction to estimate. Call name() first.',
        errorType: 'VALIDATION_ERROR' as const,
        isSuccess: false,
      };
      this.log(
        'estimate(): No named transaction, returning error result.',
        result
      );
      return { ...result, ...this };
    }

    this.log('estimate(): Getting provider...');
    const provider = this.etherspotProvider.getProvider();
    this.log('estimate(): Got provider:', provider);
    if (!provider) {
      this.log(
        'estimate(): No Web3 provider available. This is a critical configuration error.'
      );
      this.isEstimating = false;
      this.containsEstimatingError = true;
      this.throwError(
        'estimate(): No Web3 provider available. This is a critical configuration error.'
      );
    }

    this.isEstimating = true;
    this.containsEstimatingError = false;

    // Helper function to set error state and return
    const setErrorAndReturn = (
      errorMessage: string,
      errorType: 'ESTIMATION_ERROR' | 'VALIDATION_ERROR',
      partialResult: Partial<SingleTransactionEstimate> = {}
    ) => {
      this.isEstimating = false;
      this.containsEstimatingError = true;
      const result = {
        to: this.workingTransaction?.to || '',
        chainId:
          this.workingTransaction?.chainId ||
          this.etherspotProvider.getChainId(),
        errorMessage,
        errorType,
        isSuccess: false,
        ...partialResult,
      };
      this.log('estimate(): Returning error result.', result);
      return { ...result, ...this };
    };

    try {
      // Validation: Cannot have both value = '0' and data = '0x'
      if (
        this.workingTransaction?.value === undefined ||
        this.workingTransaction?.data === undefined
      ) {
        this.log('estimate(): value or data undefined, returning error.');
        return setErrorAndReturn(
          'Invalid transaction: value and data must be defined.',
          'VALIDATION_ERROR',
          {
            value: this.workingTransaction?.value?.toString() || '',
            data: this.workingTransaction?.data || '',
          }
        );
      }
      if (
        this.workingTransaction.value?.toString() === '0' &&
        this.workingTransaction.data === '0x'
      ) {
        this.log('estimate(): value=0 and data=0x, returning error.');
        return setErrorAndReturn(
          'Invalid transaction: cannot have both value = 0 and data = 0x. Either send Gas tokens (value > 0) or call a contract function (data != 0x)',
          'VALIDATION_ERROR',
          {
            value: this.workingTransaction.value?.toString() || '',
            data: this.workingTransaction.data || '',
          }
        );
      }

      // Only proceed if value and data are defined
      // Get fresh SDK instance to avoid state pollution
      this.log('estimate(): Getting SDK...');
      const etherspotModulaSdk = await this.etherspotProvider.getSdk(
        this.etherspotProvider.getChainId(),
        true
      );
      this.log('estimate(): Got SDK:', etherspotModulaSdk);

      // Clear any existing operations
      this.log('estimate(): Clearing user ops from batch...');
      await etherspotModulaSdk.clearUserOpsFromBatch();
      this.log('estimate(): Cleared user ops from batch.');

      // Add the transaction to the userOp Batch
      this.log(
        'estimate(): Adding user op to batch...',
        this.workingTransaction
      );
      await etherspotModulaSdk.addUserOpsToBatch({
        to: this.workingTransaction.to || '',
        value: this.workingTransaction.value.toString(),
        data: this.workingTransaction.data,
      });
      this.log('estimate(): Added user op to batch.');

      // Estimate the transaction
      this.log('estimate(): Estimating user op...');
      const userOp = await etherspotModulaSdk.estimate({
        paymasterDetails,
        gasDetails,
        callGasLimit,
      });
      this.log('estimate(): Got userOp:', userOp);

      // Calculate total gas cost
      this.log('estimate(): Calculating total gas...');
      const totalGas = await etherspotModulaSdk.totalGasEstimated(userOp);
      this.log('estimate(): Got totalGas:', totalGas);
      const totalGasBigInt = BigInt(totalGas.toString());
      const maxFeePerGasBigInt = BigInt(userOp.maxFeePerGas.toString());
      const cost = totalGasBigInt * maxFeePerGasBigInt;
      this.log('estimate(): Calculated cost:', cost);

      this.log('estimate(): Single transaction estimated successfully', {
        to: this.workingTransaction?.to,
        cost: cost.toString(),
        gasUsed: totalGas.toString(),
      });

      // Success: reset error states
      this.isEstimating = false;
      this.containsEstimatingError = false;

      const result = {
        to: this.workingTransaction?.to || '',
        value: this.workingTransaction?.value?.toString(),
        data: this.workingTransaction?.data,
        chainId:
          this.workingTransaction?.chainId ||
          this.etherspotProvider.getChainId(),
        cost,
        userOp,
        isSuccess: true,
      };
      this.log('estimate(): Returning success result.', result);
      return { ...result, ...this };
    } catch (error) {
      const errorMessage = parseEtherspotErrorMessage(
        error,
        'Failed to estimate transaction!'
      );

      this.log('estimate(): Single transaction estimation failed', {
        error: errorMessage,
      });

      return setErrorAndReturn(errorMessage, 'ESTIMATION_ERROR', {});
    }
  }

  /**
   * Estimates and send the transaction (txs) in the instance. Throws if a batch is selected.
   */
  async send({
    paymasterDetails,
    userOpOverrides,
  }: SendSingleTransactionProps = {}): Promise<
    SingleTransactionSend & SentTransactionState
  > {
    if (this.selectedBatchName) {
      this.log('send(): Batch selected, throwing error.');
      this.throwError(
        'send(): Cannot send a batch with send(). Use sendBatches() instead.'
      );
    }
    if (!this.selectedTransactionName || !this.workingTransaction) {
      const result = {
        to: '',
        chainId: this.etherspotProvider.getChainId(),
        errorMessage: 'No named transaction to send. Call name() first.',
        errorType: 'VALIDATION_ERROR' as const,
        isSuccess: false,
      };
      this.log('send(): No named transaction, returning error result.', result);
      return { ...result, ...this };
    }

    this.log('send(): Getting provider...');
    const provider = this.etherspotProvider.getProvider();
    this.log('send(): Got provider:', provider);
    if (!provider) {
      this.log(
        'send(): No Web3 provider available. This is a critical configuration error.'
      );
      this.isSending = false;
      this.containsSendingError = true;
      this.throwError(
        'send(): No Web3 provider available. This is a critical configuration error.'
      );
    }

    this.isSending = true;
    this.containsSendingError = false;

    // Helper function to set error state and return
    const setErrorAndReturn = (
      errorMessage: string,
      errorType: 'ESTIMATION_ERROR' | 'SEND_ERROR' | 'VALIDATION_ERROR',
      partialResult: Partial<SingleTransactionSend> = {}
    ) => {
      this.isSending = false;
      this.containsSendingError = true;
      const result = {
        to: this.workingTransaction?.to || '',
        chainId:
          this.workingTransaction?.chainId ||
          this.etherspotProvider.getChainId(),
        errorMessage,
        errorType,
        isSuccess: false,
        ...partialResult,
      };
      this.log('send(): Returning error result.', result);
      return { ...result, ...this };
    };

    try {
      // Validation: Cannot have both value = '0' and data = '0x'
      if (
        this.workingTransaction?.value?.toString() === '0' &&
        this.workingTransaction?.data === '0x'
      ) {
        this.log('send(): value=0 and data=0x, returning error.');
        return setErrorAndReturn(
          'Invalid transaction: cannot have both value = 0 and data = 0x. Either send Gas tokens (value > 0) or call a contract function (data != 0x)',
          'VALIDATION_ERROR',
          {
            value: this.workingTransaction?.value?.toString() || '',
            data: this.workingTransaction?.data || '',
          }
        );
      }

      // Get fresh SDK instance to avoid state pollution
      this.log('send(): Getting SDK...');
      const etherspotModulaSdk = await this.etherspotProvider.getSdk(
        this.etherspotProvider.getChainId(),
        true
      );
      this.log('send(): Got SDK:', etherspotModulaSdk);

      // Clear any existing operations
      this.log('send(): Clearing user ops from batch...');
      await etherspotModulaSdk.clearUserOpsFromBatch();
      this.log('send(): Cleared user ops from batch.');

      // Add the transaction to the userOp Batch
      this.log('send(): Adding user op to batch...', this.workingTransaction);
      await etherspotModulaSdk.addUserOpsToBatch({
        to: this.workingTransaction?.to || '',
        value: this.workingTransaction?.value?.toString(),
        data: this.workingTransaction?.data || '0x',
      });
      this.log('send(): Added user op to batch.');

      // Estimate the transaction
      let estimatedUserOp;
      try {
        this.log('send(): Estimating user op...');
        estimatedUserOp = await etherspotModulaSdk.estimate({
          paymasterDetails,
        });
        this.log('send(): Got estimated userOp:', estimatedUserOp);
      } catch (estimationError) {
        const estimationErrorMessage = parseEtherspotErrorMessage(
          estimationError,
          'Failed to estimate transaction before sending.'
        );
        this.log('send(): Transaction estimation before send failed', {
          error: estimationErrorMessage,
        });
        this.log(
          'send(): Returning error result from estimation catch.',
          estimationErrorMessage
        );
        return setErrorAndReturn(
          estimationErrorMessage,
          'ESTIMATION_ERROR',
          {}
        );
      }

      // Apply any user overrides to the UserOp
      const finalUserOp = { ...estimatedUserOp, ...userOpOverrides };
      this.log('send(): Final userOp for sending:', finalUserOp);

      // Calculate total gas cost (using the final UserOp values)
      this.log('send(): Calculating total gas...');
      const totalGas = await etherspotModulaSdk.totalGasEstimated(finalUserOp);
      this.log('send(): Got totalGas:', totalGas);
      const totalGasBigInt = BigInt(totalGas.toString());
      const maxFeePerGasBigInt = BigInt(finalUserOp.maxFeePerGas.toString());
      const cost = totalGasBigInt * maxFeePerGasBigInt;
      this.log('send(): Calculated cost:', cost);

      this.log('send(): Single transaction estimated, now sending...', {
        to: this.workingTransaction?.to,
        cost: cost.toString(),
        gasUsed: totalGas.toString(),
        userOpOverrides,
      });

      // Send the transaction
      let userOpHash: string;
      try {
        this.log('send(): Sending userOp...');
        userOpHash = await etherspotModulaSdk.send(finalUserOp);
        this.log('send(): Got userOpHash:', userOpHash);
      } catch (sendError) {
        const sendErrorMessage = parseEtherspotErrorMessage(
          sendError,
          'Failed to send transaction!'
        );

        this.log('send(): Transaction send failed', {
          error: sendErrorMessage,
        });
        return setErrorAndReturn(sendErrorMessage, 'SEND_ERROR', {
          to: this.workingTransaction?.to,
          value: this.workingTransaction?.value?.toString(),
          data: this.workingTransaction?.data,
          chainId:
            this.workingTransaction?.chainId ||
            this.etherspotProvider.getChainId(),
          cost,
          userOp: finalUserOp,
        });
      }

      this.log('send(): Single transaction sent successfully', {
        to: this.workingTransaction?.to,
        userOpHash,
      });

      // Success: reset error states
      this.isSending = false;
      this.containsSendingError = false;

      // Remove transaction from state after successful send
      const transactionName = this.selectedTransactionName;
      if (transactionName && this.namedTransactions[transactionName]) {
        const transaction = this.namedTransactions[transactionName];
        delete this.namedTransactions[transactionName];
        if (transaction.batchName && this.batches[transaction.batchName]) {
          this.batches[transaction.batchName] = this.batches[
            transaction.batchName
          ].filter((tx) => tx.transactionName !== transactionName);
          if (this.batches[transaction.batchName].length === 0) {
            delete this.batches[transaction.batchName];
          }
        }
      }
      this.clearWorkingState();

      const result = {
        to: this.workingTransaction?.to || '',
        value: this.workingTransaction?.value?.toString(),
        data: this.workingTransaction?.data,
        chainId:
          this.workingTransaction?.chainId ||
          this.etherspotProvider.getChainId(),
        cost,
        userOp: finalUserOp,
        userOpHash,
        isSuccess: true,
      };
      this.log('send(): Returning success result.', result);
      return { ...result, ...this };
    } catch (error) {
      const errorMessage = parseEtherspotErrorMessage(
        error,
        'Failed to estimate or send transaction!'
      );

      this.log('send(): Single transaction failed', { error: errorMessage });
      return setErrorAndReturn(errorMessage, 'SEND_ERROR', {});
    }
  }

  /**
   * Estimate multiple batches.
   */
  async estimateBatches({
    onlyBatchNames,
    paymasterDetails,
  }: EstimateBatchesProps = {}): Promise<BatchEstimateResult> {
    this.isEstimating = true;
    this.containsEstimatingError = false;

    const result: BatchEstimateResult = {
      batches: {},
      isSuccess: true,
    };

    // Determine which batches to estimate
    const batchesToEstimate = onlyBatchNames || Object.keys(this.batches);

    if (batchesToEstimate.length === 0) {
      this.log('estimateBatches(): No batches to estimate');
      this.isEstimating = false;
      return result;
    }

    // Get the provider
    const provider = this.etherspotProvider.getProvider();
    // Validation: if there is no provider, return error
    if (!provider) {
      this.log(
        'estimateBatches(): No Web3 provider available. This is a critical configuration error.'
      );
      this.isEstimating = false;
      this.containsEstimatingError = true;
      this.throwError(
        'estimateBatches(): No Web3 provider available. This is a critical configuration error.'
      );
    }

    await Promise.all(
      batchesToEstimate.map(async (batchName) => {
        if (!this.batches[batchName] || this.batches[batchName].length === 0) {
          result.batches[batchName] = {
            transactions: [],
            errorMessage: `Batch '${batchName}' does not exist or is empty`,
            isSuccess: false,
          };
          result.isSuccess = false;
          return;
        }

        const batchTransactions = this.batches[batchName];
        const estimatedTransactions: SingleTransactionEstimate[] = [];

        // Get chain ID from first transaction or use provider default
        const batchChainId =
          batchTransactions[0]?.chainId ?? this.etherspotProvider.getChainId();

        try {
          // Get fresh SDK instance to avoid state pollution (same as original)
          this.log(`estimateBatches(): Getting SDK for batch ${batchName}...`);
          const etherspotModulaSdk = await this.etherspotProvider.getSdk(
            batchChainId,
            true // force new instance
          );
          this.log(
            `estimateBatches(): Got SDK for batch ${batchName}:`,
            etherspotModulaSdk
          );

          // Clear any existing operations
          this.log(
            `estimateBatches(): Clearing user ops from batch ${batchName}...`
          );
          await etherspotModulaSdk.clearUserOpsFromBatch();
          this.log(
            `estimateBatches(): Cleared user ops from batch ${batchName}.`
          );

          // Add all transactions in the batch to the SDK
          this.log(
            `estimateBatches(): Adding ${batchTransactions.length} transactions to batch ${batchName}...`
          );
          await Promise.all(
            batchTransactions.map(async (tx) => {
              this.log(
                `estimateBatches(): Adding transaction ${tx.transactionName} to batch ${batchName}...`
              );
              await etherspotModulaSdk.addUserOpsToBatch({
                to: tx.to || '',
                value: tx.value?.toString(),
                data: tx.data,
              });
              this.log(
                `estimateBatches(): Added transaction ${tx.transactionName} to batch ${batchName}.`
              );
            })
          );
          this.log(
            `estimateBatches(): Added all transactions to batch ${batchName}.`
          );

          // Estimate the entire batch
          this.log(`estimateBatches(): Estimating batch ${batchName}...`);
          const userOp = await etherspotModulaSdk.estimate({
            paymasterDetails,
          });
          this.log(
            `estimateBatches(): Got userOp for batch ${batchName}:`,
            userOp
          );

          // Calculate total gas cost for the batch
          this.log(
            `estimateBatches(): Calculating total gas for batch ${batchName}...`
          );
          const totalGas = await etherspotModulaSdk.totalGasEstimated(userOp);
          this.log(
            `estimateBatches(): Got totalGas for batch ${batchName}:`,
            totalGas
          );
          const totalGasBigInt = BigInt(totalGas.toString());
          const maxFeePerGasBigInt = BigInt(userOp.maxFeePerGas.toString());
          const totalCost = totalGasBigInt * maxFeePerGasBigInt;
          this.log(
            `estimateBatches(): Calculated total cost for batch ${batchName}:`,
            totalCost
          );

          // Create estimates for each transaction in the batch
          batchTransactions.forEach((tx) => {
            const resultObj = {
              to: tx.to || '',
              value: tx.value?.toString(),
              data: tx.data,
              chainId: tx.chainId || batchChainId,
              cost: totalCost,
              userOp,
              isSuccess: true,
            };
            estimatedTransactions.push(resultObj);
            this.log(
              `estimateBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' estimated successfully.`,
              { transaction: tx, result: resultObj }
            );
          });

          result.batches[batchName] = {
            transactions: estimatedTransactions,
            totalCost,
            isSuccess: true,
          };

          this.log(
            `estimateBatches(): Batch '${batchName}' estimated successfully`,
            {
              transactionCount: batchTransactions.length,
              totalCost: totalCost.toString(),
              chainId: batchChainId,
            }
          );
        } catch (error) {
          const errorMessage = parseEtherspotErrorMessage(
            error,
            'Failed to estimate batches!'
          );

          // Create error estimates for each transaction in the batch
          batchTransactions.forEach((tx) => {
            const resultObj = {
              to: tx.to || '',
              value: tx.value?.toString(),
              data: tx.data,
              chainId: tx.chainId || batchChainId,
              errorMessage,
              errorType: 'ESTIMATION_ERROR' as const,
              isSuccess: false,
            };
            estimatedTransactions.push(resultObj);
            this.log(
              `estimateBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to estimate: ${errorMessage}`,
              { transaction: tx, result: resultObj }
            );
          });

          result.batches[batchName] = {
            transactions: estimatedTransactions,
            errorMessage,
            isSuccess: false,
          };
          result.isSuccess = false;

          this.log(
            `estimateBatches(): Batch '${batchName}' estimation failed`,
            {
              error: errorMessage,
              chainId: batchChainId,
            }
          );
        }
      })
    );

    // Set error state based on results (like original)
    this.containsEstimatingError = !result.isSuccess;
    this.isEstimating = false;

    return result;
  }

  /**
   * Send multiple batches.
   */
  async sendBatches({
    onlyBatchNames,
    paymasterDetails,
  }: SendBatchesProps = {}): Promise<BatchSendResult> {
    this.isSending = true;
    this.containsSendingError = false;

    const result: BatchSendResult = {
      batches: {},
      isSuccess: true,
    };

    // Determine which batches to send
    const batchesToSend = onlyBatchNames || Object.keys(this.batches);

    if (batchesToSend.length === 0) {
      this.log('sendBatches(): No batches to send');
      this.isSending = false;
      return result;
    }

    // Get the provider
    const provider = this.etherspotProvider.getProvider();
    // Validation: if there is no provider, return error
    if (!provider) {
      this.log(
        'sendBatches(): No Web3 provider available. This is a critical configuration error.'
      );
      this.isSending = false;
      this.containsSendingError = true;
      this.throwError(
        'sendBatches(): No Web3 provider available. This is a critical configuration error.'
      );
    }

    await Promise.all(
      batchesToSend.map(async (batchName) => {
        if (!this.batches[batchName] || this.batches[batchName].length === 0) {
          result.batches[batchName] = {
            transactions: [],
            errorMessage: `Batch '${batchName}' does not exist or is empty`,
            isSuccess: false,
          };
          result.isSuccess = false;
          return;
        }

        const batchTransactions = this.batches[batchName];
        const sentTransactions: SingleTransactionSend[] = [];

        // Get chain ID from first transaction or use provider default
        const batchChainId =
          batchTransactions[0]?.chainId ?? this.etherspotProvider.getChainId();

        try {
          // Get fresh SDK instance to avoid state pollution (same as original)
          this.log(`sendBatches(): Getting SDK for batch ${batchName}...`);
          const etherspotModulaSdk = await this.etherspotProvider.getSdk(
            batchChainId,
            true // force new instance
          );
          this.log(
            `sendBatches(): Got SDK for batch ${batchName}:`,
            etherspotModulaSdk
          );

          // Clear any existing operations
          this.log(
            `sendBatches(): Clearing user ops from batch ${batchName}...`
          );
          await etherspotModulaSdk.clearUserOpsFromBatch();
          this.log(`sendBatches(): Cleared user ops from batch ${batchName}.`);

          // Add all transactions in the batch to the SDK
          this.log(
            `sendBatches(): Adding ${batchTransactions.length} transactions to batch ${batchName}...`
          );
          await Promise.all(
            batchTransactions.map(async (tx) => {
              this.log(
                `sendBatches(): Adding transaction ${tx.transactionName} to batch ${batchName}...`
              );
              await etherspotModulaSdk.addUserOpsToBatch({
                to: tx.to || '',
                value: tx.value?.toString(),
                data: tx.data,
              });
              this.log(
                `sendBatches(): Added transaction ${tx.transactionName} to batch ${batchName}.`
              );
            })
          );
          this.log(
            `sendBatches(): Added all transactions to batch ${batchName}.`
          );

          // Estimate first (like the single send() method)
          let estimatedUserOp;
          try {
            this.log(
              `sendBatches(): Estimating batch ${batchName} for sending...`
            );
            estimatedUserOp = await etherspotModulaSdk.estimate({
              paymasterDetails,
            });
            this.log(
              `sendBatches(): Got estimated userOp for batch ${batchName}:`,
              estimatedUserOp
            );
          } catch (estimationError) {
            const estimationErrorMessage = parseEtherspotErrorMessage(
              estimationError,
              'Failed to estimate before sending!'
            );
            // Create error entries for each transaction in the batch
            batchTransactions.forEach((tx) => {
              sentTransactions.push({
                to: tx.to || '',
                value: tx.value?.toString(),
                data: tx.data,
                chainId: tx.chainId || batchChainId,
                errorMessage: estimationErrorMessage,
                errorType: 'ESTIMATION_ERROR',
                isSuccess: false,
              });
              this.log(
                `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to estimate: ${estimationErrorMessage}`,
                tx
              );
            });

            result.batches[batchName] = {
              transactions: sentTransactions,
              errorMessage: estimationErrorMessage,
              isSuccess: false,
            };
            result.isSuccess = false;

            this.log(
              `sendBatches(): Batch '${batchName}' estimation before send failed`,
              {
                error: estimationErrorMessage,
                chainId: batchChainId,
              }
            );
            return;
          }

          // Apply user overrides
          const finalUserOp = { ...estimatedUserOp };

          // Calculate total gas cost (using the same approach as original)
          this.log(
            `sendBatches(): Calculating total gas for batch ${batchName}...`
          );
          const totalGas =
            await etherspotModulaSdk.totalGasEstimated(finalUserOp);
          this.log(
            `sendBatches(): Got totalGas for batch ${batchName}:`,
            totalGas
          );
          const totalGasBigInt = BigInt(totalGas.toString());
          const maxFeePerGasBigInt = BigInt(
            finalUserOp.maxFeePerGas.toString()
          );
          const totalCost = totalGasBigInt * maxFeePerGasBigInt;
          this.log(
            `sendBatches(): Calculated total cost for batch ${batchName}:`,
            totalCost
          );

          this.log(
            `sendBatches(): Batch '${batchName}' estimated, now sending...`,
            {
              transactionCount: batchTransactions.length,
              totalCost: totalCost.toString(),
              chainId: batchChainId,
            }
          );

          // Send the batch
          let userOpHash: string;
          try {
            this.log(`sendBatches(): Sending batch ${batchName}...`);
            userOpHash = await etherspotModulaSdk.send(finalUserOp);
            this.log(
              `sendBatches(): Got userOpHash for batch ${batchName}:`,
              userOpHash
            );
          } catch (sendError) {
            const sendErrorMessage = parseEtherspotErrorMessage(
              sendError,
              'Failed to send!'
            );

            // Create error entries for each transaction in the batch
            batchTransactions.forEach((tx) => {
              sentTransactions.push({
                to: tx.to || '',
                value: tx.value?.toString(),
                data: tx.data,
                chainId: tx.chainId || batchChainId,
                cost: totalCost,
                userOp: finalUserOp,
                errorMessage: sendErrorMessage,
                errorType: 'SEND_ERROR',
                isSuccess: false,
              });
              this.log(
                `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to send: ${sendErrorMessage}`,
                tx
              );
            });

            result.batches[batchName] = {
              transactions: sentTransactions,
              errorMessage: sendErrorMessage,
              isSuccess: false,
            };
            result.isSuccess = false;

            this.log(`sendBatches(): Batch '${batchName}' send failed`, {
              error: sendErrorMessage,
              chainId: batchChainId,
            });
            return;
          }

          // Create success entries for each transaction in the batch
          batchTransactions.forEach((tx) => {
            const resultObj = {
              to: tx.to || '',
              value: tx.value?.toString(),
              data: tx.data,
              chainId: tx.chainId || batchChainId,
              cost: totalCost, // Use full cost for each transaction (like original) or divide by length
              userOp: finalUserOp,
              userOpHash,
              isSuccess: true,
            };
            sentTransactions.push(resultObj);
            this.log(
              `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' sent successfully.`,
              { transaction: tx, result: resultObj }
            );
          });

          result.batches[batchName] = {
            transactions: sentTransactions,
            userOpHash,
            isSuccess: true,
          };

          this.log(`sendBatches(): Batch '${batchName}' sent successfully`, {
            transactionCount: batchTransactions.length,
            userOpHash,
            chainId: batchChainId,
          });

          // Remove batch and its transactions from state after successful send
          if (result.batches[batchName].isSuccess) {
            // Remove all transactions in the batch from namedTransactions
            batchTransactions.forEach((tx) => {
              if (tx.transactionName) {
                delete this.namedTransactions[tx.transactionName];
              }
            });
            delete this.batches[batchName];
          }
        } catch (error) {
          const errorMessage = parseEtherspotErrorMessage(
            error,
            'Failed to send!'
          );

          // Create error entries for each transaction in the batch
          batchTransactions.forEach((tx) => {
            sentTransactions.push({
              to: tx.to || '',
              value: tx.value?.toString(),
              data: tx.data,
              chainId: tx.chainId || batchChainId,
              errorMessage,
              errorType: 'SEND_ERROR',
              isSuccess: false,
            });
            this.log(
              `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to send: ${errorMessage}`,
              tx
            );
          });

          result.batches[batchName] = {
            transactions: sentTransactions,
            errorMessage,
            isSuccess: false,
          };
          result.isSuccess = false;

          this.log(`sendBatches(): Batch '${batchName}' send failed`, {
            error: errorMessage,
            chainId: batchChainId,
          });
        }
      })
    );

    // Set error state based on results (like original)
    this.containsSendingError = !result.isSuccess;
    this.isSending = false;

    return result;
  }

  /**
   * Get current state of the transaction kit instance
   */
  getState(): InstanceState {
    const state = {
      selectedTransactionName: this.selectedTransactionName,
      selectedBatchName: this.selectedBatchName,
      workingTransaction: this.workingTransaction,
      namedTransactions: { ...this.namedTransactions },
      batches: { ...this.batches },
      isEstimating: this.isEstimating,
      isSending: this.isSending,
      containsSendingError: this.containsSendingError,
      containsEstimatingError: this.containsEstimatingError,
      walletAddresses: { ...this.walletAddresses },
    };
    this.log('getState(): Returning state', state);
    return state;
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.log('setDebugMode(): Debug mode set to', enabled);
  }

  /**
   * Get the Etherspot provider
   */
  getProvider(): EtherspotProvider {
    this.log('getProvider(): Returning provider', this.etherspotProvider);
    return this.etherspotProvider;
  }

  /**
   * Get the Etherspot Modular SDK instance
   */
  async getSdk(
    chainId?: number,
    forceNewInstance?: boolean
  ): Promise<ModularSdk> {
    this.log('getSdk(): Called with', { chainId, forceNewInstance });
    const sdk = await this.etherspotProvider.getSdk(chainId, forceNewInstance);
    this.log('getSdk(): Returning SDK', sdk);
    return sdk;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.namedTransactions = {};
    this.batches = {};
    this.isEstimating = false;
    this.isSending = false;
    this.containsSendingError = false;
    this.containsEstimatingError = false;
    this.workingTransaction = undefined;
    this.selectedTransactionName = undefined;
    this.selectedBatchName = undefined;
    this.walletAddresses = {};
    this.etherspotProvider.clearAllCaches();
    this.log('reset(): State has been reset.');
  }

  // Callable static EtherspotUtils without needing to instantiate the class
  static utils = EtherspotUtils;
}

// Function for easier instantiation
export function TransactionKit(
  config: EtherspotTransactionKitConfig
): InitialState {
  return new EtherspotTransactionKit(config);
}
