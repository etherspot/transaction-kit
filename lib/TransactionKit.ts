/* eslint-disable quotes */
import { ModularSdk, WalletProviderLike } from '@etherspot/modular-sdk';
import {
  KERNEL_V3_3,
  KernelVersionToAddressesMap,
} from '@zerodev/sdk/constants';
import { isAddress } from 'viem';
import { SignAuthorizationReturnType } from 'viem/accounts';

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
  UserOp,
} from './interfaces';

// EtherspotProvider
import { EtherspotProvider } from './EtherspotProvider';

/// network
import { getChainFromId } from './network';

// utils
import { EtherspotUtils } from './EtherspotUtils';
import { log, parseEtherspotErrorMessage } from './utils';

export class EtherspotTransactionKit implements IInitial {
  // Security: Use private field (#) to prevent external access
  #etherspotProvider: EtherspotProvider;

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
    this.#etherspotProvider = new EtherspotProvider(config);
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
   * Retrieves the wallet address for the current or specified chain.
   *
   * Behavior depends on wallet mode:
   * - delegatedEoa: returns the EOA address from the delegated EOA account (derived from the configured private key). This is the sender address used for EIP-7702 flows. Does not require prior designation; simply reflects the EOA.
   * - modular: initializes the Modular SDK for the chain and returns the counterfactual smart account address.
   *
   * Caches the resulting address per chain for subsequent calls.
   *
   * @param chainId - (Optional) The chain ID for which to retrieve the wallet address. If not provided, uses the provider's current chain ID.
   * @returns The wallet address as a string, or undefined if it cannot be retrieved.
   * @throws {Error} For critical initialization errors (e.g., SDK init failure in modular mode).
   *
   * @remarks
   * - Asynchronous; may perform network requests (particularly in modular mode).
   * - Address is cached per chain.
   * - In delegatedEoa mode this returns the EOA address; EIP-7702 installation status is independent and can be checked via isDelegateSmartAccountToEoa().
   */
  async getWalletAddress(chainId?: number): Promise<string | undefined> {
    log('getWalletAddress(): Called with chainId', chainId, this.debugMode);
    const walletAddressChainId =
      chainId || this.#etherspotProvider.getChainId();

    // Check if the walletAddress is already in the instance
    if (this.walletAddresses[walletAddressChainId]) {
      log(
        `Returning wallet address for chain ${walletAddressChainId}`,
        this.walletAddresses[walletAddressChainId],
        this.debugMode
      );
      return this.walletAddresses[walletAddressChainId];
    }

    const walletMode = this.#etherspotProvider.getWalletMode();
    log(
      `getWalletAddress(): Wallet mode: ${walletMode}`,
      undefined,
      this.debugMode
    );

    try {
      if (walletMode === 'delegatedEoa') {
        // DelegatedEoa mode: Get address from delegatedEoa account
        const delegatedEoaAccount =
          await this.#etherspotProvider.getDelegatedEoaAccount(
            walletAddressChainId
          );

        const walletAddress = delegatedEoaAccount.address;
        log(
          `Got wallet address from delegatedEoa account for chain ${walletAddressChainId}`,
          walletAddress,
          this.debugMode
        );

        if (walletAddress) {
          this.walletAddresses[walletAddressChainId] = walletAddress;
        }

        return walletAddress;
      } else {
        // Modular mode: Get SDK instance for the chain
        const etherspotModularSdk =
          await this.#etherspotProvider.getSdk(walletAddressChainId);

        let walletAddress: string | undefined;
        try {
          walletAddress = await etherspotModularSdk.getCounterFactualAddress();
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
      }
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
   * This method verifies whether an EOA address has code deployed to it, which indicates
   * it has been designated as a smart account using EIP-7702 delegation.
   *
   * @param chainId - (Optional) The chain ID to check on. If not provided, uses the provider's current chain ID.
   * @returns A promise that resolves to true if the EOA has been designated, false otherwise, or undefined if check fails.
   * @throws {Error} If called in 'modular' wallet mode (only available in 'delegatedEoa' mode).
   *
   * @remarks
   * - Only available in 'delegatedEoa' wallet mode.
   * - In EIP-7702, when an EOA designates a smart contract implementation, the EOA address gets code.
   * - This method checks for the presence of code at the EOA address using the public client.
   * - Returns false if the address has no code (regular EOA), true if it has code (designated EOA).
   */
  async isDelegateSmartAccountToEoa(
    chainId?: number
  ): Promise<boolean | undefined> {
    const walletMode = this.#etherspotProvider.getWalletMode();

    log(
      'isDelegateSmartAccountToEoa(): Called with chainId',
      chainId,
      this.debugMode
    );
    log(
      `isDelegateSmartAccountToEoa(): Wallet mode: ${walletMode}`,
      undefined,
      this.debugMode
    );

    if (walletMode !== 'delegatedEoa') {
      this.throwError(
        "isDelegateSmartAccountToEoa() is only available in 'delegatedEoa' wallet mode. " +
          `Current mode: '${walletMode}'. ` +
          'This method checks if an EOA has been upgraded to a smart account using EIP-7702 delegation.'
      );
    }

    const checkChainId = chainId || this.#etherspotProvider.getChainId();

    try {
      // Get the delegatedEoa account to check the EOA address
      const delegatedEoaAccount =
        await this.#etherspotProvider.getDelegatedEoaAccount(checkChainId);
      const eoaAddress = delegatedEoaAccount.address;

      log(
        `isDelegateSmartAccountToEoa(): Checking if EOA ${eoaAddress} has been designated on chain ${checkChainId}`,
        { eoaAddress },
        this.debugMode
      );

      const publicClient =
        await this.#etherspotProvider.getPublicClient(checkChainId);

      const senderCode = await publicClient.getCode({
        address: eoaAddress,
      });

      log(
        `isDelegateSmartAccountToEoa(): Got code at EOA address`,
        { senderCode },
        this.debugMode
      );

      const hasEIP7702Designation =
        senderCode !== undefined &&
        senderCode !== '0x' &&
        senderCode.startsWith('0xef0100');

      log(
        `isDelegateSmartAccountToEoa(): EOA ${eoaAddress} ${hasEIP7702Designation ? 'HAS' : 'DOES NOT HAVE'} EIP-7702 designation`,
        { senderCode, hasEIP7702Designation },
        this.debugMode
      );

      return hasEIP7702Designation;
    } catch (error) {
      log(
        `isDelegateSmartAccountToEoa(): Failed to check smart wallet status for chain ${checkChainId}`,
        error,
        this.debugMode
      );
      return undefined;
    }
  }

  /**
   * This method authorizes the EOA to delegate control to a Kernel smart account implementation and EIP-7702,
   * enabling smart wallet features. The authorization is only signed if the EOA is not already designated.
   *
   * @param chainId - (Optional) The chain ID to install the smart wallet on. If not provided, uses the provider's current chain ID.
   * @param isExecuting - (Optional) Whether to execute the installation transaction. Defaults to true.
   * @returns A promise that resolves to an object containing:
   *   - `authorization`: The signed authorization (if signed), or undefined if already installed
   *   - `isAlreadyInstalled`: True if any EIP-7702 designation already exists; otherwise false
   *   - `eoaAddress`: The EOA that is designated
   *   - `delegateAddress`: The Kernel implementation address (v3.3)
   *   - `txHash`: The UserOp hash if execution succeeded
   * @throws {Error} If called in 'modular' wallet mode, the chain ID is unsupported, or signing fails.
   *
   * @remarks
   * - Only available in 'delegatedEoa' wallet mode.
   * - First checks for any existing 7702 designation; if present, returns early as already installed.
   * - If not installed, signs a Kernel authorization, and if `isExecuting` is true, submits a no-op UserOp to activate.
   * - If execution fails, the method returns the signed authorization so callers can retry submission externally.
   */
  async delegateSmartAccountToEoa({
    chainId,
    isExecuting = true,
  }: {
    chainId?: number;
    isExecuting?: boolean;
  } = {}): Promise<{
    authorization: SignAuthorizationReturnType | undefined;
    isAlreadyInstalled: boolean;
    eoaAddress: string;
    delegateAddress: string;
    userOpHash?: string;
  }> {
    const walletMode = this.#etherspotProvider.getWalletMode();
    const installChainId = chainId || this.#etherspotProvider.getChainId();

    log(
      'delegateSmartAccountToEoa(): Called',
      { installChainId, isExecuting },
      this.debugMode
    );

    if (walletMode !== 'delegatedEoa') {
      this.throwError(
        "delegateSmartAccountToEoa() is only available in 'delegatedEoa' wallet mode. " +
          `Current mode: '${walletMode}'.`
      );
    }

    try {
      // Get required clients and addresses
      const owner =
        await this.#etherspotProvider.getOwnerAccount(installChainId);
      const bundlerClient =
        await this.#etherspotProvider.getBundlerClient(installChainId);
      const eoaAddress = owner.address as `0x${string}`;
      const delegateAddress = KernelVersionToAddressesMap[KERNEL_V3_3]
        .accountImplementationAddress as `0x${string}`;

      // Check if already installed
      const isAlreadyInstalled =
        await this.isDelegateSmartAccountToEoa(installChainId);

      if (isAlreadyInstalled) {
        log(
          'delegateSmartAccountToEoa(): Already installed',
          { eoaAddress, delegateAddress },
          this.debugMode
        );
        return {
          authorization: undefined,
          isAlreadyInstalled: true,
          eoaAddress,
          delegateAddress,
        };
      }

      // Sign authorization only if needed
      let authorization: SignAuthorizationReturnType | undefined;
      if (!isAlreadyInstalled) {
        authorization = await bundlerClient.signAuthorization({
          account: owner,
          contractAddress: delegateAddress,
        });
      }

      log(
        'delegateSmartAccountToEoa(): Authorization signed',
        { authorization, eoaAddress, delegateAddress },
        this.debugMode
      );

      // If not executing, just return the authorization
      if (!isExecuting) {
        return {
          authorization,
          isAlreadyInstalled: false,
          eoaAddress,
          delegateAddress,
        };
      }

      // Execute UserOp with authorization
      if (authorization) {
        const delegatedEoaAccount =
          await this.#etherspotProvider.getDelegatedEoaAccount(installChainId);

        try {
          const userOpHash = await bundlerClient.sendUserOperation({
            account: delegatedEoaAccount,
            authorization,
            calls: [
              {
                to: eoaAddress,
                value: BigInt(0),
                data: '0x' as `0x${string}`,
              },
            ],
          });

          log(
            'delegateSmartAccountToEoa(): UserOp executed with EIP-7702 authorization',
            { userOpHash },
            this.debugMode
          );

          return {
            authorization,
            isAlreadyInstalled: false,
            eoaAddress,
            delegateAddress,
            userOpHash,
          };
        } catch (executionError) {
          // Return the signed authorization so the caller can retry
          log(
            'delegateSmartAccountToEoa(): UserOp execution failed, returning authorization for retry',
            executionError,
            this.debugMode
          );

          return {
            authorization,
            isAlreadyInstalled: false,
            eoaAddress,
            delegateAddress,
          };
        }
      }

      return {
        authorization,
        isAlreadyInstalled: false,
        eoaAddress,
        delegateAddress,
      };
    } catch (error) {
      log('delegateSmartAccountToEoa(): Failed', error, this.debugMode);
      throw error;
    }
  }

  /**
   * This method revokes the EOA's delegation to the smart account EIP-7702 implementation by authorizing
   * delegation to the zero address, effectively reverting the EOA to its original state.
   *
   * @param chainId - (Optional) The chain ID to uninstall the smart wallet from. If not provided, uses the provider's current chain ID.
   * @param isExecuting - (Optional) Whether to execute the uninstallation transaction. Defaults to true.
   * @returns A promise that resolves to an object containing:
   *   - `authorization`: The signed authorization object to clear delegation
   *   - `eoaAddress`: The EOA address
   *   - `txHash`: The transaction hash (if execution was successful)
   * @throws {Error} If called in 'modular' wallet mode (only available in 'delegatedEoa' mode).
   * @throws {Error} If the chain ID is not supported.
   * @throws {Error} If authorization signing fails.
   *
   * @remarks
   * - Only available in 'delegatedEoa' wallet mode.
   * - This clears the EIP-7702 delegation by authorizing the zero address (0x0000...0000).
   * - If isExecuting is true, executes a "dead" transaction (0xdeadbeef) with the authorization to revoke EIP-7702.
   * - If isExecuting is false, only signs and returns the authorization for later use.
   * - If userOp execution fails, the authorization is still returned so the caller can retry.
   * - After uninstallation, the EOA will function as a regular externally owned account.
   */
  async undelegateSmartAccountToEoa({
    chainId,
    isExecuting = true,
  }: {
    chainId?: number;
    isExecuting?: boolean;
  } = {}): Promise<{
    authorization: SignAuthorizationReturnType | undefined;
    eoaAddress: string;
    userOpHash?: string;
  }> {
    const walletMode = this.#etherspotProvider.getWalletMode();
    const uninstallChainId = chainId || this.#etherspotProvider.getChainId();

    log(
      'undelegateSmartAccountToEoa(): Called',
      { uninstallChainId, isExecuting },
      this.debugMode
    );

    if (walletMode !== 'delegatedEoa') {
      this.throwError(
        "undelegateSmartAccountToEoa() is only available in 'delegatedEoa' wallet mode. " +
          `Current mode: '${walletMode}'.`
      );
    }

    try {
      // Get required clients and addresses
      const owner =
        await this.#etherspotProvider.getOwnerAccount(uninstallChainId);
      const eoaAddress = owner.address as `0x${string}`;
      const zeroAddress =
        '0x0000000000000000000000000000000000000000' as `0x${string}`;

      // Check if already installed
      const isAlreadyInstalled =
        await this.isDelegateSmartAccountToEoa(uninstallChainId);

      if (!isAlreadyInstalled) {
        log(
          'undelegateSmartAccountToEoa(): Wallet is not a smart wallet, no uninstall needed',
          { eoaAddress },
          this.debugMode
        );
        return {
          authorization: undefined,
          eoaAddress,
        };
      }

      // Get wallet client from EtherspotProvider (uses bundler URL)
      const walletClient =
        await this.#etherspotProvider.getWalletClient(uninstallChainId);

      // Sign authorization to zero address to clear delegation
      const authorization = await walletClient.signAuthorization({
        account: owner,
        address: zeroAddress,
        executor: 'self',
      });

      log(
        'undelegateSmartAccountToEoa(): Authorization signed',
        { authorization, eoaAddress },
        this.debugMode
      );

      // If not executing, just return the authorization
      if (!isExecuting) {
        return {
          authorization,
          eoaAddress,
        };
      }

      // Execute UserOp with authorization
      if (authorization) {
        try {
          const userOpHash = await walletClient.sendTransaction({
            account: owner,
            chain: getChainFromId(uninstallChainId),
            authorizationList: [authorization],
            to: owner.address,
            data: '0xdeadbeef',
            type: 'eip7702',
          });

          log(
            'undelegateSmartAccountToEoa(): UserOp executed with EIP-7702 authorization',
            { userOpHash },
            this.debugMode
          );

          return {
            authorization,
            eoaAddress,
            userOpHash,
          };
        } catch (executionError) {
          // Return the signed authorization so the caller can retry
          log(
            'undelegateSmartAccountToEoa(): Send transaction execution failed, returning authorization for retry',
            executionError,
            this.debugMode
          );

          return {
            authorization,
            eoaAddress,
          };
        }
      }

      return {
        authorization,
        eoaAddress,
      };
    } catch (error) {
      log('undelegateSmartAccountToEoa(): Failed', error, this.debugMode);
      throw error;
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
    chainId,
    to,
    value = '0',
    data = '0x',
  }: TransactionParams): ITransaction {
    if (chainId === undefined || chainId === null) {
      this.throwError(
        'transaction(): chainId is required. Please specify the target network explicitly.'
      );
    }

    if (typeof chainId !== 'number' || !Number.isInteger(chainId)) {
      this.throwError('transaction(): chainId must be a valid number.');
    }

    if (!to) {
      this.throwError('transaction(): to is required.');
    }

    if (!isAddress(to)) {
      this.throwError(`transaction(): '${to}' is not a valid address.`);
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
   * This method validates the current transaction context and performs an estimation using:
   * - modular mode: the Etherspot Modular SDK batch and estimate flow
   * - delegatedEoa mode: viem account abstraction with EIP-7702; requires prior designation
   *
   * @param params - (Optional) Estimation parameters:
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions (modular mode only)
   *   - `gasDetails`: Custom gas settings for the user operation (modular mode only).
   *   - `callGasLimit`: Optional override for the call gas limit (modular mode only).
   *
   * @returns A promise that resolves to a `TransactionEstimateResult` combined with `IEstimatedTransaction`, containing:
   *   - Transaction details (to, value, data, chainId)
   *   - Estimated cost and gas usage
   *   - UserOp object (if successful)
   *   - Error message and type (if estimation fails)
   *   - `isEstimatedSuccessfully` flag
   *
   * @throws {Error} If:
   *   - A batch is currently selected (use `estimateBatches()` instead).
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
   * - **delegatedEoa mode:**
   *   - Requires the EOA to be designated (EIP-7702). If not, returns a validation error instructing to authorize first.
   *   - `paymasterDetails` and manual `userOpOverrides` are not supported.
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
        chainId: this.#etherspotProvider.getChainId(),
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

    // Only validate provider in modular mode
    const walletMode = this.#etherspotProvider.getWalletMode();
    if (walletMode === 'modular') {
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
    }

    this.isEstimating = true;
    this.containsEstimatingError = false;

    log(`estimate(): Wallet mode: ${walletMode}`, undefined, this.debugMode);

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
          this.workingTransaction?.chainId ??
          this.#etherspotProvider.getChainId(),
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

      const transactionChainId = this.workingTransaction!.chainId;

      if (walletMode === 'delegatedEoa') {
        // DelegatedEoa mode: Use viem account abstraction
        log(
          'estimate(): Using delegatedEoa mode for estimation',
          undefined,
          this.debugMode
        );

        // Validate that unsupported parameters are not provided in delegatedEoa mode
        if (paymasterDetails) {
          return setErrorAndReturn(
            'paymasterDetails is not yet supported in delegatedEoa mode.',
            'VALIDATION_ERROR',
            {}
          );
        }

        if (gasDetails) {
          return setErrorAndReturn(
            'gasDetails is not yet supported in delegatedEoa mode.',
            'VALIDATION_ERROR',
            {}
          );
        }

        if (callGasLimit) {
          return setErrorAndReturn(
            'callGasLimit is not yet supported in delegatedEoa mode.',
            'VALIDATION_ERROR',
            {}
          );
        }

        try {
          // Get delegatedEoa account and bundler client
          log(
            'estimate(): Getting delegatedEoa account and bundler client...',
            undefined,
            this.debugMode
          );
          const delegatedEoaAccount =
            await this.#etherspotProvider.getDelegatedEoaAccount(
              transactionChainId
            );
          const bundlerClient =
            await this.#etherspotProvider.getBundlerClient(transactionChainId);

          log(
            'estimate(): Got delegatedEoa account and bundler client',
            { address: delegatedEoaAccount.address },
            this.debugMode
          );

          // Check if EOA is designated (has EIP-7702 authorization)
          const isDelegateSmartAccountToEoaDelegated =
            await this.isDelegateSmartAccountToEoa(transactionChainId);
          log(
            `estimate(): EOA designation status: ${isDelegateSmartAccountToEoaDelegated ? 'designated' : 'NOT designated'}`,
            { isDelegateSmartAccountToEoaDelegated },
            this.debugMode
          );

          // If EOA is not designated, return error - user must authorize first
          if (!isDelegateSmartAccountToEoaDelegated) {
            log(
              'estimate(): EOA is not designated. User must authorize EIP-7702 delegation first.',
              { eoaAddress: delegatedEoaAccount.address },
              this.debugMode
            );
            return setErrorAndReturn(
              'EOA is not yet designated as a smart account. The EOA must first authorize EIP-7702 delegation before transactions can be estimated. ' +
                'This is a one-time authorization that designates the EOA to use smart account functionality.',
              'VALIDATION_ERROR',
              {}
            );
          }

          // Prepare the call
          const call = {
            to: (this.workingTransaction!.to || '') as `0x${string}`,
            value: BigInt(this.workingTransaction!.value?.toString() || '0'),
            data: (this.workingTransaction!.data || '0x') as `0x${string}`,
          };

          log('estimate(): Prepared call', call, this.debugMode);

          // Estimate gas for the user operation
          log('estimate(): Estimating gas...', undefined, this.debugMode);
          const gasEstimate = await bundlerClient.estimateUserOperationGas({
            account: delegatedEoaAccount,
            calls: [call],
          });

          log(
            'estimate(): Got gas estimate',
            {
              callGasLimit: gasEstimate.callGasLimit?.toString(),
              verificationGasLimit:
                gasEstimate.verificationGasLimit?.toString(),
              preVerificationGas: gasEstimate.preVerificationGas?.toString(),
              paymasterVerificationGasLimit:
                gasEstimate.paymasterVerificationGasLimit?.toString(),
              paymasterPostOpGasLimit:
                gasEstimate.paymasterPostOpGasLimit?.toString(),
            },
            this.debugMode
          );

          // Always use manual fee calculation for consistency and reliability
          const publicClient =
            await this.#etherspotProvider.getPublicClient(transactionChainId);

          const maxFeePerGasResponse = await publicClient.estimateFeesPerGas();

          const maxFeePerGas = maxFeePerGasResponse?.maxFeePerGas || BigInt(0);
          const maxPriorityFeePerGas =
            maxFeePerGasResponse?.maxPriorityFeePerGas || BigInt(0);

          log(
            'estimate(): Using manual fee calculation',
            {
              maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
              maxFeePerGas: maxFeePerGas.toString(),
            },
            this.debugMode
          );

          // Calculate total gas cost using maxFeePerGas
          const totalGasBigInt =
            BigInt(gasEstimate.callGasLimit || 0) +
            BigInt(gasEstimate.verificationGasLimit || 0) +
            BigInt(gasEstimate.preVerificationGas || 0);

          // Use maxFeePerGas for cost calculation
          const cost = totalGasBigInt * maxFeePerGas;

          log(
            'estimate(): Calculated cost',
            {
              totalGas: totalGasBigInt.toString(),
              maxFeePerGas: maxFeePerGas.toString(),
              cost: cost.toString(),
            },
            this.debugMode
          );

          log(
            'estimate(): Single transaction estimated successfully (delegatedEoa)',
            {
              to: this.workingTransaction?.to,
              cost: cost.toString(),
              gasUsed: totalGasBigInt.toString(),
            },
            this.debugMode
          );

          // Success: reset error states
          this.isEstimating = false;
          this.containsEstimatingError = false;

          // Get the current nonce for the smart account
          const nonce = await publicClient.getTransactionCount({
            address: delegatedEoaAccount.address,
            blockTag: 'pending',
          });

          // Encode the call data for the transaction
          const callData = await delegatedEoaAccount.encodeCalls([call]);

          log(
            'estimate(): Got UserOp data',
            {
              nonce: nonce.toString(),
              callData: callData,
              sender: delegatedEoaAccount.address,
            },
            this.debugMode
          );

          // Create an UserOp object
          const userOp: UserOp = {
            sender: delegatedEoaAccount.address,
            nonce: BigInt(nonce),
            callData: callData,
            callGasLimit: gasEstimate.callGasLimit || BigInt(0),
            verificationGasLimit: gasEstimate.verificationGasLimit || BigInt(0),
            preVerificationGas: gasEstimate.preVerificationGas || BigInt(0),
            maxFeePerGas: maxFeePerGas, // Use proper EIP-1559 maxFeePerGas
            maxPriorityFeePerGas: maxPriorityFeePerGas, // Use proper EIP-1559 maxPriorityFeePerGas
            paymasterData: '0x', // Paymaster not supported in delegatedEoa mode
            signature: '0x', // Will be set during actual send
            factory: undefined,
            factoryData: undefined,
            paymaster: undefined, // Paymaster not supported in delegatedEoa mode
            paymasterVerificationGasLimit:
              gasEstimate.paymasterVerificationGasLimit || BigInt(0),
            paymasterPostOpGasLimit:
              gasEstimate.paymasterPostOpGasLimit || BigInt(0),
          };

          const result = {
            to: this.workingTransaction?.to || '',
            value: this.workingTransaction?.value?.toString(),
            data: this.workingTransaction?.data,
            chainId: this.workingTransaction!.chainId,
            cost,
            userOp,
            isEstimatedSuccessfully: true,
          };
          log(
            'estimate(): Returning success result (delegatedEoa)',
            result,
            this.debugMode
          );
          return { ...result, ...this };
        } catch (estimationError) {
          const errorMessage = parseEtherspotErrorMessage(
            estimationError,
            'Failed to estimate transaction in delegatedEoa mode!'
          );

          log(
            'estimate(): DelegatedEoa transaction estimation failed',
            {
              error: errorMessage,
            },
            this.debugMode
          );

          return setErrorAndReturn(errorMessage, 'ESTIMATION_ERROR', {});
        }
      } else {
        // Modular mode: Use Etherspot SDK
        log(
          'estimate(): Using modular mode for estimation',
          undefined,
          this.debugMode
        );

        // Get fresh SDK instance to avoid state pollution
        log('estimate(): Getting SDK...', undefined, this.debugMode);
        const etherspotModularSdk = await this.#etherspotProvider.getSdk(
          transactionChainId,
          true
        );
        log('estimate(): Got SDK:', etherspotModularSdk, this.debugMode);

        // Clear any existing operations
        log(
          'estimate(): Clearing user ops from batch...',
          undefined,
          this.debugMode
        );
        await etherspotModularSdk.clearUserOpsFromBatch();
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
        await etherspotModularSdk.addUserOpsToBatch({
          to: this.workingTransaction.to || '',
          value: this.workingTransaction.value.toString(),
          data: this.workingTransaction.data,
        });
        log('estimate(): Added user op to batch.', undefined, this.debugMode);

        // Estimate the transaction
        log('estimate(): Estimating user op...', undefined, this.debugMode);
        const userOp = await etherspotModularSdk.estimate({
          paymasterDetails,
          gasDetails,
          callGasLimit,
        });
        log('estimate(): Got userOp:', userOp, this.debugMode);

        // Calculate total gas cost
        log('estimate(): Calculating total gas...', undefined, this.debugMode);
        const totalGas = await etherspotModularSdk.totalGasEstimated(userOp);
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
          chainId: this.workingTransaction!.chainId,
          cost,
          userOp,
          isEstimatedSuccessfully: true,
        };
        log('estimate(): Returning success result.', result, this.debugMode);
        return { ...result, ...this };
      }
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
   * This method validates the current transaction context, estimates, and submits the transaction using:
   * - modular mode: the Etherspot Modular SDK batch and send flow
   * - delegatedEoa mode: viem account abstraction with EIP-7702; requires prior designation
   *
   * @param params - (Optional) Send parameters:
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions. Not supported in delegatedEoa mode (validation error).
   *   - `userOpOverrides`: Optional overrides for user operation fields. Not supported in delegatedEoa mode (validation error).
   *
   * @returns A promise that resolves to a `TransactionSendResult` combined with `ISentTransaction`, containing:
   *   - Transaction details (to, value, data, chainId)
   *   - Estimated and actual cost and gas usage
   *   - UserOp object and userOpHash (if successful)
   *   - Error message and type (if sending fails)
   *   - `isEstimatedSuccessfully` and `isSentSuccessfully` flags
   *
   * @throws {Error} If:
   *   - A batch is currently selected (use `sendBatches()` instead).
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
   * - **delegatedEoa mode:**
   *   - Requires the EOA to be designated (EIP-7702). If not, returns a validation error instructing to authorize first.
   *   - Obtains the delegated EOA account and bundler client to submit a UserOp.
   *   - `paymasterDetails` and `userOpOverrides` are not supported.
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
        chainId: this.#etherspotProvider.getChainId(),
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

    // Only validate provider in modular mode
    const walletMode = this.#etherspotProvider.getWalletMode();
    if (walletMode === 'modular') {
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
    }

    this.isSending = true;
    this.containsSendingError = false;

    log(`send(): Wallet mode: ${walletMode}`, undefined, this.debugMode);

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
          this.workingTransaction?.chainId ??
          this.#etherspotProvider.getChainId(),
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
      const transactionChainId = this.workingTransaction!.chainId;

      if (walletMode === 'delegatedEoa') {
        // DelegatedEoa mode: Use viem account abstraction
        log(
          'send(): Using delegatedEoa mode for sending',
          undefined,
          this.debugMode
        );

        // Validate that unsupported parameters are not provided in delegatedEoa mode
        if (paymasterDetails) {
          return setErrorAndReturn(
            'paymasterDetails is not yet supported in delegatedEoa mode.',
            'VALIDATION_ERROR',
            {}
          );
        }

        if (userOpOverrides) {
          return setErrorAndReturn(
            'userOpOverrides is not yet supported in delegatedEoa mode.',
            'VALIDATION_ERROR',
            {}
          );
        }

        try {
          // Get delegatedEoa account and bundler client
          log(
            'send(): Getting delegatedEoa account and bundler client...',
            undefined,
            this.debugMode
          );
          const delegatedEoaAccount =
            await this.#etherspotProvider.getDelegatedEoaAccount(
              transactionChainId
            );
          const bundlerClient =
            await this.#etherspotProvider.getBundlerClient(transactionChainId);

          log(
            'send(): Got delegatedEoa account and bundler client',
            {
              address: delegatedEoaAccount.address,
              chainId: transactionChainId,
            },
            this.debugMode
          );

          // Check if EOA is designated (has EIP-7702 authorization)
          log(
            'send(): Checking EOA designation status...',
            undefined,
            this.debugMode
          );
          const isDelegateSmartAccountToEoaDelegated =
            await this.isDelegateSmartAccountToEoa(transactionChainId);
          log(
            `send(): EOA designation status: ${isDelegateSmartAccountToEoaDelegated ? 'designated' : 'NOT designated'}`,
            { isDelegateSmartAccountToEoaDelegated },
            this.debugMode
          );

          // If EOA is not designated, return error - user must authorize first
          if (!isDelegateSmartAccountToEoaDelegated) {
            log(
              'send(): EOA is not designated. User must authorize EIP-7702 delegation first.',
              { eoaAddress: delegatedEoaAccount.address },
              this.debugMode
            );
            return setErrorAndReturn(
              'EOA is not yet designated as a smart account. The EOA must first authorize EIP-7702 delegation before transactions can be sent. ' +
                'This is a one-time authorization that designates the EOA to use smart account functionality.',
              'VALIDATION_ERROR',
              {}
            );
          }

          // Prepare the call
          const call = {
            to: (this.workingTransaction!.to || '') as `0x${string}`,
            value: BigInt(this.workingTransaction!.value?.toString() || '0'),
            data: (this.workingTransaction!.data || '0x') as `0x${string}`,
          };

          log('send(): Prepared call for delegatedEoa', call, this.debugMode);

          // Send the user operation
          let userOpHash: string;
          try {
            log('send(): Sending user operation...', undefined, this.debugMode);
            userOpHash = await bundlerClient.sendUserOperation({
              account: delegatedEoaAccount,
              calls: [call],
            });
            log('send(): Got userOpHash:', userOpHash, this.debugMode);
          } catch (sendError) {
            const sendErrorMessage = parseEtherspotErrorMessage(
              sendError,
              'Failed to send transaction in delegatedEoa mode!'
            );

            log(
              'send(): Transaction send failed (delegatedEoa)',
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
                this.workingTransaction?.chainId ??
                this.#etherspotProvider.getChainId(),
              isEstimatedSuccessfully: false,
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

          // Try to get the user operation details with retries
          // The bundler needs time to process the userOp after it's sent
          let userOpDetails = null;
          const maxRetries = 3;
          const retryDelay = 4000; // 4 seconds between retries

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              // Wait for the bundler to process the userOp
              await new Promise((resolve) => setTimeout(resolve, retryDelay));

              log(
                `send(): Attempting to get user operation details (attempt ${attempt}/${maxRetries})...`,
                { userOpHash },
                this.debugMode
              );

              userOpDetails = await bundlerClient.getUserOperation({
                hash: userOpHash as `0x${string}`,
              });

              log(
                'send(): Got user operation details:',
                userOpDetails,
                this.debugMode
              );
              break; // Success, exit the retry loop
            } catch (getUserOpError) {
              log(
                `send(): Attempt ${attempt} failed to retrieve user operation details:`,
                getUserOpError,
                this.debugMode
              );

              if (attempt === maxRetries) {
                log(
                  'send(): All attempts failed to retrieve user operation details. But the transaction was sent successfully.',
                  undefined,
                  this.debugMode
                );
              }
            }
          }

          // Success: reset error states
          this.isSending = false;
          this.containsSendingError = false;

          // Save transaction data before clearing state
          const successResult = {
            to: this.workingTransaction?.to || '',
            value: this.workingTransaction?.value?.toString(),
            data: this.workingTransaction?.data,
            chainId:
              this.workingTransaction?.chainId ||
              this.#etherspotProvider.getChainId(),
          };

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

          // Calculate cost and create proper UserOp object from userOp details if available
          let cost = undefined;
          let userOp = undefined;

          if (userOpDetails?.userOperation) {
            const viemUserOp = userOpDetails.userOperation;

            // Calculate total cost
            const totalGas =
              viemUserOp.callGasLimit +
              viemUserOp.verificationGasLimit +
              viemUserOp.preVerificationGas;
            cost = totalGas * viemUserOp.maxFeePerGas;

            // Convert Viem UserOp to our UserOp
            userOp = {
              sender: viemUserOp.sender,
              nonce: viemUserOp.nonce,
              callData: viemUserOp.callData,
              callGasLimit: viemUserOp.callGasLimit,
              verificationGasLimit: viemUserOp.verificationGasLimit,
              preVerificationGas: viemUserOp.preVerificationGas,
              maxFeePerGas: viemUserOp.maxFeePerGas,
              maxPriorityFeePerGas: viemUserOp.maxPriorityFeePerGas,
              paymasterData: viemUserOp.paymasterAndData || '0x',
              signature: viemUserOp.signature,
              factory: viemUserOp.factory || undefined,
              factoryData: viemUserOp.factoryData || undefined,
              paymaster: undefined,
              paymasterVerificationGasLimit:
                viemUserOp.paymasterVerificationGasLimit,
              paymasterPostOpGasLimit: viemUserOp.paymasterPostOpGasLimit,
            };

            log(
              'send(): Calculated cost from userOp details:',
              {
                totalGas: totalGas.toString(),
                maxFeePerGas: viemUserOp.maxFeePerGas.toString(),
                cost: cost.toString(),
              },
              this.debugMode
            );
          }

          const result = {
            ...successResult,
            cost,
            userOp,
            userOpHash,
            isEstimatedSuccessfully: false,
            isSentSuccessfully: true,
          };

          log(
            'send(): Returning success result (delegatedEoa).',
            result,
            this.debugMode
          );
          return { ...result, ...this };
        } catch (setupError) {
          const errorMessage = parseEtherspotErrorMessage(
            setupError,
            'Failed to setup or send transaction in delegatedEoa mode!'
          );

          log(
            'send(): Setup or send failed (delegatedEoa)',
            { error: errorMessage },
            this.debugMode
          );

          return setErrorAndReturn(errorMessage, 'SEND_ERROR', {});
        }
      } else {
        // Modular mode: Use Etherspot SDK
        log(
          'send(): Using modular mode for sending',
          undefined,
          this.debugMode
        );

        // Get fresh SDK instance to avoid state pollution
        log('send(): Getting SDK...', undefined, this.debugMode);
        const etherspotModularSdk = await this.#etherspotProvider.getSdk(
          transactionChainId,
          true
        );
        log('send(): Got SDK:', etherspotModularSdk, this.debugMode);

        // Clear any existing operations
        log(
          'send(): Clearing user ops from batch...',
          undefined,
          this.debugMode
        );
        await etherspotModularSdk.clearUserOpsFromBatch();
        log('send(): Cleared user ops from batch.', undefined, this.debugMode);

        // Add the transaction to the userOp Batch
        log(
          'send(): Adding user op to batch...',
          this.workingTransaction,
          this.debugMode
        );
        await etherspotModularSdk.addUserOpsToBatch({
          to: this.workingTransaction?.to || '',
          value: this.workingTransaction?.value?.toString(),
          data: this.workingTransaction?.data || '0x',
        });
        log('send(): Added user op to batch.', undefined, this.debugMode);

        // Estimate the transaction
        let estimatedUserOp;
        try {
          log('send(): Estimating user op...', undefined, this.debugMode);
          estimatedUserOp = await etherspotModularSdk.estimate({
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
        const totalGas =
          await etherspotModularSdk.totalGasEstimated(finalUserOp);
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
          userOpHash = await etherspotModularSdk.send(finalUserOp);
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
              this.workingTransaction?.chainId ??
              this.#etherspotProvider.getChainId(),
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

        // Save transaction data before clearing state
        const successResult = {
          to: this.workingTransaction?.to || '',
          value: this.workingTransaction?.value?.toString(),
          data: this.workingTransaction?.data,
          chainId: this.workingTransaction!.chainId,
        };

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
          ...successResult,
          cost,
          userOp: finalUserOp,
          userOpHash,
          isEstimatedSuccessfully: true,
          isSentSuccessfully: true,
        };
        log('send(): Returning success result.', result, this.debugMode);
        return { ...result, ...this };
      }
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
   * Estimates gas and cost for all batches of transactions.
   *
   * Provides comprehensive batch estimation with support for both modular and delegatedEoa wallet modes. Groups transactions by chainId for efficient multi-chain processing and aggregates results at both chain group and batch levels.
   *
   * @param params - (Optional) Estimation parameters:
   *   - `onlyBatchNames`: Array of batch names to estimate. If omitted, all batches are estimated.
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions (modular mode only).
   *
   * @returns A promise that resolves to a `BatchEstimateResult` containing:
   *   - A mapping of batch names to their estimation results with chain group breakdown
   *   - Each batch result includes: transactions, chainGroups, totalCost, errorMessage, isEstimatedSuccessfully
   *   - An overall `isEstimatedSuccessfully` flag indicating if all batches were estimated successfully
   *
   * @throws {Error} If provider is unavailable (modular mode) or another estimation is in progress.
   *
   * @remarks
   * - **Wallet Mode Support:**
   *   - **Modular Mode**: Uses Etherspot SDK for estimation with full paymaster support
   *   - **DelegatedEoa Mode**: Uses viem bundler client for EIP-7702 account abstraction estimation
   * - **Multi-Chain Processing:**
   *   - Automatically groups transactions by chainId for separate estimation per chain
   *   - Each chain group is processed independently with its own SDK/client instance
   *   - Supports mixed-chain batches with proper cost aggregation
   * - **EIP-7702 Validation (DelegatedEoa Mode):**
   *   - Validates EOA designation before estimation using `isDelegateSmartAccountToEoa()` check
   *   - Requires prior authorization via `delegateSmartAccountToEoa()` method
   * - **Cost Aggregation:**
   *   - Tracks costs at both chain group and batch levels
   *   - Calculates total costs using current gas prices from `estimateFeesPerGas()`
   *   - Includes call gas, verification gas, and pre-verification gas in total cost
   * - **Error Handling:**
   *   - Returns error results instead of throwing for most validation failures
   *   - Failed chain groups don't prevent other chain groups from being processed
   *   - Only throws for critical configuration errors (missing provider, concurrent operations)
   * - **Usage:**
   *   - Essential before calling `sendBatches()` for cost verification
   *   - For single transaction estimation, use `estimate()` instead
   */
  async estimateBatches({
    onlyBatchNames,
    paymasterDetails,
  }: EstimateBatchesParams = {}): Promise<BatchEstimateResult> {
    // ========================================================================
    // STEP 1: INPUT VALIDATION AND SETUP
    // ========================================================================

    // Prevent concurrent estimations to avoid race conditions
    if (this.isEstimating) {
      this.throwError(
        'Another estimation is already in progress. Please wait for it to complete.'
      );
    }

    // Validate onlyBatchNames parameter if provided
    if (onlyBatchNames) {
      if (!Array.isArray(onlyBatchNames)) {
        this.throwError('onlyBatchNames must be an array of strings');
      }
      onlyBatchNames.forEach((name, index) => {
        if (typeof name !== 'string' || name.trim() === '') {
          this.throwError(
            `onlyBatchNames[${index}] must be a non-empty string`
          );
        }
      });
    }

    // Set estimation state flags
    this.isEstimating = true;
    this.containsEstimatingError = false;

    const walletMode = this.#etherspotProvider.getWalletMode();
    log(
      `estimateBatches(): Wallet mode: ${walletMode}`,
      undefined,
      this.debugMode
    );

    // Initialize result structure
    const result: BatchEstimateResult = {
      batches: {},
      isEstimatedSuccessfully: true,
    };

    // ========================================================================
    // STEP 2: DETERMINE BATCHES TO ESTIMATE
    // ========================================================================

    // Use provided batch names or estimate all existing batches
    const batchesToEstimate = onlyBatchNames || Object.keys(this.batches);

    if (batchesToEstimate.length === 0) {
      log('estimateBatches(): No batches to estimate', this.debugMode);
      this.isEstimating = false;
      return result;
    }

    // ========================================================================
    // STEP 3: MODE-SPECIFIC VALIDATION
    // ========================================================================

    // Modular mode requires a Web3 provider for SDK operations
    if (walletMode === 'modular') {
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
    }

    // ========================================================================
    // STEP 4: ESTIMATION EXECUTION (MODE-SPECIFIC)
    // ========================================================================

    if (walletMode === 'delegatedEoa') {
      // DELEGATED EOA MODE: Use viem account abstraction with EIP-7702
      log(
        'estimateBatches(): Using delegatedEoa mode for batch estimation',
        undefined,
        this.debugMode
      );

      // Process all batches in parallel (each batch is independent)
      await Promise.all(
        batchesToEstimate.map(async (batchName: string) => {
          // ====================================================================
          // BATCH VALIDATION AND SETUP
          // ====================================================================

          // Check if batch exists and has transactions
          if (
            !this.batches[batchName] ||
            this.batches[batchName].length === 0
          ) {
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

          // Structure to hold per-chain estimation results
          const chainGroups: {
            [chainId: number]: {
              transactions: TransactionEstimateResult[];
              totalCost?: bigint;
              errorMessage?: string;
              isEstimatedSuccessfully: boolean;
            };
          } = {};

          // Track batch-level success and cost aggregation
          let batchAllGroupsSuccessful = true;
          let batchTotalCost: bigint = BigInt(0);

          // ====================================================================
          // MULTI-CHAIN GROUPING: Separate transactions by chainId
          // ====================================================================

          // Group transactions by chainId for separate estimation per chain
          const chainIdToTxs = new Map<number, typeof batchTransactions>();
          for (const tx of batchTransactions) {
            const txChainId =
              tx.chainId ?? this.#etherspotProvider.getChainId();
            const list = chainIdToTxs.get(txChainId) || [];
            list.push(tx);
            chainIdToTxs.set(txChainId, list);
          }

          // ====================================================================
          // CHAIN GROUP ESTIMATION: Process each chain group sequentially
          // ====================================================================
          for (const [groupChainId, groupTxs] of chainIdToTxs.entries()) {
            const groupEstimated: TransactionEstimateResult[] = [];
            try {
              log(
                `estimateBatches(): Getting delegatedEoa account and bundler client for batch ${batchName} on chain ${groupChainId}...`,
                undefined,
                this.debugMode
              );
              const delegatedEoaAccount =
                await this.#etherspotProvider.getDelegatedEoaAccount(
                  groupChainId
                );
              const bundlerClient =
                await this.#etherspotProvider.getBundlerClient(groupChainId);

              log(
                `estimateBatches(): Got account ${delegatedEoaAccount.address} and bundler client for batch ${batchName}`,
                undefined,
                this.debugMode
              );

              // ====================================================================
              // CALL PREPARATION: Convert transactions to viem call format
              // ====================================================================

              // Prepare calls for this chain group
              const calls = groupTxs.map((tx) => ({
                to: (tx.to || '') as `0x${string}`,
                value: BigInt(tx.value?.toString() || '0'),
                data: (tx.data || '0x') as `0x${string}`,
              }));

              log(
                `estimateBatches(): Prepared ${calls.length} calls for batch ${batchName} (chain ${groupChainId})`,
                calls,
                this.debugMode
              );

              // ====================================================================
              // EIP-7702 VALIDATION: Check if EOA is designated for smart wallet
              // ====================================================================

              // Ensure EOA is designated (EIP-7702) on this chain
              const isDesignated =
                await this.isDelegateSmartAccountToEoa(groupChainId);
              if (!isDesignated) {
                const errorMessage =
                  'EOA is not designated for EIP-7702. Please authorize first via delegateSmartAccountToEoa().';
                groupTxs.forEach((tx) => {
                  const resultObj = {
                    to: tx.to || '',
                    value: tx.value?.toString(),
                    data: tx.data,
                    chainId: tx.chainId || groupChainId,
                    errorMessage,
                    errorType: 'VALIDATION_ERROR' as const,
                    isEstimatedSuccessfully: false,
                  };
                  groupEstimated.push(resultObj);
                  estimatedTransactions.push(resultObj);
                });

                chainGroups[groupChainId] = {
                  transactions: groupEstimated,
                  errorMessage,
                  isEstimatedSuccessfully: false,
                };
                batchAllGroupsSuccessful = false;
                continue;
              }

              // ====================================================================
              // GAS ESTIMATION: Get gas limits from bundler
              // ====================================================================

              // Estimate gas for the user operation for this chain group
              log(
                `estimateBatches(): Estimating gas for batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              const gasEstimate = await bundlerClient.estimateUserOperationGas({
                account: delegatedEoaAccount,
                calls,
              });
              log(
                `estimateBatches(): Got gas estimate for batch ${batchName} (chain ${groupChainId})`,
                gasEstimate,
                this.debugMode
              );

              // ====================================================================
              // COST CALCULATION: Compute total cost using current gas prices
              // ====================================================================

              const publicClient =
                await this.#etherspotProvider.getPublicClient(groupChainId);
              const fees = await publicClient.estimateFeesPerGas();
              const maxFeePerGas = fees.maxFeePerGas;

              // Calculate total gas usage (call + verification + pre-verification)
              const totalGasBigInt =
                BigInt(gasEstimate.callGasLimit || 0) +
                BigInt(gasEstimate.verificationGasLimit || 0) +
                BigInt(gasEstimate.preVerificationGas || 0);
              const totalCost = totalGasBigInt * maxFeePerGas;

              // Get current nonce for the account
              const nonce = await publicClient.getTransactionCount({
                address: delegatedEoaAccount.address,
                blockTag: 'pending',
              });

              // ====================================================================
              // USER OPERATION CONSTRUCTION: Build UserOp for account abstraction
              // ====================================================================

              const userOp = {
                sender: delegatedEoaAccount.address,
                nonce: BigInt(nonce),
                callData: '0x' as `0x${string}`,
                callGasLimit: gasEstimate.callGasLimit ?? BigInt(0),
                verificationGasLimit:
                  gasEstimate.verificationGasLimit ?? BigInt(0),
                preVerificationGas: gasEstimate.preVerificationGas ?? BigInt(0),
                maxFeePerGas,
                maxPriorityFeePerGas: maxFeePerGas,
                paymasterData: '0x' as `0x${string}`,
                signature: '0x' as `0x${string}`,
              };

              // ====================================================================
              // SUCCESS RESULT BUILDING: Create TransactionEstimateResult for each tx
              // ====================================================================

              // Create success result for each transaction in this chain group
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  cost: totalCost,
                  userOp,
                  isEstimatedSuccessfully: true,
                };
                groupEstimated.push(resultObj);
                estimatedTransactions.push(resultObj);
                log(
                  `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' estimated successfully.`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group results with aggregated cost
              chainGroups[groupChainId] = {
                transactions: groupEstimated,
                totalCost,
                isEstimatedSuccessfully: true,
              };

              // Accumulate cost for batch-level total
              batchTotalCost += totalCost;

              log(
                `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}) estimated successfully`,
                {
                  transactionCount: groupTxs.length,
                  totalCost: totalCost.toString(),
                  chainId: groupChainId,
                },
                this.debugMode
              );
            } catch (error) {
              // ====================================================================
              // ERROR HANDLING: Handle estimation failures gracefully
              // ====================================================================

              const errorMessage = parseEtherspotErrorMessage(
                error,
                'Failed to estimate batch chain group in delegatedEoa mode!'
              );

              // Create error results for each transaction in this chain group
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  errorMessage,
                  errorType: 'ESTIMATION_ERROR' as const,
                  isEstimatedSuccessfully: false,
                };
                groupEstimated.push(resultObj);
                estimatedTransactions.push(resultObj);
                log(
                  `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' failed to estimate: ${errorMessage}`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group error results
              chainGroups[groupChainId] = {
                transactions: groupEstimated,
                errorMessage,
                isEstimatedSuccessfully: false,
              };

              // Mark batch as failed
              batchAllGroupsSuccessful = false;

              log(
                `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}) estimation failed`,
                {
                  error: errorMessage,
                  chainId: groupChainId,
                },
                this.debugMode
              );
            }
          }

          // ====================================================================
          // BATCH RESULT AGGREGATION: Build final batch result
          // ====================================================================

          // Finalize batch result aggregating chain groups
          const batchErrorMessage = batchAllGroupsSuccessful
            ? undefined
            : 'One or more chain groups failed to estimate';
          if (!batchAllGroupsSuccessful) {
            result.isEstimatedSuccessfully = false;
          }
          result.batches[batchName] = {
            transactions: estimatedTransactions,
            chainGroups,
            totalCost: batchAllGroupsSuccessful ? batchTotalCost : undefined,
            errorMessage: batchErrorMessage,
            isEstimatedSuccessfully: batchAllGroupsSuccessful,
          };
        })
      );

      // ========================================================================
      // STEP 5: FINAL RESULT PROCESSING (DELEGATED EOA MODE)
      // ========================================================================

      // Set error state based on results
      this.containsEstimatingError = !result.isEstimatedSuccessfully;
      this.isEstimating = false;

      return result;
    } else {
      // ========================================================================
      // MODULAR MODE: Use Etherspot SDK for estimation
      // ========================================================================

      log(
        'estimateBatches(): Using modular mode for batch estimation',
        undefined,
        this.debugMode
      );

      // Process all batches in parallel (each batch is independent)
      await Promise.all(
        batchesToEstimate.map(async (batchName: string) => {
          // ====================================================================
          // BATCH VALIDATION AND SETUP (MODULAR MODE)
          // ====================================================================

          // Check if batch exists and has transactions
          if (
            !this.batches[batchName] ||
            this.batches[batchName].length === 0
          ) {
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

          // Structure to hold per-chain estimation results
          const chainGroups: {
            [chainId: number]: {
              transactions: TransactionEstimateResult[];
              totalCost?: bigint;
              errorMessage?: string;
              isEstimatedSuccessfully: boolean;
            };
          } = {};

          // Track batch-level success and cost aggregation
          let batchAllGroupsSuccessful = true;
          let batchTotalCost: bigint = BigInt(0);

          // ====================================================================
          // MULTI-CHAIN GROUPING: Separate transactions by chainId (MODULAR)
          // ====================================================================

          // Group transactions by chainId for separate estimation per chain
          const chainIdToTxs = new Map<number, typeof batchTransactions>();
          for (const tx of batchTransactions) {
            const txChainId =
              tx.chainId ?? this.#etherspotProvider.getChainId();
            const list = chainIdToTxs.get(txChainId) || [];
            list.push(tx);
            chainIdToTxs.set(txChainId, list);
          }

          // ====================================================================
          // CHAIN GROUP ESTIMATION: Process each chain group sequentially (MODULAR)
          // ====================================================================

          for (const [groupChainId, groupTxs] of chainIdToTxs.entries()) {
            const groupEstimated: TransactionEstimateResult[] = [];
            try {
              // ====================================================================
              // SDK INITIALIZATION: Get fresh SDK instance for this chain
              // ====================================================================

              log(
                `estimateBatches(): Getting SDK for batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              const etherspotModularSdk = await this.#etherspotProvider.getSdk(
                groupChainId,
                true // force new instance
              );
              log(
                `estimateBatches(): Got SDK for batch ${batchName} (chain ${groupChainId}):`,
                etherspotModularSdk,
                this.debugMode
              );

              // ====================================================================
              // BATCH PREPARATION: Clear existing operations and add new ones
              // ====================================================================

              // Clear any existing operations
              log(
                `estimateBatches(): Clearing user ops from batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              await etherspotModularSdk.clearUserOpsFromBatch();
              log(
                `estimateBatches(): Cleared user ops from batch ${batchName} (chain ${groupChainId}).`,
                undefined,
                this.debugMode
              );

              // Add all transactions in the batch to the SDK
              log(
                `estimateBatches(): Adding ${groupTxs.length} transactions to batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              await Promise.all(
                groupTxs.map(async (tx) => {
                  log(
                    `estimateBatches(): Adding transaction ${tx.transactionName} to batch ${batchName} (chain ${groupChainId})...`,
                    undefined,
                    this.debugMode
                  );
                  await etherspotModularSdk.addUserOpsToBatch({
                    to: tx.to || '',
                    value: tx.value?.toString(),
                    data: tx.data,
                  });
                  log(
                    `estimateBatches(): Added transaction ${tx.transactionName} to batch ${batchName} (chain ${groupChainId}).`,
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

              // ====================================================================
              // SDK ESTIMATION: Use Etherspot SDK to estimate the batch
              // ====================================================================

              // Estimate the entire batch
              log(
                `estimateBatches(): Estimating batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              const userOp = await etherspotModularSdk.estimate({
                paymasterDetails,
              });
              log(
                `estimateBatches(): Got userOp for batch ${batchName} (chain ${groupChainId}):`,
                userOp,
                this.debugMode
              );

              // ====================================================================
              // COST CALCULATION: Compute total cost using SDK gas estimation
              // ====================================================================

              // Calculate total gas cost for the batch
              log(
                `estimateBatches(): Calculating total gas for batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              const totalGas =
                await etherspotModularSdk.totalGasEstimated(userOp);
              log(
                `estimateBatches(): Got totalGas for batch ${batchName} (chain ${groupChainId}):`,
                totalGas,
                this.debugMode
              );
              const totalGasBigInt = BigInt(totalGas.toString());
              const maxFeePerGasBigInt = BigInt(userOp.maxFeePerGas.toString());
              const totalCost = totalGasBigInt * maxFeePerGasBigInt;
              log(
                `estimateBatches(): Calculated total cost for batch ${batchName} (chain ${groupChainId}):`,
                totalCost,
                this.debugMode
              );

              // ====================================================================
              // SUCCESS RESULT BUILDING: Create TransactionEstimateResult for each tx (MODULAR)
              // ====================================================================

              // Create estimates for each transaction in the group
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  cost: totalCost,
                  userOp,
                  isEstimatedSuccessfully: true,
                };
                groupEstimated.push(resultObj);
                estimatedTransactions.push(resultObj);
                log(
                  `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' estimated successfully.`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group results with aggregated cost
              chainGroups[groupChainId] = {
                transactions: groupEstimated,
                totalCost,
                isEstimatedSuccessfully: true,
              };

              // Accumulate cost for batch-level total
              batchTotalCost += totalCost;

              log(
                `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}) estimated successfully`,
                {
                  transactionCount: groupTxs.length,
                  totalCost: totalCost.toString(),
                  chainId: groupChainId,
                },
                this.debugMode
              );
            } catch (error) {
              // ====================================================================
              // ERROR HANDLING: Handle estimation failures gracefully (MODULAR)
              // ====================================================================

              const errorMessage = parseEtherspotErrorMessage(
                error,
                'Failed to estimate batches!'
              );

              // Create error estimates for each transaction in the batch
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  errorMessage,
                  errorType: 'ESTIMATION_ERROR' as const,
                  isEstimatedSuccessfully: false,
                };
                groupEstimated.push(resultObj);
                estimatedTransactions.push(resultObj);
                log(
                  `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' failed to estimate: ${errorMessage}`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group error results
              chainGroups[groupChainId] = {
                transactions: groupEstimated,
                errorMessage,
                isEstimatedSuccessfully: false,
              };

              // Mark batch as failed
              batchAllGroupsSuccessful = false;

              log(
                `estimateBatches(): Batch '${batchName}' (chain ${groupChainId}) estimation failed`,
                {
                  error: errorMessage,
                  chainId: groupChainId,
                },
                this.debugMode
              );
            }
          }

          // ====================================================================
          // BATCH RESULT AGGREGATION: Build final batch result (MODULAR)
          // ====================================================================

          // Finalize batch result aggregating chain groups
          const batchErrorMessage = batchAllGroupsSuccessful
            ? undefined
            : 'One or more chain groups failed to estimate';
          if (!batchAllGroupsSuccessful) {
            result.isEstimatedSuccessfully = false;
          }
          result.batches[batchName] = {
            transactions: estimatedTransactions,
            chainGroups,
            totalCost: batchAllGroupsSuccessful ? batchTotalCost : undefined,
            errorMessage: batchErrorMessage,
            isEstimatedSuccessfully: batchAllGroupsSuccessful,
          };
        })
      );

      // ========================================================================
      // STEP 5: FINAL RESULT PROCESSING (MODULAR MODE)
      // ========================================================================

      // Set error state based on results (like original)
      this.containsEstimatingError = !result.isEstimatedSuccessfully;
      this.isEstimating = false;

      return result;
    }
  }

  /**
   * Estimates and sends all batches of transactions.
   *
   * Provides comprehensive batch sending with support for both modular and delegatedEoa wallet modes. Groups transactions by chainId for efficient multi-chain processing, estimates gas and costs, and sends user operations with proper error handling.
   *
   * @param params - (Optional) Send parameters:
   *   - `paymasterDetails`: Paymaster API details for sponsored transactions (modular mode only).
   *
   * @returns A promise that resolves to a `BatchSendResult` containing:
   *   - A mapping of batch names to their send results with chain group breakdown
   *   - Each batch result includes: transactions, chainGroups, totalCost, errorMessage, isEstimatedSuccessfully, isSentSuccessfully
   *   - Overall `isEstimatedSuccessfully` and `isSentSuccessfully` flags indicating success status
   *
   * @throws {Error} If provider is unavailable (modular mode) or another batch sending is in progress.
   *
   * @remarks
   * - **Wallet Mode Support:**
   *   - **Modular Mode**: Uses Etherspot SDK for estimation and sending with full paymaster support
   *     - ⚠️ **Multi-Chain Warning**: Batches with multiple chainIds require multiple user signatures (one per chain), creating poor UX
   *   - **DelegatedEoa Mode**: Uses viem bundler client for EIP-7702 account abstraction with EOA validation
   * - **Multi-Chain Processing:**
   *   - Automatically groups transactions by chainId for separate sending per chain
   *   - Each chain group is processed independently with its own SDK/client instance
   *   - Supports mixed-chain batches with proper cost aggregation
   * - **EIP-7702 Validation (DelegatedEoa Mode):**
   *   - Validates EOA designation before sending using `isDelegateSmartAccountToEoa()` check
   *   - Requires prior authorization via `delegateSmartAccountToEoa()` method
   * - **Gas Estimation & Cost Calculation:**
   *   - Estimates gas using bundler client (delegatedEoa) or SDK (modular)
   *   - Calculates total costs using current gas prices from `estimateFeesPerGas()`
   *   - Includes call gas, verification gas, and pre-verification gas in total cost
   * - **Error Handling:**
   *   - Returns error results instead of throwing for most validation failures
   *   - Failed chain groups don't prevent other chain groups from being processed
   *   - Only throws for critical configuration errors (missing provider, concurrent operations)
   * - **State Management:**
   *   - Removes successfully sent batches and their transactions from internal state
   *   - Prevents concurrent sending to avoid race conditions
   * - **Usage:**
   *   - Call `estimateBatches()` first for cost verification
   *   - For single transaction sending, use `send()` instead
   */
  async sendBatches({
    onlyBatchNames,
    paymasterDetails,
  }: SendBatchesParams = {}): Promise<BatchSendResult> {
    // ========================================================================
    // STEP 1: INPUT VALIDATION AND SETUP
    // ========================================================================

    // Prevent concurrent sending to avoid race conditions
    if (this.isSending) {
      this.throwError(
        'Another batch sending is already in progress. Please wait for it to complete.'
      );
    }

    // Validate onlyBatchNames parameter if provided
    if (onlyBatchNames) {
      if (!Array.isArray(onlyBatchNames)) {
        this.throwError('onlyBatchNames must be an array of strings');
      }
      onlyBatchNames.forEach((name, index) => {
        if (typeof name !== 'string' || name.trim() === '') {
          this.throwError(
            `onlyBatchNames[${index}] must be a non-empty string`
          );
        }
      });
    }

    // Set sending state flags
    this.isSending = true;
    this.containsSendingError = false;

    const walletMode = this.#etherspotProvider.getWalletMode();
    log(`sendBatches(): Wallet mode: ${walletMode}`, undefined, this.debugMode);

    // Initialize result structure
    const result: BatchSendResult = {
      batches: {},
      isEstimatedSuccessfully: true,
      isSentSuccessfully: true,
    };

    // ========================================================================
    // STEP 2: DETERMINE BATCHES TO SEND
    // ========================================================================

    // Use provided batch names or send all existing batches
    const batchesToSend = onlyBatchNames || Object.keys(this.batches);

    if (batchesToSend.length === 0) {
      log('sendBatches(): No batches to send', this.debugMode);
      this.isSending = false;
      return result;
    }

    // ========================================================================
    // STEP 3: MODE-SPECIFIC VALIDATION
    // ========================================================================

    // Modular mode requires a Web3 provider for SDK operations
    if (walletMode === 'modular') {
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
    }

    // ========================================================================
    // STEP 4: SENDING EXECUTION (MODE-SPECIFIC)
    // ========================================================================

    if (walletMode === 'delegatedEoa') {
      // DELEGATED EOA MODE: Use viem account abstraction with EIP-7702
      log(
        'sendBatches(): Using delegatedEoa mode for batch sending',
        undefined,
        this.debugMode
      );

      // Process all batches in parallel (each batch is independent)
      await Promise.all(
        batchesToSend.map(async (batchName: string) => {
          // ====================================================================
          // BATCH VALIDATION AND SETUP
          // ====================================================================

          // Check if batch exists and has transactions
          if (
            !this.batches[batchName] ||
            this.batches[batchName].length === 0
          ) {
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

          // Structure to hold per-chain sending results
          const chainGroups: {
            [chainId: number]: {
              transactions: TransactionSendResult[];
              userOpHash?: string;
              totalCost?: bigint;
              errorMessage?: string;
              isEstimatedSuccessfully: boolean;
              isSentSuccessfully: boolean;
            };
          } = {};

          // Track batch-level success and cost aggregation
          let batchAllGroupsSuccessful = true;
          let batchTotalCost: bigint = BigInt(0);

          // ====================================================================
          // MULTI-CHAIN GROUPING: Separate transactions by chainId
          // ====================================================================

          // Group transactions by chainId for separate sending per chain
          const chainIdToTxs = new Map<number, typeof batchTransactions>();
          for (const tx of batchTransactions) {
            const txChainId =
              tx.chainId ?? this.#etherspotProvider.getChainId();
            const list = chainIdToTxs.get(txChainId) || [];
            list.push(tx);
            chainIdToTxs.set(txChainId, list);
          }

          // ====================================================================
          // CHAIN GROUP SENDING: Process each chain group sequentially
          // ====================================================================

          for (const [groupChainId, groupTxs] of chainIdToTxs.entries()) {
            log(
              `sendBatches(): Processing chain group ${groupChainId} with ${groupTxs.length} transactions`,
              {
                groupChainId,
                transactionCount: groupTxs.length,
                transactionNames: groupTxs.map((tx) => tx.transactionName),
              },
              this.debugMode
            );
            const groupSent: TransactionSendResult[] = [];
            try {
              log(
                `sendBatches(): Getting delegatedEoa account and bundler client for batch ${batchName} on chain ${groupChainId}...`,
                undefined,
                this.debugMode
              );
              const delegatedEoaAccount =
                await this.#etherspotProvider.getDelegatedEoaAccount(
                  groupChainId
                );
              const bundlerClient =
                await this.#etherspotProvider.getBundlerClient(groupChainId);

              log(
                `sendBatches(): Got account ${delegatedEoaAccount.address} and bundler client for batch ${batchName}`,
                undefined,
                this.debugMode
              );

              // ====================================================================
              // CALL PREPARATION: Convert transactions to viem call format
              // ====================================================================

              // Prepare calls for this chain group
              const calls = groupTxs.map((tx) => ({
                to: (tx.to || '') as `0x${string}`,
                value: BigInt(tx.value?.toString() || '0'),
                data: (tx.data || '0x') as `0x${string}`,
              }));

              log(
                `sendBatches(): Prepared ${calls.length} calls for batch ${batchName} (chain ${groupChainId})`,
                calls,
                this.debugMode
              );

              // ====================================================================
              // EIP-7702 VALIDATION: Check if EOA is designated for smart wallet
              // ====================================================================

              // Ensure EOA is designated (EIP-7702) on this chain
              const isDesignated =
                await this.isDelegateSmartAccountToEoa(groupChainId);
              if (!isDesignated) {
                const errorMessage =
                  'EOA is not designated for EIP-7702. Please authorize first via delegateSmartAccountToEoa().';
                groupTxs.forEach((tx) => {
                  const resultObj = {
                    to: tx.to || '',
                    value: tx.value?.toString(),
                    data: tx.data,
                    chainId: tx.chainId || groupChainId,
                    errorMessage,
                    errorType: 'VALIDATION_ERROR' as const,
                    isEstimatedSuccessfully: false,
                    isSentSuccessfully: false,
                  };
                  groupSent.push(resultObj);
                  sentTransactions.push(resultObj);
                });

                chainGroups[groupChainId] = {
                  transactions: groupSent,
                  errorMessage,
                  isEstimatedSuccessfully: false,
                  isSentSuccessfully: false,
                };
                batchAllGroupsSuccessful = false;
                continue;
              }

              // ====================================================================
              // GAS ESTIMATION: Get gas limits from bundler
              // ====================================================================

              // Estimate gas for the user operation for this chain group
              log(
                `sendBatches(): Estimating gas for batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              const gasEstimate = await bundlerClient.estimateUserOperationGas({
                account: delegatedEoaAccount,
                calls,
              });
              log(
                `sendBatches(): Got gas estimate for batch ${batchName} (chain ${groupChainId})`,
                gasEstimate,
                this.debugMode
              );

              // ====================================================================
              // COST CALCULATION: Compute total cost using current gas prices
              // ====================================================================

              const publicClient =
                await this.#etherspotProvider.getPublicClient(groupChainId);
              const fees = await publicClient.estimateFeesPerGas();
              const maxFeePerGas = fees.maxFeePerGas;

              // Calculate total gas usage (call + verification + pre-verification)
              const totalGasBigInt =
                BigInt(gasEstimate.callGasLimit || 0) +
                BigInt(gasEstimate.verificationGasLimit || 0) +
                BigInt(gasEstimate.preVerificationGas || 0);
              const totalCost = totalGasBigInt * maxFeePerGas;

              // Get current nonce for the account
              const nonce = await publicClient.getTransactionCount({
                address: delegatedEoaAccount.address,
                blockTag: 'pending',
              });

              // ====================================================================
              // USER OPERATION SENDING: Send the user operation with calls array
              // ====================================================================

              log(
                `sendBatches(): Sending userOp for batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              let userOpHash: string;
              try {
                userOpHash = await bundlerClient.sendUserOperation({
                  account: delegatedEoaAccount,
                  calls: calls,
                });
                log(
                  `sendBatches(): Got userOpHash for batch ${batchName} (chain ${groupChainId}):`,
                  userOpHash,
                  this.debugMode
                );
              } catch (sendError) {
                const sendErrorMessage = parseEtherspotErrorMessage(
                  sendError,
                  'Failed to send user operation!'
                );
                throw new Error(sendErrorMessage);
              }

              // ====================================================================
              // SUCCESS RESULT BUILDING: Create TransactionSendResult for each tx
              // ====================================================================

              // Create userOp object for result (constructed from gas estimate and current state)
              const userOp = {
                sender: delegatedEoaAccount.address,
                nonce: BigInt(nonce),
                callData: '0x' as `0x${string}`,
                callGasLimit: gasEstimate.callGasLimit ?? BigInt(0),
                verificationGasLimit:
                  gasEstimate.verificationGasLimit ?? BigInt(0),
                preVerificationGas: gasEstimate.preVerificationGas ?? BigInt(0),
                maxFeePerGas,
                maxPriorityFeePerGas: maxFeePerGas,
                paymasterData: '0x' as `0x${string}`,
                signature: '0x' as `0x${string}`,
              };

              // Create success result for each transaction in this chain group
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  cost: totalCost,
                  userOp,
                  userOpHash,
                  isEstimatedSuccessfully: true,
                  isSentSuccessfully: true,
                };
                groupSent.push(resultObj);
                sentTransactions.push(resultObj);
                log(
                  `sendBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' sent successfully.`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group results with aggregated cost
              chainGroups[groupChainId] = {
                transactions: groupSent,
                userOpHash,
                totalCost,
                isEstimatedSuccessfully: true,
                isSentSuccessfully: true,
              };

              // Accumulate cost for batch-level total
              batchTotalCost += totalCost;

              log(
                `sendBatches(): Batch '${batchName}' (chain ${groupChainId}) sent successfully`,
                {
                  transactionCount: groupTxs.length,
                  totalCost: totalCost.toString(),
                  userOpHash,
                  chainId: groupChainId,
                },
                this.debugMode
              );
            } catch (error) {
              // ====================================================================
              // ERROR HANDLING: Handle sending failures gracefully
              // ====================================================================

              const errorMessage = parseEtherspotErrorMessage(
                error,
                'Failed to send batch chain group in delegatedEoa mode!'
              );

              // Create error results for each transaction in this chain group
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  errorMessage,
                  errorType: 'SEND_ERROR' as const,
                  isEstimatedSuccessfully: false,
                  isSentSuccessfully: false,
                };
                groupSent.push(resultObj);
                sentTransactions.push(resultObj);
                log(
                  `sendBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' failed to send: ${errorMessage}`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group error results
              chainGroups[groupChainId] = {
                transactions: groupSent,
                errorMessage,
                isEstimatedSuccessfully: false,
                isSentSuccessfully: false,
              };

              // Mark batch as failed
              batchAllGroupsSuccessful = false;

              log(
                `sendBatches(): Batch '${batchName}' (chain ${groupChainId}) send failed`,
                {
                  error: errorMessage,
                  transactionCount: groupTxs.length,
                  chainId: groupChainId,
                },
                this.debugMode
              );
            }
          }

          // ====================================================================
          // BATCH RESULT AGGREGATION: Build final batch result
          // ====================================================================

          // Finalize batch result aggregating chain groups
          const batchErrorMessage = batchAllGroupsSuccessful
            ? undefined
            : 'One or more chain groups failed to send';
          if (!batchAllGroupsSuccessful) {
            result.isEstimatedSuccessfully = false;
            result.isSentSuccessfully = false;
          }

          log(
            `sendBatches(): Building final result for batch ${batchName}`,
            {
              batchName,
              chainGroups,
              sentTransactions: sentTransactions.length,
              batchAllGroupsSuccessful,
              batchTotalCost: batchTotalCost.toString(),
            },
            this.debugMode
          );

          result.batches[batchName] = {
            transactions: sentTransactions,
            chainGroups,
            totalCost: batchAllGroupsSuccessful ? batchTotalCost : undefined,
            errorMessage: batchErrorMessage,
            isEstimatedSuccessfully: batchAllGroupsSuccessful,
            isSentSuccessfully: batchAllGroupsSuccessful,
          };

          // ====================================================================
          // STATE CLEANUP: Remove successful chain groups from batch
          // ====================================================================

          // Remove transactions from successful chain groups
          const remainingTransactions: typeof batchTransactions = [];
          let hasSuccessfulChainGroups = false;
          let hasFailedChainGroups = false;

          for (const [groupChainId, groupResult] of Object.entries(
            chainGroups
          )) {
            if (groupResult.isSentSuccessfully) {
              hasSuccessfulChainGroups = true;
              // Remove transactions from this successful chain group
              const groupTxs = chainIdToTxs.get(parseInt(groupChainId)) || [];
              groupTxs.forEach((tx) => {
                if (tx.transactionName) {
                  delete this.namedTransactions[tx.transactionName];
                }
              });
            } else {
              hasFailedChainGroups = true;
              // Keep transactions from failed chain groups
              const groupTxs = chainIdToTxs.get(parseInt(groupChainId)) || [];
              remainingTransactions.push(...groupTxs);
            }
          }

          // Update batch with remaining transactions
          if (remainingTransactions.length > 0) {
            this.batches[batchName] = remainingTransactions;
            log(
              `sendBatches(): Batch '${batchName}' updated with ${remainingTransactions.length} remaining transactions from failed chain groups`,
              {
                batchName,
                remainingTransactions: remainingTransactions.length,
                successfulChainGroups: hasSuccessfulChainGroups,
                failedChainGroups: hasFailedChainGroups,
              },
              this.debugMode
            );
          } else {
            // All chain groups succeeded, remove the entire batch
            delete this.batches[batchName];
            log(
              `sendBatches(): Batch '${batchName}' completely removed - all chain groups succeeded`,
              {
                batchName,
                successfulChainGroups: hasSuccessfulChainGroups,
              },
              this.debugMode
            );
          }
        })
      );

      // Set error state based on results
      this.containsSendingError = !result.isSentSuccessfully;
      this.isSending = false;

      return result;
    } else {
      // ========================================================================
      // MODULAR MODE: Use Etherspot SDK for sending
      // ========================================================================

      log(
        'sendBatches(): Using modular mode for batch sending',
        undefined,
        this.debugMode
      );

      // Process all batches in parallel (each batch is independent)
      await Promise.all(
        batchesToSend.map(async (batchName: string) => {
          // ====================================================================
          // BATCH VALIDATION AND SETUP (MODULAR MODE)
          // ====================================================================

          // Check if batch exists and has transactions
          if (
            !this.batches[batchName] ||
            this.batches[batchName].length === 0
          ) {
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

          // Structure to hold per-chain sending results
          const chainGroups: {
            [chainId: number]: {
              transactions: TransactionSendResult[];
              userOpHash?: string;
              totalCost?: bigint;
              errorMessage?: string;
              isEstimatedSuccessfully: boolean;
              isSentSuccessfully: boolean;
            };
          } = {};

          // Track batch-level success and cost aggregation
          let batchAllGroupsSuccessful = true;
          let batchTotalCost: bigint = BigInt(0);

          // ====================================================================
          // MULTI-CHAIN GROUPING: Separate transactions by chainId (MODULAR)
          // ====================================================================

          // Group transactions by chainId for separate sending per chain
          const chainIdToTxs = new Map<number, typeof batchTransactions>();
          for (const tx of batchTransactions) {
            const txChainId =
              tx.chainId ?? this.#etherspotProvider.getChainId();
            const list = chainIdToTxs.get(txChainId) || [];
            list.push(tx);
            chainIdToTxs.set(txChainId, list);
          }

          // ====================================================================
          // MULTI-CHAIN WARNING: Alert developer about multiple signatures
          // ====================================================================

          // Warn if batch contains transactions across multiple chains in modular mode
          if (chainIdToTxs.size > 1) {
            const chainIds = Array.from(chainIdToTxs.keys());
            console.warn(
              `⚠️ EtherspotTransactionKit Warning: Batch '${batchName}' contains transactions across ${chainIdToTxs.size} different chains (${chainIds.join(', ')}). In modular mode, this will require ${chainIdToTxs.size} separate user signatures, which might create a poor user experience. Consider splitting into separate batches or using delegatedEoa mode for multi-chain transactions.`
            );
          }

          // ====================================================================
          // CHAIN GROUP SENDING: Process each chain group sequentially (MODULAR)
          // ====================================================================

          for (const [groupChainId, groupTxs] of chainIdToTxs.entries()) {
            log(
              `sendBatches(): Processing chain group ${groupChainId} with ${groupTxs.length} transactions`,
              {
                groupChainId,
                transactionCount: groupTxs.length,
                transactionNames: groupTxs.map((tx) => tx.transactionName),
              },
              this.debugMode
            );
            const groupSent: TransactionSendResult[] = [];
            try {
              // ====================================================================
              // SDK INITIALIZATION: Get fresh SDK instance for this chain
              // ====================================================================

              // Get fresh SDK instance to avoid state pollution (same as original)
              log(
                `sendBatches(): Getting SDK for batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              const etherspotModularSdk = await this.#etherspotProvider.getSdk(
                groupChainId,
                true // force new instance
              );
              log(
                `sendBatches(): Got SDK for batch ${batchName} (chain ${groupChainId}):`,
                etherspotModularSdk,
                this.debugMode
              );

              // ====================================================================
              // BATCH PREPARATION: Clear existing operations and add new ones
              // ====================================================================

              // Clear any existing operations
              log(
                `sendBatches(): Clearing user ops from batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              await etherspotModularSdk.clearUserOpsFromBatch();
              log(
                `sendBatches(): Cleared user ops from batch ${batchName} (chain ${groupChainId}).`,
                undefined,
                this.debugMode
              );

              // Add all transactions in the batch to the SDK
              log(
                `sendBatches(): Adding ${groupTxs.length} transactions to batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              await Promise.all(
                groupTxs.map(async (tx) => {
                  log(
                    `sendBatches(): Adding transaction ${tx.transactionName} to batch ${batchName} (chain ${groupChainId})...`,
                    undefined,
                    this.debugMode
                  );
                  await etherspotModularSdk.addUserOpsToBatch({
                    to: tx.to || '',
                    value: tx.value?.toString(),
                    data: tx.data,
                  });
                  log(
                    `sendBatches(): Added transaction ${tx.transactionName} to batch ${batchName} (chain ${groupChainId}).`,
                    undefined,
                    this.debugMode
                  );
                })
              );
              log(
                `sendBatches(): Added all transactions to batch ${batchName} (chain ${groupChainId}).`,
                undefined,
                this.debugMode
              );

              // ====================================================================
              // SDK ESTIMATION: Use Etherspot SDK to estimate the batch
              // ====================================================================

              // Estimate first (like the single send() method)
              let estimatedUserOp;
              try {
                log(
                  `sendBatches(): Estimating batch ${batchName} (chain ${groupChainId}) for sending...`,
                  undefined,
                  this.debugMode
                );
                estimatedUserOp = await etherspotModularSdk.estimate({
                  paymasterDetails,
                });
                log(
                  `sendBatches(): Got estimated userOp for batch ${batchName} (chain ${groupChainId}):`,
                  estimatedUserOp,
                  this.debugMode
                );
              } catch (estimationError) {
                const estimationErrorMessage = parseEtherspotErrorMessage(
                  estimationError,
                  'Failed to estimate before sending!'
                );

                // Create error entries for each transaction in the batch
                groupTxs.forEach((tx) => {
                  const resultObj = {
                    to: tx.to || '',
                    value: tx.value?.toString(),
                    data: tx.data,
                    chainId: tx.chainId || groupChainId,
                    errorMessage: estimationErrorMessage,
                    errorType: 'ESTIMATION_ERROR' as const,
                    isEstimatedSuccessfully: false,
                    isSentSuccessfully: false,
                  };
                  groupSent.push(resultObj);
                  sentTransactions.push(resultObj);
                  log(
                    `sendBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' failed to estimate: ${estimationErrorMessage}`,
                    { transaction: tx, result: resultObj },
                    this.debugMode
                  );
                });

                chainGroups[groupChainId] = {
                  transactions: groupSent,
                  errorMessage: estimationErrorMessage,
                  isEstimatedSuccessfully: false,
                  isSentSuccessfully: false,
                };
                batchAllGroupsSuccessful = false;
                continue;
              }

              // ====================================================================
              // COST CALCULATION: Compute total cost using SDK gas estimation
              // ====================================================================

              // Apply user overrides
              const finalUserOp = { ...estimatedUserOp };

              // Calculate total gas cost (using the same approach as original)
              log(
                `sendBatches(): Calculating total gas for batch ${batchName} (chain ${groupChainId})...`,
                undefined,
                this.debugMode
              );
              const totalGas =
                await etherspotModularSdk.totalGasEstimated(finalUserOp);
              log(
                `sendBatches(): Got totalGas for batch ${batchName} (chain ${groupChainId}):`,
                totalGas,
                this.debugMode
              );
              const totalGasBigInt = BigInt(totalGas.toString());
              const maxFeePerGasBigInt = BigInt(
                finalUserOp.maxFeePerGas.toString()
              );
              const totalCost = totalGasBigInt * maxFeePerGasBigInt;
              log(
                `sendBatches(): Calculated total cost for batch ${batchName} (chain ${groupChainId}):`,
                totalCost,
                this.debugMode
              );

              log(
                `sendBatches(): Batch '${batchName}' (chain ${groupChainId}) estimated, now sending...`,
                {
                  transactionCount: groupTxs.length,
                  totalCost: totalCost.toString(),
                  chainId: groupChainId,
                },
                this.debugMode
              );

              // ====================================================================
              // SDK SENDING: Send the batch using Etherspot SDK
              // ====================================================================

              // Send the batch
              let userOpHash: string;
              try {
                log(
                  `sendBatches(): Sending batch ${batchName} (chain ${groupChainId})...`,
                  undefined,
                  this.debugMode
                );
                userOpHash = await etherspotModularSdk.send(finalUserOp);
                log(
                  `sendBatches(): Got userOpHash for batch ${batchName} (chain ${groupChainId}):`,
                  userOpHash,
                  this.debugMode
                );
              } catch (sendError) {
                const sendErrorMessage = parseEtherspotErrorMessage(
                  sendError,
                  'Failed to send!'
                );

                // Create error entries for each transaction in the batch
                groupTxs.forEach((tx) => {
                  const resultObj = {
                    to: tx.to || '',
                    value: tx.value?.toString(),
                    data: tx.data,
                    chainId: tx.chainId || groupChainId,
                    cost: totalCost,
                    userOp: finalUserOp,
                    errorMessage: sendErrorMessage,
                    errorType: 'SEND_ERROR' as const,
                    isEstimatedSuccessfully: true,
                    isSentSuccessfully: false,
                  };
                  groupSent.push(resultObj);
                  sentTransactions.push(resultObj);
                  log(
                    `sendBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' failed to send: ${sendErrorMessage}`,
                    { transaction: tx, result: resultObj },
                    this.debugMode
                  );
                });

                chainGroups[groupChainId] = {
                  transactions: groupSent,
                  errorMessage: sendErrorMessage,
                  isEstimatedSuccessfully: true,
                  isSentSuccessfully: false,
                };
                batchAllGroupsSuccessful = false;
                continue;
              }

              // ====================================================================
              // SUCCESS RESULT BUILDING: Create TransactionSendResult for each tx (MODULAR)
              // ====================================================================

              // Create success entries for each transaction in the batch
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  cost: totalCost, // Use full cost for each transaction (like original) or divide by length
                  userOp: finalUserOp,
                  userOpHash,
                  isEstimatedSuccessfully: true,
                  isSentSuccessfully: true,
                };
                groupSent.push(resultObj);
                sentTransactions.push(resultObj);
                log(
                  `sendBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' sent successfully.`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group results with aggregated cost
              chainGroups[groupChainId] = {
                transactions: groupSent,
                userOpHash,
                totalCost,
                isEstimatedSuccessfully: true,
                isSentSuccessfully: true,
              };

              // Accumulate cost for batch-level total
              batchTotalCost += totalCost;

              log(
                `sendBatches(): Batch '${batchName}' (chain ${groupChainId}) sent successfully`,
                {
                  transactionCount: groupTxs.length,
                  userOpHash,
                  chainId: groupChainId,
                },
                this.debugMode
              );
            } catch (error) {
              // ====================================================================
              // ERROR HANDLING: Handle sending failures gracefully (MODULAR)
              // ====================================================================

              const errorMessage = parseEtherspotErrorMessage(
                error,
                'Failed to send batch chain group in modular mode!'
              );

              // Create error entries for each transaction in the batch
              groupTxs.forEach((tx) => {
                const resultObj = {
                  to: tx.to || '',
                  value: tx.value?.toString(),
                  data: tx.data,
                  chainId: tx.chainId || groupChainId,
                  errorMessage,
                  errorType: 'SEND_ERROR' as const,
                  isEstimatedSuccessfully: false,
                  isSentSuccessfully: false,
                };
                groupSent.push(resultObj);
                sentTransactions.push(resultObj);
                log(
                  `sendBatches(): Batch '${batchName}' (chain ${groupChainId}): Transaction '${tx.transactionName}' failed to send: ${errorMessage}`,
                  { transaction: tx, result: resultObj },
                  this.debugMode
                );
              });

              // Store chain group error results
              chainGroups[groupChainId] = {
                transactions: groupSent,
                errorMessage,
                isEstimatedSuccessfully: false,
                isSentSuccessfully: false,
              };

              // Mark batch as failed
              batchAllGroupsSuccessful = false;

              log(
                `sendBatches(): Batch '${batchName}' (chain ${groupChainId}) send failed`,
                {
                  error: errorMessage,
                  chainId: groupChainId,
                },
                this.debugMode
              );
            }
          }

          // ====================================================================
          // BATCH RESULT AGGREGATION: Build final batch result (MODULAR)
          // ====================================================================

          // Finalize batch result aggregating chain groups
          const batchErrorMessage = batchAllGroupsSuccessful
            ? undefined
            : 'One or more chain groups failed to send';
          if (!batchAllGroupsSuccessful) {
            result.isEstimatedSuccessfully = false;
            result.isSentSuccessfully = false;
          }

          log(
            `sendBatches(): Building final result for batch ${batchName}`,
            {
              batchName,
              chainGroups,
              sentTransactions: sentTransactions.length,
              batchAllGroupsSuccessful,
              batchTotalCost: batchTotalCost.toString(),
            },
            this.debugMode
          );

          result.batches[batchName] = {
            transactions: sentTransactions,
            chainGroups,
            totalCost: batchAllGroupsSuccessful ? batchTotalCost : undefined,
            errorMessage: batchErrorMessage,
            isEstimatedSuccessfully: batchAllGroupsSuccessful,
            isSentSuccessfully: batchAllGroupsSuccessful,
          };

          // ====================================================================
          // STATE CLEANUP: Remove successful chain groups from batch (MODULAR)
          // ====================================================================

          // Remove transactions from successful chain groups
          const remainingTransactions: typeof batchTransactions = [];
          let hasSuccessfulChainGroups = false;
          let hasFailedChainGroups = false;

          for (const [groupChainId, groupResult] of Object.entries(
            chainGroups
          )) {
            if (groupResult.isSentSuccessfully) {
              hasSuccessfulChainGroups = true;
              // Remove transactions from this successful chain group
              const groupTxs = chainIdToTxs.get(parseInt(groupChainId)) || [];
              groupTxs.forEach((tx) => {
                if (tx.transactionName) {
                  delete this.namedTransactions[tx.transactionName];
                }
              });
            } else {
              hasFailedChainGroups = true;
              // Keep transactions from failed chain groups
              const groupTxs = chainIdToTxs.get(parseInt(groupChainId)) || [];
              remainingTransactions.push(...groupTxs);
            }
          }

          // Update batch with remaining transactions
          if (remainingTransactions.length > 0) {
            this.batches[batchName] = remainingTransactions;
            log(
              `sendBatches(): Batch '${batchName}' updated with ${remainingTransactions.length} remaining transactions from failed chain groups (MODULAR)`,
              {
                batchName,
                remainingTransactions: remainingTransactions.length,
                successfulChainGroups: hasSuccessfulChainGroups,
                failedChainGroups: hasFailedChainGroups,
              },
              this.debugMode
            );
          } else {
            // All chain groups succeeded, remove the entire batch
            delete this.batches[batchName];
            log(
              `sendBatches(): Batch '${batchName}' completely removed - all chain groups succeeded (MODULAR)`,
              {
                batchName,
                successfulChainGroups: hasSuccessfulChainGroups,
              },
              this.debugMode
            );
          }
        })
      );

      // ========================================================================
      // STEP 5: FINAL RESULT PROCESSING (MODULAR MODE)
      // ========================================================================

      // Set error state based on results (like original)
      this.containsSendingError = !result.isSentSuccessfully;
      this.isSending = false;

      return { ...result, ...this };
    }
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
    return this.#etherspotProvider.getProvider();
  }

  /**
   * Returns the EtherspotProvider instance for advanced use.
   * Security: Sensitive data (privateKey, bundlerApiKey) is protected by private fields.
   *
   * @returns The EtherspotProvider instance.
   */
  getEtherspotProvider(): EtherspotProvider {
    return this.#etherspotProvider;
  }

  /**
   * Returns the Etherspot Modular SDK instance for the specified chain.
   *
   * @param chainId - (Optional) The chain ID for which to get the SDK. Defaults to the provider's current chain.
   * @param forceNewInstance - (Optional) If true, forces creation of a new SDK instance.
   * @returns A promise that resolves to a ModularSdk instance.
   * @throws {Error} If wallet mode is 'delegatedEoa' (SDK only available in 'modular' mode).
   *
   * @remarks
   * - Only available in 'modular' wallet mode.
   * - For 'delegatedEoa' mode, use getDelegatedEoaAccount(), getBundlerClient(), or getPublicClient() instead.
   * - Useful for advanced operations or direct SDK access.
   * - May perform network requests or SDK initialization.
   */
  async getSdk(
    chainId?: number,
    forceNewInstance?: boolean
  ): Promise<ModularSdk> {
    log('getSdk(): Called with', { chainId, forceNewInstance }, this.debugMode);

    const walletMode = this.#etherspotProvider.getWalletMode();
    if (walletMode === 'delegatedEoa') {
      this.throwError(
        `getSdk() is only available in 'modular' wallet mode. ` +
          `Current mode: '${walletMode}'. ` +
          `For delegatedEoa mode, use getDelegatedEoaAccount(), getBundlerClient(), or getPublicClient() from the EtherspotProvider instead.`
      );
    }

    const sdk = await this.#etherspotProvider.getSdk(chainId, forceNewInstance);
    log('getSdk(): Returning SDK', sdk, this.debugMode);
    return sdk;
  }

  /**
   * Polls for the transaction hash using a user operation hash and chain ID.
   *
   * Supports both modular and delegatedEoa wallet modes. Uses appropriate client (Etherspot SDK or viem bundler client) to poll for user operation receipt and extract the transaction hash.
   *
   * @param userOpHash - The user operation hash to query.
   * @param txChainId - The chain ID to use for the SDK/client.
   * @param timeout - (Optional) Timeout in ms (default: 60000).
   * @param retryInterval - (Optional) Polling interval in ms (default: 2000).
   * @returns The transaction hash as a string, or null if not found in time.
   *
   * @remarks
   * - **Modular Mode**: Uses Etherspot SDK's `getUserOpReceipt()` method
   * - **DelegatedEoa Mode**: Uses viem bundler client's `getUserOperationReceipt()` method
   * - **Polling**: Continuously polls until receipt is found or timeout is reached
   * - **Error Handling**: Handles network errors and continues polling
   */
  public async getTransactionHash(
    userOpHash: string,
    txChainId: number,
    timeout: number = 60 * 1000,
    retryInterval: number = 2000
  ): Promise<string | null> {
    const walletMode = this.#etherspotProvider.getWalletMode();
    log(
      `getTransactionHash(): Wallet mode: ${walletMode}`,
      undefined,
      this.debugMode
    );

    let transactionHash: string | null = null;
    const timeoutTotal = Date.now() + timeout;

    if (walletMode === 'delegatedEoa') {
      // DelegatedEoa mode: Use viem bundler client
      log(
        'getTransactionHash(): Using delegatedEoa mode',
        undefined,
        this.debugMode
      );

      try {
        // Get bundler client for the specified chain
        const bundlerClient =
          await this.#etherspotProvider.getBundlerClient(txChainId);

        log(
          `getTransactionHash(): Got bundler client for chain ${txChainId}`,
          undefined,
          this.debugMode
        );

        // Poll for user operation receipt using bundler client
        while (!transactionHash && Date.now() < timeoutTotal) {
          await new Promise<void>((resolve) =>
            setTimeout(resolve, retryInterval)
          );

          try {
            log(
              `getTransactionHash(): Polling for userOp receipt: ${userOpHash}`,
              undefined,
              this.debugMode
            );

            const receipt = await bundlerClient.getUserOperationReceipt({
              hash: userOpHash as `0x${string}`,
            });

            if (receipt) {
              transactionHash = receipt.receipt.transactionHash;
              log(
                `getTransactionHash(): Got transaction hash: ${transactionHash}`,
                undefined,
                this.debugMode
              );
            }
          } catch (error) {
            // User operation might not be mined yet, continue polling
            log(
              `getTransactionHash(): UserOp not yet mined, continuing to poll...`,
              undefined,
              this.debugMode
            );
          }
        }

        if (!transactionHash) {
          console.warn(
            'Failed to get the transaction hash within time limit. Please try again'
          );
        }

        return transactionHash;
      } catch (error) {
        const errorMessage = parseEtherspotErrorMessage(
          error,
          'Failed to get transaction hash in delegatedEoa mode!'
        );
        log(
          `getTransactionHash(): Error in delegatedEoa mode: ${errorMessage}`,
          error,
          this.debugMode
        );
        console.error(
          'Error fetching transaction hash in delegatedEoa mode:',
          errorMessage
        );
        return null;
      }
    } else {
      // Modular mode: Use Etherspot SDK
      log(
        'getTransactionHash(): Using modular mode',
        undefined,
        this.debugMode
      );

      const etherspotModularSdk = await this.getSdk(txChainId);

      while (!transactionHash && Date.now() < timeoutTotal) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, retryInterval)
        );
        try {
          transactionHash =
            await etherspotModularSdk.getUserOpReceipt(userOpHash);
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
    this.#etherspotProvider.clearAllCaches();
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
