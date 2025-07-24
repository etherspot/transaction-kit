import { ModularSdk, WalletProviderLike } from '@etherspot/modular-sdk';
import { isAddress } from 'viem';

// interfaces
import {
  AddToBatchParams,
  BatchEstimateResult,
  BatchParams,
  BatchSendResult,
  EstimateBatchesParams,
  EstimateSingleTransactionParams,
  EtherspotTransactionKitConfig,
  IBatch,
  IBatchedTransaction,
  IEstimatedTransaction,
  IInitial,
  IInstance,
  INamedTransaction,
  ISentTransaction,
  ITransaction,
  NameParams,
  SendBatchesParams,
  SendSingleTransactionParams,
  TransactionBuilder,
  TransactionEstimateResult,
  TransactionParams,
  TransactionSendResult,
} from './interfaces';

// EtherspotProvider
import { EtherspotProvider } from './EtherspotProvider';

// utils
import { EtherspotUtils } from './EtherspotUtils';
import { log, parseEtherspotErrorMessage } from './utils';

export class EtherspotTransactionKit implements IInitial {
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
   * Throws an error with a formatted message and optional context.
   *
   * @param message - The error message to throw.
   * @param context - (Optional) Additional context to log with the error.
   * @throws {Error} Always throws an error with the provided message.
   *
   * @remarks
   * - This is a utility method for consistent error handling and logging.
   * - The function never returns; it always throws.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private throwError(message: string, context?: any): never {
    log(`ERROR: ${message}`, context);
    throw new Error(`EtherspotTransactionKit: ${message}`);
  }

  /**
   * Clears the current working transaction, selected transaction, and selected batch state.
   *
   * @remarks
   * - This is a utility method used internally to reset the working context.
   * - Does not affect named transactions or batches.
   */
  private clearWorkingState(): void {
    this.selectedTransactionName = undefined;
    this.selectedBatchName = undefined;
    this.workingTransaction = undefined;
  }

  /**
   * Retrieves the counterfactual wallet address for the current or specified chain.
   *
   * This method checks if the wallet address is already cached for the given chain. If not, it initializes the Etherspot SDK for the chain and attempts to fetch the counterfactual address. The result is cached for future calls. If the address cannot be retrieved, the method returns undefined.
   *
   * @param chainId - (Optional) The chain ID for which to retrieve the wallet address. If not provided, uses the provider's current chain ID.
   * @returns The counterfactual wallet address as a string, or undefined if it cannot be retrieved.
   * @throws {Error} If the SDK fails to initialize or the address cannot be fetched due to a critical error.
   *
   * @remarks
   * - This method is asynchronous and may perform network requests.
   * - The address is cached per chain for efficiency.
   * - If the SDK or address retrieval fails, the error is logged and undefined is returned.
   */
  async getWalletAddress(chainId?: number): Promise<string | undefined> {
    log('getWalletAddress(): Called with chainId', chainId, this.debugMode);
    const walletAddressChainId = chainId || this.etherspotProvider.getChainId();

    // Check if the walletAddress is already in the instance
    if (this.walletAddresses[walletAddressChainId]) {
      log(
        `Returning wallet address for chain ${walletAddressChainId}`,
        this.walletAddresses[walletAddressChainId],
        this.debugMode
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
        log(
          `Got wallet address from getCounterFactualAddress for chain ${walletAddressChainId}`,
          walletAddress,
          this.debugMode
        );
      } catch (e) {
        log(
          `Unable to get wallet address using getCounterFactualAddress for chain ${walletAddressChainId}`,
          e,
          this.debugMode
        );
      }

      if (walletAddress) {
        this.walletAddresses[walletAddressChainId] = walletAddress;
      }

      return walletAddress;
    } catch (error) {
      log(
        `Failed to get wallet address for chain ${walletAddressChainId}`,
        error,
        this.debugMode
      );
      return undefined;
    }
  }

  /**
   * Specifies or updates the transaction details to be sent.
   *
   * This method sets up a new transaction or updates the currently selected transaction with the provided parameters. It validates the input parameters and throws an error if any are invalid. If a transaction is already selected, it updates its details; otherwise, it creates a new transaction context.
   *
   * @param params - The transaction parameters, including chainId, to, value, and data.
   * @returns The transaction kit instance for chaining further calls.
   * @throws {Error} If any of the parameters are invalid (e.g., missing 'to', invalid address, invalid chainId, or negative value).
   *
   * @remarks
   * - This method is chainable and is typically the first step in building a transaction.
   * - The transaction context is stored in the instance until it is named or added to a batch.
   */
  transaction({
    chainId = 1,
    to,
    value = '0',
    data = '0x',
  }: TransactionParams): ITransaction {
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
      log(
        'transaction(): Updated existing transaction',
        this.workingTransaction,
        this.debugMode
      );
    } else {
      // Creating new transaction
      this.workingTransaction = {
        chainId,
        to,
        value,
        data,
      };
      log(
        'transaction(): Created new transaction',
        this.workingTransaction,
        this.debugMode
      );
    }

    return this;
  }

  /**
   * Names the current transaction or selects an existing named transaction.
   *
   * If a transaction with the given name already exists, it becomes the selected transaction and its details are loaded into the working context. If not, the current working transaction is assigned the provided name and saved. Throws an error if the name is invalid or if there is no working transaction to name.
   *
   * @param params - The name parameters, including the transactionName string.
   * @returns The transaction kit instance as an INamedTransaction for further chaining.
   * @throws {Error} If the transaction name is missing, empty, or if there is no working transaction to name.
   *
   * @remarks
   * - This method is chainable and is typically called after specifying a transaction.
   * - If a transaction with the given name exists, it will be selected and can be updated or managed.
   * - If a new name is provided, the current working transaction is saved under that name.
   */
  name({ transactionName }: NameParams): INamedTransaction {
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
      log(
        `name(): Selected existing transaction: ${transactionName}`,
        undefined,
        this.debugMode
      );
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
      log(
        `name(): Named new transaction: ${transactionName}`,
        undefined,
        this.debugMode
      );
    }

    return this as INamedTransaction;
  }

  /**
   * Selects a batch by name for subsequent batch operations.
   *
   * This method sets the current batch context to the specified batch name, allowing batch-level operations such as remove, getState, and reset. Throws an error if the batch name is invalid or does not exist.
   *
   * @param params - The batch parameters, including the batchName string.
   * @returns An IBatch interface for batch-level operations (remove, getState, reset).
   * @throws {Error} If the batch name is missing, empty, or does not exist in the current instance.
   *
   * @remarks
   * - After selecting a batch, only remove, getState, and reset operations are allowed until the batch context is cleared.
   * - This method is chainable and is typically used to manage or inspect a batch of transactions.
   */
  batch({ batchName }: BatchParams): IBatch {
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
    log('batch(): Selected batch', batchName, this.debugMode);
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
   * Adds the current transaction to a specified batch, creating the batch if it does not exist.
   *
   * This method associates the current working transaction with a batch, identified by batchName. If the batch does not exist, it is created. Throws an error if there is no selected transaction, no working transaction, or if the batch name is invalid.
   *
   * @param params - The batch parameters, including the batchName string.
   * @returns The transaction kit instance as an IBatchedTransaction for further chaining.
   * @throws {Error} If there is no selected transaction, no working transaction, or if the batch name is missing or invalid.
   *
   * @remarks
   * - This method is chainable and is typically used after naming a transaction.
   * - If the transaction is already in the batch, it will be updated; otherwise, it will be added as a new entry.
   * - The batch is created if it does not already exist.
   */
  addToBatch({ batchName }: AddToBatchParams): IBatchedTransaction {
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
      log(
        `addToBatch(): Created new batch: ${batchName}`,
        undefined,
        this.debugMode
      );
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

    log(
      `addToBatch(): Transaction '${this.selectedTransactionName}' added to batch '${batchName}'`,
      undefined,
      this.debugMode
    );

    return this;
  }

  /**
   * Removes the currently selected transaction or batch from the trakit.
   *
   * If a batch is selected, this method deletes the batch and all its transactions. If a transaction is selected, it deletes the transaction and removes it from its batch if necessary. Throws an error if neither a transaction nor a batch is selected.
   *
   * @returns The transaction kit instance for further chaining.
   * @throws {Error} If no transaction or batch is selected to remove, or if the specified transaction or batch does not exist.
   *
   * @remarks
   * - After removal, the working state is cleared.
   * - This method is chainable and can be used to manage the transaction or batch lifecycle.
   */
  remove(): IInitial {
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
      log(
        `remove(): Removed batch: ${batchName}. Deleted transactions:`,
        deletedTxs,
        this.debugMode
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
      log(
        `remove(): Removed transaction: ${transactionName}. Deleted transaction object:`,
        transaction,
        this.debugMode
      );
      this.clearWorkingState();
      return this;
    }

    this.throwError('remove(): No transaction or batch selected to remove.');

    return this;
  }

  /**
   * Updates the currently selected named transaction with the latest working transaction data.
   *
   * This method overwrites the data of the selected named transaction with the current working transaction. If the transaction is part of a batch, the batch entry is also updated. Throws an error if there is no selected transaction, no working transaction, or if the transaction does not exist.
   *
   * @returns The transaction kit instance as an INamedTransaction or IBatchedTransaction, depending on whether the transaction is part of a batch.
   * @throws {Error} If there is no selected transaction, no working transaction, or if the transaction does not exist.
   *
   * @remarks
   * - This method is chainable and is typically used after modifying transaction details.
   * - If the transaction is part of a batch, the batch entry is also updated.
   */
  update(): INamedTransaction | IBatchedTransaction {
    if (!this.selectedTransactionName || !this.workingTransaction) {
      this.throwError(
        'update(): No named transaction to update. Call name() first.'
      );
    }
    if (!this.workingTransaction) {
      this.throwError('update(): No working transaction to update.');
    }
    const transactionName = this.selectedTransactionName;
    if (!transactionName) {
      this.throwError('update(): No selected transaction name.');
    }
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

    log(
      `update(): Updated transaction: ${transactionName}`,
      undefined,
      this.debugMode
    );

    // Return appropriate state based on whether transaction is in batch
    return transaction.batchName
      ? (this as IBatchedTransaction)
      : (this as INamedTransaction);
  }

  /**
   * Estimates the gas and cost for the currently selected transaction.
   *
   * This method validates the current transaction context and uses the Etherspot SDK to estimate the gas and cost for the transaction. It is designed to be called after a transaction has been specified and named. The method enforces several rules and will throw or return errors in specific scenarios.
   *
   * @param params - (Optional) Estimation parameters:
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions.
   *   - `gasDetails`: Custom gas settings for the user operation.
   *   - `callGasLimit`: Optional override for the call gas limit.
   *
   * @returns A promise that resolves to a `TransactionEstimateResult` combined with `IEstimatedTransaction`, containing:
   *   - Transaction details (to, value, data, chainId)
   *   - Estimated cost and gas usage
   *   - UserOp object (if successful)
   *   - Error message and type (if estimation fails)
   *   - `isEstimatedSuccessfully` flag
   *
   * @throws {Error} If:
   *   - A batch is currently selected (estimation of batches must use `estimateBatches()`).
   *   - There is no named transaction to estimate.
   *   - The provider is not available or misconfigured.
   *
   * @remarks
   * - **Validation rules:**
   *   - Throws if a batch is selected (use `estimateBatches()` for batch estimation).
   *   - Returns a validation error if no named transaction is present.
   *   - Returns a validation error if required transaction fields (`value`, `data`) are missing.
   *   - Throws if the provider is not available.
   * - **Error handling:**
   *   - If estimation fails due to SDK or network errors, the error is logged and a result object with error details is returned (not thrown).
   *   - The returned object always includes an `isEstimatedSuccessfully` flag.
   * - **Chaining:**
   *   - This method is chainable and can be used as part of a transaction flow.
   * - **Side effects:**
   *   - Updates internal error state flags (`isEstimating`, `containsEstimatingError`).
   *   - May perform network requests and SDK initialization.
   * - **Usage:**
   *   - Call after specifying and naming a transaction.
   *   - For batch estimation, use `estimateBatches()` instead.
   */
  async estimate({
    paymasterDetails,
    gasDetails,
    callGasLimit,
  }: EstimateSingleTransactionParams = {}): Promise<
    TransactionEstimateResult & IEstimatedTransaction
  > {
    if (this.selectedBatchName) {
      log(
        'estimate(): Batch selected, throwing error.',
        undefined,
        this.debugMode
      );
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
        isEstimatedSuccessfully: false,
      };
      log(
        'estimate(): No named transaction, returning error result.',
        result,
        this.debugMode
      );
      return { ...result, ...this };
    }

    log('estimate(): Getting provider...', undefined, this.debugMode);
    const provider = this.getProvider();
    log('estimate(): Got provider:', provider, this.debugMode);
    if (!provider) {
      log(
        'estimate(): No Web3 provider available. This is a critical configuration error.',
        undefined,
        this.debugMode
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
      partialResult: Partial<TransactionEstimateResult> = {}
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
        isEstimatedSuccessfully: false,
        ...partialResult,
      };
      log('estimate(): Returning error result.', result, this.debugMode);
      return { ...result, ...this };
    };

    try {
      // Validation: value and data must be defined
      if (
        this.workingTransaction?.value === undefined ||
        this.workingTransaction?.data === undefined
      ) {
        log(
          'estimate(): value or data undefined, returning error.',
          undefined,
          this.debugMode
        );
        return setErrorAndReturn(
          'Invalid transaction: value and data must be defined.',
          'VALIDATION_ERROR',
          {
            value: this.workingTransaction?.value?.toString() || '',
            data: this.workingTransaction?.data || '',
          }
        );
      }

      // Only proceed if value and data are defined
      // Get fresh SDK instance to avoid state pollution
      log('estimate(): Getting SDK...', undefined, this.debugMode);
      const etherspotModulaSdk = await this.etherspotProvider.getSdk(
        this.etherspotProvider.getChainId(),
        true
      );
      log('estimate(): Got SDK:', etherspotModulaSdk, this.debugMode);

      // Clear any existing operations
      log(
        'estimate(): Clearing user ops from batch...',
        undefined,
        this.debugMode
      );
      await etherspotModulaSdk.clearUserOpsFromBatch();
      log(
        'estimate(): Cleared user ops from batch.',
        undefined,
        this.debugMode
      );

      // Add the transaction to the userOp Batch
      log(
        'estimate(): Adding user op to batch...',
        this.workingTransaction,
        this.debugMode
      );
      await etherspotModulaSdk.addUserOpsToBatch({
        to: this.workingTransaction.to || '',
        value: this.workingTransaction.value.toString(),
        data: this.workingTransaction.data,
      });
      log('estimate(): Added user op to batch.', undefined, this.debugMode);

      // Estimate the transaction
      log('estimate(): Estimating user op...', undefined, this.debugMode);
      const userOp = await etherspotModulaSdk.estimate({
        paymasterDetails,
        gasDetails,
        callGasLimit,
      });
      log('estimate(): Got userOp:', userOp, this.debugMode);

      // Calculate total gas cost
      log('estimate(): Calculating total gas...', undefined, this.debugMode);
      const totalGas = await etherspotModulaSdk.totalGasEstimated(userOp);
      log('estimate(): Got totalGas:', totalGas, this.debugMode);
      const totalGasBigInt = BigInt(totalGas.toString());
      const maxFeePerGasBigInt = BigInt(userOp.maxFeePerGas.toString());
      const cost = totalGasBigInt * maxFeePerGasBigInt;
      log('estimate(): Calculated cost:', cost, this.debugMode);

      log(
        'estimate(): Single transaction estimated successfully',
        {
          to: this.workingTransaction?.to,
          cost: cost.toString(),
          gasUsed: totalGas.toString(),
        },
        this.debugMode
      );

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
        isEstimatedSuccessfully: true,
      };
      log('estimate(): Returning success result.', result, this.debugMode);
      return { ...result, ...this };
    } catch (error) {
      const errorMessage = parseEtherspotErrorMessage(
        error,
        'Failed to estimate transaction!'
      );

      log(
        'estimate(): Single transaction estimation failed',
        {
          error: errorMessage,
        },
        this.debugMode
      );

      return setErrorAndReturn(errorMessage, 'ESTIMATION_ERROR', {});
    }
  }

  /**
   * Estimates and sends the currently selected transaction.
   *
   * This method validates the current transaction context, estimates the transaction using the Etherspot SDK, and then sends it to the network. It is designed to be called after a transaction has been specified and named. The method enforces several rules and will throw or return errors in specific scenarios.
   *
   * @param params - (Optional) Send parameters:
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions.
   *   - `userOpOverrides`: Optional overrides for the user operation fields.
   *
   * @returns A promise that resolves to a `TransactionSendResult` combined with `ISentTransaction`, containing:
   *   - Transaction details (to, value, data, chainId)
   *   - Estimated and actual cost and gas usage
   *   - UserOp object and userOpHash (if successful)
   *   - Error message and type (if sending fails)
   *   - `isEstimatedSuccessfully` and `isSentSuccessfully` flags
   *
   * @throws {Error} If:
   *   - A batch is currently selected (sending of batches must use `sendBatches()`).
   *   - There is no named transaction to send.
   *   - The provider is not available or misconfigured.
   *
   * @remarks
   * - **Validation rules:**
   *   - Throws if a batch is selected (use `sendBatches()` for batch sending).
   *   - Returns a validation error if no named transaction is present.
   *   - Throws if the provider is not available.
   * - **Error handling:**
   *   - If estimation or sending fails due to SDK or network errors, the error is logged and a result object with error details is returned (not thrown).
   *   - The returned object always includes `isEstimatedSuccessfully` and `isSentSuccessfully` flags.
   * - **Chaining:**
   *   - This method is chainable and can be used as part of a transaction flow.
   * - **Side effects:**
   *   - Updates internal error state flags (`isSending`, `containsSendingError`).
   *   - May perform network requests and SDK initialization.
   *   - Removes the transaction from state after successful send.
   * - **Usage:**
   *   - Call after specifying and naming a transaction.
   *   - For batch sending, use `sendBatches()` instead.
   */
  async send({
    paymasterDetails,
    userOpOverrides,
  }: SendSingleTransactionParams = {}): Promise<
    TransactionSendResult & ISentTransaction
  > {
    if (this.selectedBatchName) {
      log('send(): Batch selected, throwing error.', undefined, this.debugMode);
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
        isEstimatedSuccessfully: false,
        isSentSuccessfully: false,
      };
      log(
        'send(): No named transaction, returning error result.',
        result,
        this.debugMode
      );
      return { ...result, ...this };
    }

    log('send(): Getting provider...', undefined, this.debugMode);
    const provider = this.getProvider();
    log('send(): Got provider:', provider, this.debugMode);
    if (!provider) {
      log(
        'send(): No Web3 provider available. This is a critical configuration error.',
        undefined,
        this.debugMode
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
      partialResult: Partial<TransactionSendResult> = {}
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
        isEstimatedSuccessfully: false,
        isSentSuccessfully: false,
        ...partialResult,
      };
      log('send(): Returning error result.', result, this.debugMode);
      return { ...result, ...this };
    };

    try {
      // Get fresh SDK instance to avoid state pollution
      log('send(): Getting SDK...', undefined, this.debugMode);
      const etherspotModulaSdk = await this.etherspotProvider.getSdk(
        this.etherspotProvider.getChainId(),
        true
      );
      log('send(): Got SDK:', etherspotModulaSdk, this.debugMode);

      // Clear any existing operations
      log('send(): Clearing user ops from batch...', undefined, this.debugMode);
      await etherspotModulaSdk.clearUserOpsFromBatch();
      log('send(): Cleared user ops from batch.', undefined, this.debugMode);

      // Add the transaction to the userOp Batch
      log(
        'send(): Adding user op to batch...',
        this.workingTransaction,
        this.debugMode
      );
      await etherspotModulaSdk.addUserOpsToBatch({
        to: this.workingTransaction?.to || '',
        value: this.workingTransaction?.value?.toString(),
        data: this.workingTransaction?.data || '0x',
      });
      log('send(): Added user op to batch.', undefined, this.debugMode);

      // Estimate the transaction
      let estimatedUserOp;
      try {
        log('send(): Estimating user op...', undefined, this.debugMode);
        estimatedUserOp = await etherspotModulaSdk.estimate({
          paymasterDetails,
        });
        log('send(): Got estimated userOp:', estimatedUserOp, this.debugMode);
      } catch (estimationError) {
        const estimationErrorMessage = parseEtherspotErrorMessage(
          estimationError,
          'Failed to estimate transaction before sending.'
        );
        log(
          'send(): Transaction estimation before send failed',
          {
            error: estimationErrorMessage,
          },
          this.debugMode
        );
        log(
          'send(): Returning error result from estimation catch.',
          estimationErrorMessage,
          this.debugMode
        );
        return setErrorAndReturn(
          estimationErrorMessage,
          'ESTIMATION_ERROR',
          {}
        );
      }

      // Apply any user overrides to the UserOp
      const finalUserOp = { ...estimatedUserOp, ...userOpOverrides };
      log('send(): Final userOp for sending:', finalUserOp, this.debugMode);

      // Calculate total gas cost (using the final UserOp values)
      log('send(): Calculating total gas...', undefined, this.debugMode);
      const totalGas = await etherspotModulaSdk.totalGasEstimated(finalUserOp);
      log('send(): Got totalGas:', totalGas, this.debugMode);
      const totalGasBigInt = BigInt(totalGas.toString());
      const maxFeePerGasBigInt = BigInt(finalUserOp.maxFeePerGas.toString());
      const cost = totalGasBigInt * maxFeePerGasBigInt;
      log('send(): Calculated cost:', cost, this.debugMode);

      log(
        'send(): Single transaction estimated, now sending...',
        {
          to: this.workingTransaction?.to,
          cost: cost.toString(),
          gasUsed: totalGas.toString(),
          userOpOverrides,
        },
        this.debugMode
      );

      // Send the transaction
      let userOpHash: string;
      try {
        log('send(): Sending userOp...', undefined, this.debugMode);
        userOpHash = await etherspotModulaSdk.send(finalUserOp);
        log('send(): Got userOpHash:', userOpHash, this.debugMode);
      } catch (sendError) {
        const sendErrorMessage = parseEtherspotErrorMessage(
          sendError,
          'Failed to send transaction!'
        );

        log(
          'send(): Transaction send failed',
          {
            error: sendErrorMessage,
          },
          this.debugMode
        );
        return setErrorAndReturn(sendErrorMessage, 'SEND_ERROR', {
          to: this.workingTransaction?.to,
          value: this.workingTransaction?.value?.toString(),
          data: this.workingTransaction?.data,
          chainId:
            this.workingTransaction?.chainId ||
            this.etherspotProvider.getChainId(),
          cost,
          userOp: finalUserOp,
          isEstimatedSuccessfully: true,
          isSentSuccessfully: false,
        });
      }

      log(
        'send(): Single transaction sent successfully',
        {
          to: this.workingTransaction?.to,
          userOpHash,
        },
        this.debugMode
      );

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
        isEstimatedSuccessfully: true,
        isSentSuccessfully: true,
      };
      log('send(): Returning success result.', result, this.debugMode);
      return { ...result, ...this };
    } catch (error) {
      const errorMessage = parseEtherspotErrorMessage(
        error,
        'Failed to estimate or send transaction!'
      );

      log(
        'send(): Single transaction failed',
        { error: errorMessage },
        this.debugMode
      );
      return setErrorAndReturn(errorMessage, 'SEND_ERROR', {});
    }
  }

  /**
   * Estimates the gas and cost for all specified or existing batches of transactions.
   *
   * This method validates the batch context and uses the Etherspot SDK to estimate the gas and cost for each transaction in the specified batches (or all batches if none are specified). It enforces several rules and will throw or return errors in specific scenarios.
   *
   * @param params - (Optional) Estimation parameters:
   *   - `onlyBatchNames`: An array of batch names to estimate. If omitted, all batches are estimated.
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions.
   *
   * @returns A promise that resolves to a `BatchEstimateResult` containing:
   *   - A mapping of batch names to their estimation results (transactions, totalCost, errorMessage, isEstimatedSuccessfully)
   *   - An overall `isEstimatedSuccessfully` flag
   *
   * @throws {Error} If the provider is not available or misconfigured.
   *
   * @remarks
   * - **Validation rules:**
   *   - Throws if the provider is not available.
   *   - Returns an error result for any batch that does not exist or is empty.
   * - **Error handling:**
   *   - If estimation fails for a batch, the error is logged and a result object with error details is returned for that batch (not thrown).
   *   - The returned object always includes an `isEstimatedSuccessfully` flag for each batch and overall.
   * - **Chaining:**
   *   - This method is chainable and can be used as part of a batch transaction flow.
   * - **Side effects:**
   *   - Updates internal error state flags (`isEstimating`, `containsEstimatingError`).
   *   - May perform network requests and SDK initialization.
   * - **Usage:**
   *   - Call to estimate gas and cost for multiple transactions grouped in batches.
   *   - For single transaction estimation, use `estimate()` instead.
   */
  async estimateBatches({
    onlyBatchNames,
    paymasterDetails,
  }: EstimateBatchesParams = {}): Promise<BatchEstimateResult> {
    this.isEstimating = true;
    this.containsEstimatingError = false;

    const result: BatchEstimateResult = {
      batches: {},
      isEstimatedSuccessfully: true,
    };

    // Determine which batches to estimate
    const batchesToEstimate = onlyBatchNames || Object.keys(this.batches);

    if (batchesToEstimate.length === 0) {
      log('estimateBatches(): No batches to estimate', this.debugMode);
      this.isEstimating = false;
      return result;
    }

    // Get the provider
    const provider = this.getProvider();
    // Validation: if there is no provider, return error
    if (!provider) {
      log(
        'estimateBatches(): No Web3 provider available. This is a critical configuration error.',
        undefined,
        this.debugMode
      );
      this.isEstimating = false;
      this.containsEstimatingError = true;
      this.throwError(
        'estimateBatches(): No Web3 provider available. This is a critical configuration error.'
      );
    }

    await Promise.all(
      batchesToEstimate.map(async (batchName: string) => {
        if (!this.batches[batchName] || this.batches[batchName].length === 0) {
          result.batches[batchName] = {
            transactions: [],
            errorMessage: `Batch '${batchName}' does not exist or is empty`,
            isEstimatedSuccessfully: false,
          };
          result.isEstimatedSuccessfully = false;
          return;
        }

        const batchTransactions = this.batches[batchName];
        const estimatedTransactions: TransactionEstimateResult[] = [];

        // Get chain ID from first transaction or use provider default
        const batchChainId =
          batchTransactions[0]?.chainId ?? this.etherspotProvider.getChainId();

        try {
          // Get fresh SDK instance to avoid state pollution (same as original)
          log(
            `estimateBatches(): Getting SDK for batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          const etherspotModulaSdk = await this.etherspotProvider.getSdk(
            batchChainId,
            true // force new instance
          );
          log(
            `estimateBatches(): Got SDK for batch ${batchName}:`,
            etherspotModulaSdk,
            this.debugMode
          );

          // Clear any existing operations
          log(
            `estimateBatches(): Clearing user ops from batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          await etherspotModulaSdk.clearUserOpsFromBatch();
          log(
            `estimateBatches(): Cleared user ops from batch ${batchName}.`,
            undefined,
            this.debugMode
          );

          // Add all transactions in the batch to the SDK
          log(
            `estimateBatches(): Adding ${batchTransactions.length} transactions to batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          await Promise.all(
            batchTransactions.map(async (tx) => {
              log(
                `estimateBatches(): Adding transaction ${tx.transactionName} to batch ${batchName}...`,
                undefined,
                this.debugMode
              );
              await etherspotModulaSdk.addUserOpsToBatch({
                to: tx.to || '',
                value: tx.value?.toString(),
                data: tx.data,
              });
              log(
                `estimateBatches(): Added transaction ${tx.transactionName} to batch ${batchName}.`,
                undefined,
                this.debugMode
              );
            })
          );
          log(
            `estimateBatches(): Added all transactions to batch ${batchName}.`,
            undefined,
            this.debugMode
          );

          // Estimate the entire batch
          log(
            `estimateBatches(): Estimating batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          const userOp = await etherspotModulaSdk.estimate({
            paymasterDetails,
          });
          log(
            `estimateBatches(): Got userOp for batch ${batchName}:`,
            userOp,
            this.debugMode
          );

          // Calculate total gas cost for the batch
          log(
            `estimateBatches(): Calculating total gas for batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          const totalGas = await etherspotModulaSdk.totalGasEstimated(userOp);
          log(
            `estimateBatches(): Got totalGas for batch ${batchName}:`,
            totalGas,
            this.debugMode
          );
          const totalGasBigInt = BigInt(totalGas.toString());
          const maxFeePerGasBigInt = BigInt(userOp.maxFeePerGas.toString());
          const totalCost = totalGasBigInt * maxFeePerGasBigInt;
          log(
            `estimateBatches(): Calculated total cost for batch ${batchName}:`,
            totalCost,
            this.debugMode
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
              isEstimatedSuccessfully: true,
            };
            estimatedTransactions.push(resultObj);
            log(
              `estimateBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' estimated successfully.`,
              { transaction: tx, result: resultObj },
              this.debugMode
            );
          });

          result.batches[batchName] = {
            transactions: estimatedTransactions,
            totalCost,
            isEstimatedSuccessfully: true,
          };

          log(
            `estimateBatches(): Batch '${batchName}' estimated successfully`,
            {
              transactionCount: batchTransactions.length,
              totalCost: totalCost.toString(),
              chainId: batchChainId,
            },
            this.debugMode
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
              isEstimatedSuccessfully: false,
            };
            estimatedTransactions.push(resultObj);
            log(
              `estimateBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to estimate: ${errorMessage}`,
              { transaction: tx, result: resultObj },
              this.debugMode
            );
          });

          result.batches[batchName] = {
            transactions: estimatedTransactions,
            errorMessage,
            isEstimatedSuccessfully: false,
          };
          result.isEstimatedSuccessfully = false;

          log(
            `estimateBatches(): Batch '${batchName}' estimation failed`,
            {
              error: errorMessage,
              chainId: batchChainId,
            },
            this.debugMode
          );
        }
      })
    );

    // Set error state based on results (like original)
    this.containsEstimatingError = !result.isEstimatedSuccessfully;
    this.isEstimating = false;

    return result;
  }

  /**
   * Estimates and sends all specified or existing batches of transactions.
   *
   * This method validates the batch context, estimates each batch using the Etherspot SDK, and then sends them to the network. It enforces several rules and will throw or return errors in specific scenarios.
   *
   * @param params - (Optional) Send parameters:
   *   - `onlyBatchNames`: An array of batch names to send. If omitted, all batches are sent.
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions.
   *
   * @returns A promise that resolves to a `BatchSendResult` containing:
   *   - A mapping of batch names to their send results (transactions, userOpHash, errorMessage, isEstimatedSuccessfully, isSentSuccessfully)
   *   - Overall `isEstimatedSuccessfully` and `isSentSuccessfully` flags
   *
   * @throws {Error} If the provider is not available or misconfigured.
   *
   * @remarks
   * - **Validation rules:**
   *   - Throws if the provider is not available.
   *   - Returns an error result for any batch that does not exist or is empty.
   * - **Error handling:**
   *   - If estimation or sending fails for a batch, the error is logged and a result object with error details is returned for that batch (not thrown).
   *   - The returned object always includes `isEstimatedSuccessfully` and `isSentSuccessfully` flags for each batch and overall.
   * - **Chaining:**
   *   - This method is chainable and can be used as part of a batch transaction flow.
   * - **Side effects:**
   *   - Updates internal error state flags (`isSending`, `containsSendingError`).
   *   - May perform network requests and SDK initialization.
   *   - Removes batches and their transactions from state after successful send.
   * - **Usage:**
   *   - Call to estimate and send multiple transactions grouped in batches.
   *   - For single transaction sending, use `send()` instead.
   */
  async sendBatches({
    onlyBatchNames,
    paymasterDetails,
  }: SendBatchesParams = {}): Promise<BatchSendResult> {
    this.isSending = true;
    this.containsSendingError = false;

    const result: BatchSendResult = {
      batches: {},
      isEstimatedSuccessfully: true,
      isSentSuccessfully: true,
    };

    // Determine which batches to send
    const batchesToSend = onlyBatchNames || Object.keys(this.batches);

    if (batchesToSend.length === 0) {
      log('sendBatches(): No batches to send', this.debugMode);
      this.isSending = false;
      return result;
    }

    // Get the provider
    const provider = this.getProvider();
    // Validation: if there is no provider, return error
    if (!provider) {
      log(
        'sendBatches(): No Web3 provider available. This is a critical configuration error.',
        undefined,
        this.debugMode
      );
      this.isSending = false;
      this.containsSendingError = true;
      this.throwError(
        'sendBatches(): No Web3 provider available. This is a critical configuration error.'
      );
    }

    await Promise.all(
      batchesToSend.map(async (batchName: string) => {
        if (!this.batches[batchName] || this.batches[batchName].length === 0) {
          result.batches[batchName] = {
            transactions: [],
            errorMessage: `Batch '${batchName}' does not exist or is empty`,
            isEstimatedSuccessfully: false,
            isSentSuccessfully: false,
          };
          result.isEstimatedSuccessfully = false;
          result.isSentSuccessfully = false;
          return;
        }

        const batchTransactions = this.batches[batchName];
        const sentTransactions: TransactionSendResult[] = [];

        // Get chain ID from first transaction or use provider default
        const batchChainId =
          batchTransactions[0]?.chainId ?? this.etherspotProvider.getChainId();

        try {
          // Get fresh SDK instance to avoid state pollution (same as original)
          log(
            `sendBatches(): Getting SDK for batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          const etherspotModulaSdk = await this.etherspotProvider.getSdk(
            batchChainId,
            true // force new instance
          );
          log(
            `sendBatches(): Got SDK for batch ${batchName}:`,
            etherspotModulaSdk,
            this.debugMode
          );

          // Clear any existing operations
          log(
            `sendBatches(): Clearing user ops from batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          await etherspotModulaSdk.clearUserOpsFromBatch();
          log(
            `sendBatches(): Cleared user ops from batch ${batchName}.`,
            undefined,
            this.debugMode
          );

          // Add all transactions in the batch to the SDK
          log(
            `sendBatches(): Adding ${batchTransactions.length} transactions to batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          await Promise.all(
            batchTransactions.map(async (tx) => {
              log(
                `sendBatches(): Adding transaction ${tx.transactionName} to batch ${batchName}...`,
                undefined,
                this.debugMode
              );
              await etherspotModulaSdk.addUserOpsToBatch({
                to: tx.to || '',
                value: tx.value?.toString(),
                data: tx.data,
              });
              log(
                `sendBatches(): Added transaction ${tx.transactionName} to batch ${batchName}.`,
                undefined,
                this.debugMode
              );
            })
          );
          log(
            `sendBatches(): Added all transactions to batch ${batchName}.`,
            undefined,
            this.debugMode
          );

          // Estimate first (like the single send() method)
          let estimatedUserOp;
          try {
            log(
              `sendBatches(): Estimating batch ${batchName} for sending...`,
              undefined,
              this.debugMode
            );
            estimatedUserOp = await etherspotModulaSdk.estimate({
              paymasterDetails,
            });
            log(
              `sendBatches(): Got estimated userOp for batch ${batchName}:`,
              estimatedUserOp,
              this.debugMode
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
                isEstimatedSuccessfully: false,
                isSentSuccessfully: false,
              });
              log(
                `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to estimate: ${estimationErrorMessage}`,
                tx,
                this.debugMode
              );
            });

            result.batches[batchName] = {
              transactions: sentTransactions,
              errorMessage: estimationErrorMessage,
              isEstimatedSuccessfully: false,
              isSentSuccessfully: false,
            };
            result.isEstimatedSuccessfully = false;
            result.isSentSuccessfully = false;

            log(
              `sendBatches(): Batch '${batchName}' estimation before send failed`,
              {
                error: estimationErrorMessage,
                chainId: batchChainId,
              },
              this.debugMode
            );
            return;
          }

          // Apply user overrides
          const finalUserOp = { ...estimatedUserOp };

          // Calculate total gas cost (using the same approach as original)
          log(
            `sendBatches(): Calculating total gas for batch ${batchName}...`,
            undefined,
            this.debugMode
          );
          const totalGas =
            await etherspotModulaSdk.totalGasEstimated(finalUserOp);
          log(
            `sendBatches(): Got totalGas for batch ${batchName}:`,
            totalGas,
            this.debugMode
          );
          const totalGasBigInt = BigInt(totalGas.toString());
          const maxFeePerGasBigInt = BigInt(
            finalUserOp.maxFeePerGas.toString()
          );
          const totalCost = totalGasBigInt * maxFeePerGasBigInt;
          log(
            `sendBatches(): Calculated total cost for batch ${batchName}:`,
            totalCost,
            this.debugMode
          );

          log(
            `sendBatches(): Batch '${batchName}' estimated, now sending...`,
            {
              transactionCount: batchTransactions.length,
              totalCost: totalCost.toString(),
              chainId: batchChainId,
            },
            this.debugMode
          );

          // Send the batch
          let userOpHash: string;
          try {
            log(
              `sendBatches(): Sending batch ${batchName}...`,
              undefined,
              this.debugMode
            );
            userOpHash = await etherspotModulaSdk.send(finalUserOp);
            log(
              `sendBatches(): Got userOpHash for batch ${batchName}:`,
              userOpHash,
              this.debugMode
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
                isEstimatedSuccessfully: true,
                isSentSuccessfully: false,
              });
              log(
                `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to send: ${sendErrorMessage}`,
                tx,
                this.debugMode
              );
            });

            result.batches[batchName] = {
              transactions: sentTransactions,
              userOpHash: undefined,
              errorMessage: sendErrorMessage,
              isEstimatedSuccessfully: true,
              isSentSuccessfully: false,
            };
            result.isSentSuccessfully = false;

            log(
              `sendBatches(): Batch '${batchName}' send failed`,
              {
                error: sendErrorMessage,
                chainId: batchChainId,
              },
              this.debugMode
            );
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
              isEstimatedSuccessfully: true,
              isSentSuccessfully: true,
            };
            sentTransactions.push(resultObj);
            log(
              `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' sent successfully.`,
              { transaction: tx, result: resultObj },
              this.debugMode
            );
          });

          result.batches[batchName] = {
            transactions: sentTransactions,
            userOpHash,
            isEstimatedSuccessfully: true,
            isSentSuccessfully: true,
          };

          log(
            `sendBatches(): Batch '${batchName}' sent successfully`,
            {
              transactionCount: batchTransactions.length,
              userOpHash,
              chainId: batchChainId,
            },
            this.debugMode
          );

          // Remove batch and its transactions from state after successful send
          if (result.batches[batchName].isSentSuccessfully) {
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
              isEstimatedSuccessfully: true,
              isSentSuccessfully: false,
            });
            log(
              `sendBatches(): Batch '${batchName}': Transaction '${tx.transactionName}' failed to send: ${errorMessage}`,
              tx,
              this.debugMode
            );
          });

          result.batches[batchName] = {
            transactions: sentTransactions,
            errorMessage,
            isEstimatedSuccessfully: true,
            isSentSuccessfully: false,
          };
          result.isSentSuccessfully = false;

          log(
            `sendBatches(): Batch '${batchName}' send failed`,
            {
              error: errorMessage,
              chainId: batchChainId,
            },
            this.debugMode
          );
        }
      })
    );

    // Set error state based on results (like original)
    this.containsSendingError = !result.isSentSuccessfully;
    this.isSending = false;

    return result;
  }

  /**
   * Returns the current state of the transaction kit instance, including all transactions, batches, and status flags.
   *
   * @returns An IInstance object containing the current state, including selected transaction/batch, all named transactions, batches, and status flags.
   *
   * @remarks
   * - Useful for debugging, inspection, or serialization of the current kit state.
   * - Does not mutate any internal state.
   */
  getState(): IInstance {
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
    log('getState(): Returning state', state, this.debugMode);
    return state;
  }

  /**
   * Enables or disables debug mode for verbose logging.
   *
   * @param enabled - If true, enables debug logging; if false, disables it.
   *
   * @remarks
   * - When enabled, all internal operations will log detailed information to the console.
   * - Useful for development and troubleshooting.
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    log('setDebugMode(): Debug mode set to', enabled, this.debugMode);
  }

  /**
   * Returns the underlying raw provider used by this kit (WalletProviderLike).
   *
   * @returns The WalletProviderLike instance.
   *
   * @remarks
   * - This is the provider you should use in your app for web3 interactions.
   * - For advanced operations, use getEtherspotProvider().
   */
  getProvider(): WalletProviderLike {
    return this.etherspotProvider.getProvider();
  }

  /**
   * Returns the EtherspotProvider instance for advanced use.
   *
   * @returns The EtherspotProvider instance.
   */
  getEtherspotProvider(): EtherspotProvider {
    return this.etherspotProvider;
  }

  /**
   * Returns the Etherspot Modular SDK instance for the specified chain.
   *
   * @param chainId - (Optional) The chain ID for which to get the SDK. Defaults to the provider's current chain.
   * @param forceNewInstance - (Optional) If true, forces creation of a new SDK instance.
   * @returns A promise that resolves to a ModularSdk instance.
   *
   * @remarks
   * - Useful for advanced operations or direct SDK access.
   * - May perform network requests or SDK initialization.
   */
  async getSdk(
    chainId?: number,
    forceNewInstance?: boolean
  ): Promise<ModularSdk> {
    log('getSdk(): Called with', { chainId, forceNewInstance }, this.debugMode);
    const sdk = await this.etherspotProvider.getSdk(chainId, forceNewInstance);
    log('getSdk(): Returning SDK', sdk, this.debugMode);
    return sdk;
  }

  /**
   * Polls for the transaction hash using a user operation hash and chain ID.
   *
   * @param userOpHash - The user operation hash to query.
   * @param txChainId - The chain ID to use for the SDK.
   * @param timeout - (Optional) Timeout in ms (default: 60000).
   * @param retryInterval - (Optional) Polling interval in ms (default: 2000).
   * @returns The transaction hash as a string, or null if not found in time.
   */
  public async getTransactionHash(
    userOpHash: string,
    txChainId: number,
    timeout: number = 60 * 1000,
    retryInterval: number = 2000
  ): Promise<string | null> {
    const etherspotModulaSdk = await this.getSdk(txChainId);

    let transactionHash: string | null = null;
    const timeoutTotal = Date.now() + timeout;

    while (!transactionHash && Date.now() < timeoutTotal) {
      await new Promise<void>((resolve) => setTimeout(resolve, retryInterval));
      try {
        transactionHash = await etherspotModulaSdk.getUserOpReceipt(userOpHash);
      } catch (error) {
        console.error(
          'Error fetching transaction hash. Please check if the transaction has gone through, or try to send the transaction again:',
          error
        );
      }
    }

    if (!transactionHash) {
      console.warn(
        'Failed to get the transaction hash within time limit. Please try again'
      );
    }

    return transactionHash;
  }

  /**
   * Resets all internal state, clearing all transactions, batches, and caches.
   *
   * @remarks
   * - This method is destructive: all in-memory transactions, batches, and cached addresses are removed.
   * - Useful for testing, re-initialization, or starting a new workflow.
   * - Does not affect persistent storage outside this instance.
   */
  public reset(): void {
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
    log('reset(): State has been reset.', this.debugMode);
  }

  // Callable static EtherspotUtils without needing to instantiate the class
  static utils = EtherspotUtils;
}

// Function for easier instantiation
export function TransactionKit(
  config: EtherspotTransactionKitConfig
): IInitial {
  return new EtherspotTransactionKit(config);
}
