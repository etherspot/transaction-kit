/* eslint-disable no-restricted-syntax */
import { ModularSdk, PaymasterApi } from '@etherspot/modular-sdk';
import { isAddress, parseEther } from 'viem';

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
  // Methods that are chainable and to start with
  nativeAmount(props: NativeAmountProps): NativeAmountState;
  transaction(props: TransactionProps): TransactionState;

  // Standalone methods (not chainable)
  getWalletAddress(chainId?: number): Promise<string | undefined>;
  getState(): InstanceState;
  setDebugMode(enabled: boolean): void;
  getProvider(): EtherspotProvider;
  getSdk(chainId?: number, forceNewInstance?: boolean): Promise<ModularSdk>;
  reset(): void;
}

interface NativeAmountState {
  to(props: ToProps): NativeAmountWithToState;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface NativeAmountWithToState {
  name(props: NameProps): NamedState;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface TransactionState {
  name(props: NameProps): NamedState;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface NamedState {
  remove(): void;
  update(): UpdatedState;
  estimate(
    props?: EstimateSingleTransactionProps
  ): Promise<SingleTransactionEstimate & EstimatedState>;
  send(
    props?: SendSingleTransactionProps
  ): Promise<SingleTransactionSendResult & SentState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface UpdatedState {
  update(): UpdatedState;
  estimate(
    props?: EstimateSingleTransactionProps
  ): Promise<SingleTransactionEstimate & EstimatedState>;
  send(
    props?: SendSingleTransactionProps
  ): Promise<SingleTransactionSendResult & SentState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface EstimatedState {
  estimate(
    props?: EstimateSingleTransactionProps
  ): Promise<SingleTransactionEstimate & EstimatedState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

interface SentState {
  send(
    props?: SendSingleTransactionProps
  ): Promise<SingleTransactionSendResult & SentState>;

  // Callable methods at any time
  getState(): InstanceState;
  reset(): void;
}

// Instance state data
export interface InstanceState {
  currentTransaction: TransactionBuilder;
  hasValidTransaction: boolean;
  namedTransactions: { [name: string]: TransactionBuilder };
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

export interface SingleTransactionSendResult {
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

  //   private groupedBatchesPerId: TypePerId<IBatches> = {};

  private namedTransactions: { [name: string]: TransactionBuilder } = {};

  private isEstimating: boolean = false;

  private isSending: boolean = false;

  private containsSendingError: boolean = false;

  private containsEstimatingError: boolean = false;

  private debugMode: boolean = false;

  private walletAddresses: {
    [chainId: number]: string;
  } = {};

  // Current transaction builder state
  private tsx: TransactionBuilder = {};

  private hasValidTransaction: boolean = false;

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
   * Get wallet address for the 'etherspot' wallet type
   */
  async getWalletAddress(chainId?: number): Promise<string | undefined> {
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
        /**
         * Try to get wallet address from SDK state first
         * Currently `etherspotWallet` is marked as private on SDK
         * Reference – https://github.com/etherspot/etherspot-prime-sdk/blob/master/src/sdk/sdk.ts#L31
         */
        walletAddress =
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          etherspotModulaSdk?.etherspotWallet?.accountAddress;

        if (walletAddress) {
          this.log(
            `Got wallet address from SDK state for chain ${walletAddressChainId}`,
            walletAddress
          );
        }
      } catch (e) {
        this.log(
          `Unable to get wallet address from SDK state for chain ${walletAddressChainId}`,
          e
        );
      }

      // If unable to get wallet address from SDK state, try getCounterFactualAddress
      if (!walletAddress) {
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
   * Specify native token amount to send
   */
  nativeAmount({ amount, chainId = 1 }: NativeAmountProps): NativeAmountState {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      this.throwError('nativeAmount(): amount must be a valid number.');
    }

    if (amount <= 0) {
      this.throwError('nativeAmount(): amount must be greater than 0.');
    }

    // Reset state
    this.tsx = {};
    this.hasValidTransaction = false;

    this.tsx.chainId = chainId;
    this.tsx.value = parseEther(String(amount));

    return this;
  }

  /**
   * Specify destination address to send the nativeAmount to
   */
  to({ address }: ToProps): NativeAmountWithToState {
    if (!address) {
      this.throwError('to(): address is required.');
    }

    if (!isAddress(address)) {
      this.throwError(`to(): '${address}' is not a valid address.`);
    }

    this.tsx.to = address;
    this.hasValidTransaction = true;

    return this;
  }

  /**
   * Specify any Ethereum transaction to be send to the userOp batch
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

    // Reset state for new transaction
    this.tsx = {
      chainId,
      to,
      value,
      data,
    };
    this.hasValidTransaction = true;

    return this;
  }

  /**
   * Name the transaction (tsx) in the instance
   */
  name({ transactionName }: NameProps): NamedState {
    if (!this.hasValidTransaction) {
      this.throwError(
        'name(): Cannot name transaction. Call transaction() or nativeAmount().to() first.'
      );
    }

    if (typeof transactionName !== 'string' || transactionName.trim() === '') {
      this.throwError(
        'name(): transactionName is required and must be a non-empty string.'
      );
    }

    this.tsx.transactionName = transactionName;
    return this;
  }

  /**
   * Remove the transaction (tsx) from the instance
   */
  remove(): void {
    if (!this.hasValidTransaction || !this.tsx.transactionName) {
      this.throwError(
        'remove(): No named transaction to remove. Call name() first.'
      );
    }

    this.log('remove(): Transaction cleared from instance.', this.tsx);
    this.tsx = {};
    this.hasValidTransaction = false;
  }

  /**
   * Update the transaction
   */
  update(): UpdatedState {
    if (!this.hasValidTransaction || !this.tsx.transactionName) {
      this.throwError(
        'update(): No named transaction to update. Call name() first.'
      );
    }

    this.log('update(): Transaction updated in instance.', this.tsx);

    return this;
  }

  /**
   * Estimates the transaction (txs) in the instance
   */
  async estimate({
    paymasterDetails,
    gasDetails,
    callGasLimit,
  }: EstimateSingleTransactionProps = {}): Promise<
    SingleTransactionEstimate & EstimatedState
  > {
    if (!this.hasValidTransaction || !this.tsx.transactionName) {
      const result = {
        to: '',
        chainId: this.etherspotProvider.getChainId(),
        errorMessage: 'No named transaction to estimate. Call name() first.',
        errorType: 'VALIDATION_ERROR' as const,
        isSuccess: false,
      };
      return { ...result, ...this };
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
        to: this.tsx.to || '',
        chainId: this.tsx.chainId || this.etherspotProvider.getChainId(),
        errorMessage,
        errorType,
        isSuccess: false,
        ...partialResult,
      };
      return { ...result, ...this };
    };

    try {
      // Validation: Cannot have both value = '0' and data = '0x'
      if (this.tsx.value?.toString() === '0' && this.tsx.data === '0x') {
        return setErrorAndReturn(
          'Invalid transaction: cannot have both value = 0 and data = 0x. Either send Gas tokens (value > 0) or call a contract function (data != 0x)',
          'VALIDATION_ERROR',
          { value: this.tsx.value.toString(), data: this.tsx.data }
        );
      }

      // Get the provider
      const provider = this.etherspotProvider.getProvider();
      // Validation: if there is no provider, returns error
      if (!provider) {
        return setErrorAndReturn(
          'Failed to get Web3 provider!',
          'VALIDATION_ERROR',
          {}
        );
      }

      // Get fresh SDK instance to avoid state pollution
      const etherspotModulaSdk = await this.etherspotProvider.getSdk(
        this.etherspotProvider.getChainId(),
        true
      );

      // Clear any existing operations
      await etherspotModulaSdk.clearUserOpsFromBatch();

      // Add the transaction to the userOp Batch
      await etherspotModulaSdk.addUserOpsToBatch({
        to: this.tsx.to || '',
        value: this.tsx.value?.toString(),
        data: this.tsx.data,
      });

      // Estimate the transaction
      const userOp = await etherspotModulaSdk.estimate({
        paymasterDetails,
        gasDetails,
        callGasLimit,
      });

      this.log('Estimate userOp:', userOp);

      // Calculate total gas cost
      const totalGas = await etherspotModulaSdk.totalGasEstimated(userOp);
      const totalGasBigInt = BigInt(totalGas.toString());
      const maxFeePerGasBigInt = BigInt(userOp.maxFeePerGas.toString());
      const cost = totalGasBigInt * maxFeePerGasBigInt;

      this.log('Single transaction estimated successfully', {
        to: this.tsx.to,
        cost: cost.toString(),
        gasUsed: totalGas.toString(),
      });

      // Success: reset error states
      this.isEstimating = false;
      this.containsEstimatingError = false;

      const result = {
        to: this.tsx.to || '',
        value: this.tsx.value?.toString(),
        data: this.tsx.data,
        chainId: this.tsx.chainId || this.etherspotProvider.getChainId(),
        cost,
        userOp,
        isSuccess: true,
      };

      return { ...result, ...this };
    } catch (error) {
      const errorMessage = parseEtherspotErrorMessage(
        error,
        'Failed to estimate transaction!'
      );

      this.log('Single transaction estimation failed', { error: errorMessage });

      return setErrorAndReturn(errorMessage, 'ESTIMATION_ERROR', {});
    }
  }

  /**
   * Estimates and send the transaction (txs) in the instance
   */
  async send({
    paymasterDetails,
    userOpOverrides,
  }: SendSingleTransactionProps = {}): Promise<
    SingleTransactionSendResult & SentState
  > {
    if (!this.hasValidTransaction || !this.tsx.transactionName) {
      const result = {
        to: '',
        chainId: this.etherspotProvider.getChainId(),
        errorMessage: 'No named transaction to send. Call name() first.',
        errorType: 'VALIDATION_ERROR' as const,
        isSuccess: false,
      };

      return { ...result, ...this };
    }

    this.isSending = true;
    this.containsSendingError = false;

    // Helper function to set error state and return
    const setErrorAndReturn = (
      errorMessage: string,
      errorType: 'ESTIMATION_ERROR' | 'SEND_ERROR' | 'VALIDATION_ERROR',
      partialResult: Partial<SingleTransactionSendResult> = {}
    ) => {
      this.isSending = false;
      this.containsSendingError = true;
      const result = {
        to: this.tsx.to || '',
        chainId: this.tsx.chainId || this.etherspotProvider.getChainId(),
        errorMessage,
        errorType,
        isSuccess: false,
        ...partialResult,
      };

      return { ...result, ...this };
    };

    try {
      // Validation: Cannot have both value = '0' and data = '0x'
      if (this.tsx.value?.toString() === '0' && this.tsx.data === '0x') {
        return setErrorAndReturn(
          'Invalid transaction: cannot have both value = 0 and data = 0x. Either send Gas tokens (value > 0) or call a contract function (data != 0x)',
          'VALIDATION_ERROR',
          { value: this.tsx.value.toString(), data: this.tsx.data }
        );
      }

      // Get provider
      const provider = this.etherspotProvider.getProvider();
      if (!provider) {
        // Validation: if there is no provider, returns error
        return setErrorAndReturn(
          'Failed to get Web3 provider!',
          'VALIDATION_ERROR',
          {}
        );
      }

      // Get fresh SDK instance to avoid state pollution
      const etherspotModulaSdk = await this.etherspotProvider.getSdk(
        this.etherspotProvider.getChainId(),
        true
      );

      // Clear any existing operations
      await etherspotModulaSdk.clearUserOpsFromBatch();

      // Add the transaction to the userOp Batch
      await etherspotModulaSdk.addUserOpsToBatch({
        to: this.tsx.to || '',
        value: this.tsx.value?.toString(),
        data: this.tsx.data,
      });

      // Estimate the transaction
      let estimatedUserOp;
      try {
        estimatedUserOp = await etherspotModulaSdk.estimate({
          paymasterDetails,
        });
        this.log('Estimate userOp:', estimatedUserOp);
      } catch (estimationError) {
        const estimationErrorMessage = parseEtherspotErrorMessage(
          estimationError,
          'Failed to estimate transaction before sending.'
        );
        this.log('Transaction estimation before send failed', {
          error: estimationErrorMessage,
        });
        return setErrorAndReturn(
          estimationErrorMessage,
          'ESTIMATION_ERROR',
          {}
        );
      }

      // Apply any user overrides to the UserOp
      const finalUserOp = { ...estimatedUserOp, ...userOpOverrides };

      // Calculate total gas cost (using the final UserOp values)
      const totalGas = await etherspotModulaSdk.totalGasEstimated(finalUserOp);
      const totalGasBigInt = BigInt(totalGas.toString());
      const maxFeePerGasBigInt = BigInt(finalUserOp.maxFeePerGas.toString());
      const cost = totalGasBigInt * maxFeePerGasBigInt;

      this.log('Single transaction estimated, now sending...', {
        to: this.tsx.to,
        cost: cost.toString(),
        gasUsed: totalGas.toString(),
        userOpOverrides,
      });

      // Send the transaction
      let userOpHash: string;
      try {
        userOpHash = await etherspotModulaSdk.send(finalUserOp);
      } catch (sendError) {
        const sendErrorMessage = parseEtherspotErrorMessage(
          sendError,
          'Failed to send transaction!'
        );

        this.log('Transaction send failed', { error: sendErrorMessage });

        return setErrorAndReturn(sendErrorMessage, 'SEND_ERROR', {
          to: this.tsx.to,
          value: this.tsx.value?.toString(),
          data: this.tsx.data,
          chainId: this.tsx.chainId || this.etherspotProvider.getChainId(),
          cost,
          userOp: finalUserOp,
        });
      }

      this.log('Single transaction sent successfully', {
        to: this.tsx.to,
        userOpHash,
      });

      // Success: reset error states
      this.isSending = false;
      this.containsSendingError = false;

      const result = {
        to: this.tsx.to || '',
        value: this.tsx.value?.toString(),
        data: this.tsx.data,
        chainId: this.tsx.chainId || this.etherspotProvider.getChainId(),
        cost,
        userOp: finalUserOp,
        userOpHash,
        isSuccess: true,
      };

      return { ...result, ...this };
    } catch (error) {
      const errorMessage = parseEtherspotErrorMessage(
        error,
        'Failed to estimate or send transaction!'
      );

      this.log('Single transaction failed', { error: errorMessage });

      return setErrorAndReturn(errorMessage, 'SEND_ERROR', {});
    }
  }

  /**
   * Get current state of the transaction kit instance
   */
  getState(): InstanceState {
    return {
      currentTransaction: { ...this.tsx },
      hasValidTransaction: this.hasValidTransaction,
      namedTransactions: { ...this.namedTransactions },
      isEstimating: this.isEstimating,
      isSending: this.isSending,
      containsSendingError: this.containsSendingError,
      containsEstimatingError: this.containsEstimatingError,
      walletAddresses: { ...this.walletAddresses },
    };
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Get the Etherspot provider
   */
  getProvider(): EtherspotProvider {
    return this.etherspotProvider;
  }

  /**
   * Get the Etherspot Modular SDK instance
   */
  async getSdk(
    chainId?: number,
    forceNewInstance?: boolean
  ): Promise<ModularSdk> {
    return this.etherspotProvider.getSdk(chainId, forceNewInstance);
  }

  /**
   * Reset all state
   */
  reset(): void {
    // this.groupedBatchesPerId = {};
    this.namedTransactions = {};
    this.isEstimating = false;
    this.isSending = false;
    this.containsSendingError = false;
    this.containsEstimatingError = false;
    this.tsx = {};
    this.hasValidTransaction = false;
    this.walletAddresses = {};
    this.etherspotProvider.clearAllCaches();
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
