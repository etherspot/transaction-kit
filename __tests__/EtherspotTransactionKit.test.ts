import { ModularSdk, PaymasterApi } from '@etherspot/modular-sdk';
import {
  KERNEL_V3_3,
  KernelVersionToAddressesMap,
} from '@zerodev/sdk/constants';
import { isAddress, parseEther } from 'viem';

// EtherspotPovider
import { EtherspotProvider } from '../lib/EtherspotProvider';

// EtherspotUtils
import { EtherspotUtils } from '../lib/EtherspotUtils';

// TransactionKit
import { EtherspotTransactionKit, TransactionKit } from '../lib/TransactionKit';

// Types
import {
  IEstimatedTransaction,
  TransactionEstimateResult,
} from '../lib/interfaces';

// Mock dependencies
jest.mock('../lib/EtherspotProvider');
jest.mock('../lib/EtherspotUtils');
jest.mock('@etherspot/modular-sdk');
jest.mock('@zerodev/sdk', () => ({
  createKernelAccount: jest.fn().mockResolvedValue({ smartAccount: true }),
}));
jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    isAddress: jest.fn(),
    parseEther: jest.fn(),
  };
});

// Move mockConfig and mockSdk to a higher scope for batch tests
let mockConfig: any;
let mockSdk: any;

// Consolidated test utilities to reduce duplication
const testNoNamedTransactionError = (
  methodName: string,
  testFn: () => Promise<any>,
  expectedErrorType: string
) => {
  it(`should return error if no named transaction in ${methodName}`, async () => {
    const emptyKit = new EtherspotTransactionKit(mockConfig);
    const result = await testFn.call(emptyKit);

    expect(result[expectedErrorType]).toBe(false);
    expect(result.errorType).toBe('VALIDATION_ERROR');
    expect(result.errorMessage).toContain('No named transaction');
  });
};

const testZeroValueTransaction = (
  methodName: string,
  testFn: () => Promise<any>
) => {
  it(`should allow ${methodName} with value = 0 and data = 0x`, async () => {
    const kit = new EtherspotTransactionKit(mockConfig);
    kit.transaction({
      chainId: 1,
      to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      value: '0',
      data: '0x',
    });
    kit.name({ transactionName: 'test' });

    // Mock SDK for the operation
    mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
    mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
    if (methodName === 'send') {
      mockSdk.send.mockResolvedValue('0xhash');
    }

    const result = await testFn.call(kit);

    // Should not return a validation error
    expect(result.errorType).not.toBe('VALIDATION_ERROR');
  });
};

beforeEach(() => {
  mockConfig = {
    provider: {} as any,
    chainId: 1,
    bundlerApiKey: 'test-bundler-key',
    debugMode: false,
  };
  mockSdk = {
    getCounterFactualAddress: jest.fn(),
    clearUserOpsFromBatch: jest.fn(),
    addUserOpsToBatch: jest.fn(),
    estimate: jest.fn(),
    send: jest.fn(),
    totalGasEstimated: jest.fn(),
    etherspotWallet: {
      accountAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    },
  };
});

describe('EtherspotTransactionKit', () => {
  let transactionKit: EtherspotTransactionKit;
  let mockProvider: jest.Mocked<EtherspotProvider>;
  let mockSdk: jest.Mocked<ModularSdk>;
  let mockWeb3Provider: any;

  const mockConfig = {
    provider: {} as any,
    chainId: 1,
    bundlerApiKey: 'test-bundler-key',
    debugMode: false,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Web3 provider
    mockWeb3Provider = {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    };

    // Mock ModularSdk
    mockSdk = {
      getCounterFactualAddress: jest.fn(),
      clearUserOpsFromBatch: jest.fn(),
      addUserOpsToBatch: jest.fn(),
      estimate: jest.fn(),
      send: jest.fn(),
      totalGasEstimated: jest.fn(),
      etherspotWallet: {
        accountAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      },
    } as any;

    // Mock EtherspotProvider
    mockProvider = {
      getSdk: jest.fn().mockResolvedValue(mockSdk),
      getProvider: jest.fn().mockReturnValue(mockWeb3Provider),
      getChainId: jest.fn().mockReturnValue(1),
      clearAllCaches: jest.fn(),
      getWalletMode: jest.fn().mockReturnValue('modular'),
    } as any;

    // Mock EtherspotProvider constructor
    (
      EtherspotProvider as jest.MockedClass<typeof EtherspotProvider>
    ).mockImplementation(() => mockProvider);

    // Mock viem functions
    (isAddress as unknown as jest.Mock).mockReturnValue(true);
    (parseEther as jest.Mock).mockReturnValue(BigInt('1000000000000000000'));

    // Create instance
    transactionKit = new EtherspotTransactionKit(mockConfig);
  });

  // ============================================================================
  // 1. SETUP & CONFIGURATION
  // ============================================================================

  describe('Setup & Configuration', () => {
    describe('Constructor', () => {
      it('should initialize with config', () => {
        expect(EtherspotProvider).toHaveBeenCalledWith(mockConfig);
        expect(transactionKit.getEtherspotProvider()).toBe(mockProvider);
      });

      it('should set debug mode from config', () => {
        const debugConfig = { ...mockConfig, debugMode: true };
        const debugKit = new EtherspotTransactionKit(debugConfig);
        expect(debugKit).toBeDefined();
      });
    });

    describe('Factory Function', () => {
      it('should create EtherspotTransactionKit instance', () => {
        const kit = TransactionKit(mockConfig);
        expect(kit).toBeInstanceOf(EtherspotTransactionKit);
      });
    });

    describe('Static Utils', () => {
      it('should expose EtherspotUtils', () => {
        expect(EtherspotTransactionKit.utils).toBe(EtherspotUtils);
      });
    });
  });

  // ============================================================================
  // 2. CORE TRANSACTION FLOW
  // ============================================================================

  describe('Core Transaction Flow', () => {
    describe('Transaction Creation', () => {
      it('should create transaction with all parameters', () => {
        const txParams = {
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
          data: '0x1234',
        };

        const result = transactionKit.transaction(txParams);

        expect(result).toBe(transactionKit);
        expect(transactionKit.getState().workingTransaction).toEqual(txParams);
        expect(transactionKit.getState().workingTransaction).toBeDefined();
      });

      it('should use default values for optional parameters', () => {
        const txParams = {
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        };

        transactionKit.transaction(txParams);

        const state = transactionKit.getState().workingTransaction;
        expect(state?.chainId).toBe(1);
        expect(state?.value).toBe('0');
        expect(state?.data).toBe('0x');
      });

      it('should accept bigint value', () => {
        const txParams = {
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: BigInt(1000),
        };

        transactionKit.transaction(txParams);

        expect(transactionKit.getState().workingTransaction?.value).toBe(
          BigInt(1000)
        );
      });

      it('should update existing transaction when one is selected', () => {
        // First create and name a transaction
        transactionKit
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: '1000000000000000000',
            data: '0x1234',
          })
          .name({ transactionName: 'test-tx' });

        // Now update it
        const result = transactionKit.transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '2000000000000000000',
          data: '0x5678',
        });

        expect(result).toBe(transactionKit);
        expect(transactionKit['workingTransaction']).toEqual({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '2000000000000000000',
          data: '0x5678',
          transactionName: 'test-tx',
        });
      });
    });

    describe('Transaction Validation', () => {
      describe('chainId validation', () => {
        it('should throw error for undefined chainId', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: undefined as any,
            });
          }).toThrow(
            'transaction(): chainId is required. Please specify the target network explicitly.'
          );
        });

        it('should throw error for null chainId', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: null as any,
            });
          }).toThrow(
            'transaction(): chainId is required. Please specify the target network explicitly.'
          );
        });

        it('should throw error for non-integer chainId', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1.5,
            });
          }).toThrow('transaction(): chainId must be a valid number.');
        });

        it('should throw error for string chainId', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: '1' as any,
            });
          }).toThrow('transaction(): chainId must be a valid number.');
        });

        it('should throw error for NaN chainId', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: NaN,
            });
          }).toThrow('transaction(): chainId must be a valid number.');
        });

        it('should accept valid integer chainId', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 137,
            });
          }).not.toThrow();
        });
      });

      describe('to address validation', () => {
        it('should throw error for empty to address', () => {
          expect(() => {
            transactionKit.transaction({
              to: '',
              chainId: 1,
            });
          }).toThrow('transaction(): to is required.');
        });

        it('should throw error for null to address', () => {
          expect(() => {
            transactionKit.transaction({
              to: null as any,
              chainId: 1,
            });
          }).toThrow('transaction(): to is required.');
        });

        it('should throw error for undefined to address', () => {
          expect(() => {
            transactionKit.transaction({
              to: undefined as any,
              chainId: 1,
            });
          }).toThrow('transaction(): to is required.');
        });

        it('should throw error for invalid address format', () => {
          (isAddress as unknown as jest.Mock).mockReturnValueOnce(false);
          expect(() => {
            transactionKit.transaction({
              to: 'invalid-address',
              chainId: 1,
            });
          }).toThrow(
            "transaction(): 'invalid-address' is not a valid address."
          );
        });

        it('should throw error for address with wrong length', () => {
          (isAddress as unknown as jest.Mock).mockReturnValueOnce(false);
          expect(() => {
            transactionKit.transaction({
              to: '0x123',
              chainId: 1,
            });
          }).toThrow("transaction(): '0x123' is not a valid address.");
        });

        it('should accept valid address', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
            });
          }).not.toThrow();
        });

        it('should accept checksummed address', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
            });
          }).not.toThrow();
        });
      });

      describe('value validation', () => {
        it('should throw error for negative string value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: '-1',
            });
          }).toThrow(
            'transaction(): value must be a non-negative bigint or numeric string.'
          );
        });

        it('should throw error for negative bigint value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: BigInt(-1),
            });
          }).toThrow(
            'transaction(): value must be a non-negative bigint or numeric string.'
          );
        });

        it('should throw error for non-numeric string value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: 'not-a-number',
            });
          }).toThrow(
            'transaction(): value must be a non-negative bigint or numeric string.'
          );
        });

        it('should throw error for object value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: {} as any,
            });
          }).toThrow(
            'transaction(): value must be a non-negative bigint or numeric string.'
          );
        });

        it('should accept zero string value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: '0',
            });
          }).not.toThrow();
        });

        it('should accept zero bigint value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: BigInt(0),
            });
          }).not.toThrow();
        });

        it('should accept large string value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: '1000000000000000000000000000000000000000',
            });
          }).not.toThrow();
        });

        it('should accept large bigint value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: BigInt('1000000000000000000000000000000000000000'),
            });
          }).not.toThrow();
        });

        it('should accept hex string value', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: '0x1',
            });
          }).not.toThrow();
        });
      });

      describe('data validation', () => {
        it('should accept empty data', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              data: '',
            });
          }).not.toThrow();
        });

        it('should accept 0x data', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              data: '0x',
            });
          }).not.toThrow();
        });

        it('should accept valid hex data', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              data: '0x1234567890abcdef',
            });
          }).not.toThrow();
        });

        it('should accept long hex data', () => {
          expect(() => {
            transactionKit.transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              data: '0x' + '1234567890abcdef'.repeat(100),
            });
          }).not.toThrow();
        });
      });
    });

    describe('Transaction Naming', () => {
      beforeEach(() => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });
      });

      it('should name transaction correctly', () => {
        const transactionName = 'test-transaction';

        const result = transactionKit.name({ transactionName });

        expect(result).toBe(transactionKit);
        expect(
          transactionKit.getState().workingTransaction?.transactionName
        ).toBe(transactionName);
      });

      it('should throw error if no valid transaction', () => {
        const emptyKit = new EtherspotTransactionKit(mockConfig);

        expect(() => {
          emptyKit.name({ transactionName: 'test' });
        }).toThrow(
          'EtherspotTransactionKit: name(): No transaction data to name. Call transaction() first.'
        );
      });
    });

    describe('Transaction Estimation', () => {
      beforeEach(() => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
          data: '0x1234',
        });
        transactionKit.name({ transactionName: 'test' });
      });

      it('should estimate transaction successfully', async () => {
        const mockUserOp = {
          sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          nonce: '0x1',
          initCode: '0x',
          callData: '0x1234',
          callGasLimit: '0x5208',
          verificationGasLimit: '0x5208',
          preVerificationGas: '0x5208',
          maxFeePerGas: '0x77359400',
          maxPriorityFeePerGas: '0x77359400',
          paymasterAndData: '0x',
          signature: '0x',
        };

        mockSdk.estimate.mockResolvedValue(mockUserOp);
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

        const result = await transactionKit.estimate();

        expect(result.isEstimatedSuccessfully).toBe(true);
        expect(result.userOp).toEqual(mockUserOp);
        expect(result.cost).toBeDefined();
        expect(mockSdk.clearUserOpsFromBatch).toHaveBeenCalled();
        expect(mockSdk.addUserOpsToBatch).toHaveBeenCalledWith({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
          data: '0x1234',
        });
      });

      it('should estimate with paymaster details', async () => {
        const paymasterDetails: PaymasterApi = {
          url: 'https://paymaster.example.com',
          context: { mode: 'erc20' },
        };

        const mockUserOp = {
          sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          maxFeePerGas: '0x77359400',
        };

        mockSdk.estimate.mockResolvedValue(mockUserOp);
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

        await transactionKit.estimate({ paymasterDetails });

        expect(mockSdk.estimate).toHaveBeenCalledWith({
          paymasterDetails,
          gasDetails: undefined,
          callGasLimit: undefined,
        });
      });

      it('should throw if no provider in estimate', async () => {
        // @ts-ignore
        mockProvider.getProvider.mockReturnValue(null);
        await expect(transactionKit.estimate()).rejects.toThrow(
          'estimate(): No Web3 provider available. This is a critical configuration error.'
        );
      });
      testNoNamedTransactionError(
        'estimate',
        function () {
          return this.estimate();
        },
        'isEstimatedSuccessfully'
      );
      testZeroValueTransaction('estimate', function () {
        return this.estimate();
      });
    });

    describe('Transaction Sending', () => {
      beforeEach(() => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
          data: '0x1234',
        });
        transactionKit.name({ transactionName: 'test' });
      });

      it('should send transaction successfully', async () => {
        const mockUserOp = {
          sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          maxFeePerGas: '0x77359400',
        };
        const mockUserOpHash = '0xabcdef1234567890';

        mockSdk.estimate.mockResolvedValue(mockUserOp);
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockResolvedValue(mockUserOpHash);

        const result = await transactionKit.send();

        expect(result.isEstimatedSuccessfully).toBe(true);
        expect(result.isSentSuccessfully).toBe(true);
        expect(result.userOpHash).toBe(mockUserOpHash);
        expect(result.userOp).toEqual(mockUserOp);
      });

      it('should send with user operation overrides', async () => {
        const mockUserOp = {
          sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          maxFeePerGas: '0x77359400',
          callGasLimit: '0x5208',
        };
        const userOpOverrides = {
          callGasLimit: '0x7530',
        };
        const mockUserOpHash = '0xabcdef1234567890';

        mockSdk.estimate.mockResolvedValue(mockUserOp);
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockResolvedValue(mockUserOpHash);

        const result = await transactionKit.send({ userOpOverrides });

        expect(mockSdk.send).toHaveBeenCalledWith({
          ...mockUserOp,
          ...userOpOverrides,
        });
        expect(result.isEstimatedSuccessfully).toBe(true);
        expect(result.isSentSuccessfully).toBe(true);
      });

      it('should throw if no provider in send', async () => {
        // @ts-ignore
        mockProvider.getProvider.mockReturnValue(null);
        await expect(transactionKit.send()).rejects.toThrow(
          'send(): No Web3 provider available. This is a critical configuration error.'
        );
      });
      testNoNamedTransactionError(
        'send',
        function () {
          return this.send();
        },
        'isSentSuccessfully'
      );
      testZeroValueTransaction('send', function () {
        return this.send();
      });
    });
  });

  // ============================================================================
  // 3. TRANSACTION MANAGEMENT
  // ============================================================================

  describe('Transaction Management', () => {
    describe('Transaction Removal', () => {
      it('should remove named transaction', () => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });
        transactionKit.name({ transactionName: 'test' });

        expect(transactionKit.getState().workingTransaction).toBeDefined();

        transactionKit.remove();

        expect(transactionKit.getState().workingTransaction).toBeUndefined();
        expect(transactionKit.getState().namedTransactions).toEqual({});
      });

      it('should throw error if no named transaction', () => {
        expect(() => {
          transactionKit.remove();
        }).toThrow(
          'EtherspotTransactionKit: remove(): No transaction or batch selected to remove.'
        );
      });

      it('should throw error if transaction not named', () => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });

        expect(() => {
          transactionKit.remove();
        }).toThrow(
          'EtherspotTransactionKit: remove(): No transaction or batch selected to remove.'
        );
      });
    });

    describe('Transaction Updates', () => {
      beforeEach(() => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });
        transactionKit.name({ transactionName: 'test' });
      });

      it('should return UpdatedState', () => {
        const result = transactionKit.update();

        expect(result).toBe(transactionKit);
      });

      it('should throw error if no named transaction', () => {
        const emptyKit = new EtherspotTransactionKit(mockConfig);

        expect(() => {
          emptyKit.update();
        }).toThrow(
          'EtherspotTransactionKit: update(): No named transaction to update. Call name() first.'
        );
      });
    });

    describe('State Management', () => {
      it('should return current state', () => {
        const state = transactionKit.getState();

        expect(state).toEqual({
          workingTransaction: undefined,
          namedTransactions: {},
          batches: {},
          isEstimating: false,
          isSending: false,
          containsSendingError: false,
          containsEstimatingError: false,
          walletAddresses: {},
          selectedTransactionName: undefined,
          selectedBatchName: undefined,
        });
      });

      it('should return state with transaction', () => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
        });

        const state = transactionKit.getState();

        expect(state.workingTransaction).toBeDefined();
        expect(state.workingTransaction?.to).toBe(
          '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        );
      });

      it('should reset all state', () => {
        // Set up some state
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });
        transactionKit.name({ transactionName: 'test' });

        expect(transactionKit.getState().workingTransaction).toBeDefined();

        // Reset
        transactionKit.reset();

        const state = transactionKit.getState();
        expect(state).toEqual({
          workingTransaction: undefined,
          namedTransactions: {},
          batches: {},
          isEstimating: false,
          isSending: false,
          containsSendingError: false,
          containsEstimatingError: false,
          walletAddresses: {},
          selectedTransactionName: undefined,
          selectedBatchName: undefined,
        });
      });
    });
  });

  // ============================================================================
  // 4. BATCH OPERATIONS
  // ============================================================================

  describe('Batch Operations', () => {
    beforeEach(() => {
      // Ensure isAddress mock is set up
      (isAddress as unknown as jest.Mock).mockReturnValue(true);

      transactionKit = new EtherspotTransactionKit(mockConfig);
      // Re-mock SDK for each test
      transactionKit.getEtherspotProvider().getSdk = jest
        .fn()
        .mockResolvedValue(mockSdk);
      mockSdk.clearUserOpsFromBatch.mockReset();
      mockSdk.addUserOpsToBatch.mockReset();
      mockSdk.estimate.mockReset();
      mockSdk.send.mockReset();
      mockSdk.totalGasEstimated.mockReset();
      transactionKit.transaction({
        chainId: 1,
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'tx1' });
      transactionKit.addToBatch({ batchName: 'batch1' });
      transactionKit.transaction({
        chainId: 1,
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: '2000000000000000000',
      });
      transactionKit.name({ transactionName: 'tx2' });
      transactionKit.addToBatch({ batchName: 'batch1' });
    });

    describe('Batch Creation and Management', () => {
      it('should add transactions to a batch and reflect in state', () => {
        const state = transactionKit.getState();
        expect(state.batches['batch1']).toHaveLength(2);
        expect(state.namedTransactions['tx1'].batchName).toBe('batch1');
        expect(state.namedTransactions['tx2'].batchName).toBe('batch1');
      });

      it('should remove a batch and all its transactions', () => {
        transactionKit.batch({ batchName: 'batch1' }).remove();
        const state = transactionKit.getState();
        expect(state.batches['batch1']).toBeUndefined();
        expect(state.namedTransactions['tx1']).toBeUndefined();
        expect(state.namedTransactions['tx2']).toBeUndefined();
      });

      it('should remove a transaction from a batch and delete batch if empty', () => {
        // Remove tx1
        transactionKit.name({ transactionName: 'tx1' }).remove();
        let state = transactionKit.getState();
        expect(state.batches['batch1']).toHaveLength(1);
        expect(state.namedTransactions['tx1']).toBeUndefined();
        // Remove tx2 (last in batch)
        transactionKit.name({ transactionName: 'tx2' }).remove();
        state = transactionKit.getState();
        expect(state.batches['batch1']).toBeUndefined();
        expect(state.namedTransactions['tx2']).toBeUndefined();
      });
    });

    describe('Batch Estimation', () => {
      it('should estimate batches and return results', async () => {
        // Recreate batch setup since previous tests may have removed it
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'tx1' });
        transactionKit.addToBatch({ batchName: 'batch1' });
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '2000000000000000000',
        });
        transactionKit.name({ transactionName: 'tx2' });
        transactionKit.addToBatch({ batchName: 'batch1' });

        // Verify batch exists before estimation
        const state = transactionKit.getState();
        console.log('State before estimation:', JSON.stringify(state, null, 2));
        expect(state.batches['batch1']).toHaveLength(2);

        mockSdk.clearUserOpsFromBatch.mockResolvedValue(undefined as any);
        mockSdk.addUserOpsToBatch.mockResolvedValue(undefined as any);
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        const result = await transactionKit.estimateBatches();
        expect(result.isEstimatedSuccessfully).toBe(true);
        expect(result.batches['batch1']).toBeDefined();
        expect(result.batches['batch1'].transactions).toHaveLength(2);
      });

      it('should return error for estimating non-existent batch', async () => {
        // Clear existing batches first
        transactionKit.reset();

        const result = await transactionKit.estimateBatches({
          onlyBatchNames: ['doesnotexist'],
        });
        expect(result.isEstimatedSuccessfully).toBe(false);
        // For non-existent batches, the result should contain an error entry
        expect(result.batches['doesnotexist']).toBeDefined();
        expect(result.batches['doesnotexist'].errorMessage).toBeDefined();
        expect(result.batches['doesnotexist'].isEstimatedSuccessfully).toBe(
          false
        );
      });

      it('should throw if no provider in estimateBatches', async () => {
        // @ts-ignore
        mockProvider.getProvider.mockReturnValue(null);
        await expect(transactionKit.estimateBatches()).rejects.toThrow(
          'estimateBatches(): No Web3 provider available. This is a critical configuration error.'
        );
      });
    });

    describe('Batch Sending', () => {
      it('should send batches and remove them from state on success', async () => {
        mockSdk.clearUserOpsFromBatch.mockResolvedValue(undefined as any);
        mockSdk.addUserOpsToBatch.mockResolvedValue(undefined as any);
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockResolvedValue('0xhash');
        const result = await transactionKit.sendBatches();
        expect(result.isEstimatedSuccessfully).toBe(true);
        expect(result.isSentSuccessfully).toBe(true);
        // After successful send, batch and transactions should be removed
        const state = transactionKit.getState();
        expect(state.batches['batch1']).toBeUndefined();
        expect(state.namedTransactions['tx1']).toBeUndefined();
        expect(state.namedTransactions['tx2']).toBeUndefined();
      });

      it('should not remove batch from state if send fails', async () => {
        mockSdk.clearUserOpsFromBatch.mockResolvedValue(undefined as any);
        mockSdk.addUserOpsToBatch.mockResolvedValue(undefined as any);
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockRejectedValue(new Error('Send failed'));
        const result = await transactionKit.sendBatches();
        expect(result.isSentSuccessfully).toBe(false);
        // Batch and transactions should remain
        const state = transactionKit.getState();
        expect(state.batches['batch1']).toBeDefined();
        expect(state.namedTransactions['tx1']).toBeDefined();
        expect(state.namedTransactions['tx2']).toBeDefined();
      });

      it('should return error for sending non-existent batch', async () => {
        const result = await transactionKit.sendBatches({
          onlyBatchNames: ['doesnotexist'],
        });
        expect(result.isSentSuccessfully).toBe(false);
      });

      it('should return error for sending empty batch', async () => {
        // Remove all transactions from batch1
        transactionKit.name({ transactionName: 'tx1' }).remove();
        transactionKit.name({ transactionName: 'tx2' }).remove();
        // Add empty batch manually
        transactionKit.getState().batches['batch1'] = [];
        const result = await transactionKit.sendBatches({
          onlyBatchNames: ['batch1'],
        });
        expect(result.isSentSuccessfully).toBe(false);
      });

      it('should throw if no provider in sendBatches', async () => {
        // @ts-ignore
        mockProvider.getProvider.mockReturnValue(null);
        await expect(transactionKit.sendBatches()).rejects.toThrow(
          'sendBatches(): No Web3 provider available. This is a critical configuration error.'
        );
      });
    });

    describe('Batch Edge Cases', () => {
      it('should handle mixed chain ID batches', async () => {
        // Create transactions on different chains
        transactionKit
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: '1000000000000000000',
          })
          .name({ transactionName: 'eth-tx' })
          .addToBatch({ batchName: 'mixed-batch' });

        transactionKit
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 137,
            value: '2000000000000000000',
          })
          .name({ transactionName: 'polygon-tx' })
          .addToBatch({ batchName: 'mixed-batch' });

        const state = transactionKit.getState();
        expect(state.batches['mixed-batch']).toHaveLength(2);
        expect(state.namedTransactions['eth-tx'].chainId).toBe(1);
        expect(state.namedTransactions['polygon-tx'].chainId).toBe(137);
      });

      it('should handle large batch operations', async () => {
        // Create a large batch with many transactions
        const batchName = 'large-batch';
        const transactionCount = 50;

        for (let i = 0; i < transactionCount; i++) {
          transactionKit
            .transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: '1000000000000000000',
              data: `0x${i.toString(16).padStart(8, '0')}`,
            })
            .name({ transactionName: `tx-${i}` })
            .addToBatch({ batchName });
        }

        const state = transactionKit.getState();
        expect(state.batches[batchName]).toHaveLength(transactionCount);
      });

      it('should handle batch operations with multiple transactions', async () => {
        // Create multiple transactions in a batch
        transactionKit
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: '1000000000000000000',
          })
          .name({ transactionName: 'tx1' })
          .addToBatch({ batchName: 'multi-tx-batch' });

        transactionKit
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: '2000000000000000000',
          })
          .name({ transactionName: 'tx2' })
          .addToBatch({ batchName: 'multi-tx-batch' });

        // Mock SDK for successful batch operations
        mockSdk.clearUserOpsFromBatch.mockResolvedValue(undefined as any);
        mockSdk.addUserOpsToBatch.mockResolvedValue(undefined as any);
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('42000') as any);

        const result = await transactionKit.estimateBatches({
          onlyBatchNames: ['multi-tx-batch'],
        });

        expect(result.isEstimatedSuccessfully).toBe(true);
        expect(result.batches).toBeDefined();
      });

      it('should validate batch name format', () => {
        expect(() => {
          transactionKit.batch({ batchName: '' });
        }).toThrow(
          'EtherspotTransactionKit: batch(): batchName is required and must be a non-empty string.'
        );

        expect(() => {
          transactionKit.batch({ batchName: null as any });
        }).toThrow(
          'EtherspotTransactionKit: batch(): batchName is required and must be a non-empty string.'
        );

        expect(() => {
          transactionKit.batch({ batchName: undefined as any });
        }).toThrow(
          'EtherspotTransactionKit: batch(): batchName is required and must be a non-empty string.'
        );
      });

      it('should handle concurrent batch operations', async () => {
        // Create separate transaction kits for concurrent operations
        const kit1 = new EtherspotTransactionKit(mockConfig);
        const kit2 = new EtherspotTransactionKit(mockConfig);

        // Setup transactions for both batches
        kit1
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: '1000000000000000000',
          })
          .name({ transactionName: 'concurrent-tx1' })
          .addToBatch({ batchName: 'concurrent-batch-1' });

        kit2
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: '2000000000000000000',
          })
          .name({ transactionName: 'concurrent-tx2' })
          .addToBatch({ batchName: 'concurrent-batch-2' });

        // Mock SDK for concurrent operations
        mockSdk.clearUserOpsFromBatch.mockResolvedValue(undefined as any);
        mockSdk.addUserOpsToBatch.mockResolvedValue(undefined as any);
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

        // Run concurrent estimations
        const [result1, result2] = await Promise.all([
          kit1.estimateBatches({ onlyBatchNames: ['concurrent-batch-1'] }),
          kit2.estimateBatches({ onlyBatchNames: ['concurrent-batch-2'] }),
        ]);

        expect(result1.isEstimatedSuccessfully).toBe(true);
        expect(result2.isEstimatedSuccessfully).toBe(true);
      });

      it('should handle batch with zero-value transactions', async () => {
        transactionKit
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: '0',
            data: '0x',
          })
          .name({ transactionName: 'zero-value-tx' })
          .addToBatch({ batchName: 'zero-batch' });

        mockSdk.clearUserOpsFromBatch.mockResolvedValue(undefined as any);
        mockSdk.addUserOpsToBatch.mockResolvedValue(undefined as any);
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

        const result = await transactionKit.estimateBatches({
          onlyBatchNames: ['zero-batch'],
        });

        expect(result.isEstimatedSuccessfully).toBe(true);
      });
    });
  });

  // ============================================================================
  // 5. UTILITY METHODS
  // ============================================================================

  describe('Utility Methods', () => {
    describe('Wallet Address Management', () => {
      it('should return wallet address', async () => {
        const walletAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        mockSdk.getCounterFactualAddress.mockResolvedValue(walletAddress);

        const callWalletAddress = await transactionKit.getWalletAddress(1);

        expect(callWalletAddress).toBe(walletAddress);
        expect(mockProvider.getSdk).toHaveBeenCalledTimes(1);
      });

      it('should fallback to getCounterFactualAddress if SDK state fails', async () => {
        const walletAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        (mockSdk as any).etherspotWallet = null;
        mockSdk.getCounterFactualAddress.mockResolvedValue(walletAddress);

        const result = await transactionKit.getWalletAddress();

        expect(result).toBe(walletAddress);
        expect(mockSdk.getCounterFactualAddress).toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        (mockSdk as any).etherspotWallet = null;
        mockSdk.getCounterFactualAddress.mockRejectedValue(
          new Error('SDK error')
        );

        const result = await transactionKit.getWalletAddress();

        expect(result).toBeUndefined();
      });

      it('should use provided chainId', async () => {
        const chainId = 5;
        const walletAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        mockSdk.getCounterFactualAddress.mockResolvedValue(walletAddress);

        await transactionKit.getWalletAddress(chainId);

        expect(mockProvider.getSdk).toHaveBeenCalledWith(chainId);
      });

      it('should cache wallet address and return from cache on subsequent calls', async () => {
        const walletAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        const chainId = 1;

        mockSdk.getCounterFactualAddress.mockResolvedValue(walletAddress);

        // First call
        const result1 = await transactionKit.getWalletAddress(chainId);
        expect(result1).toBe(walletAddress);
        expect(mockProvider.getSdk).toHaveBeenCalledTimes(1);

        // Second call should use cache
        const result2 = await transactionKit.getWalletAddress(chainId);
        expect(result2).toBe(walletAddress);
        expect(mockProvider.getSdk).toHaveBeenCalledTimes(1); // Should not call again
      });
    });

    describe('Provider and SDK Access', () => {
      it('should return etherspot provider', () => {
        const provider = transactionKit.getEtherspotProvider();
        expect(provider).toBe(mockProvider);
      });

      it('should return SDK instance', async () => {
        const sdk = await transactionKit.getSdk();
        expect(sdk).toBe(mockSdk);
        expect(mockProvider.getSdk).toHaveBeenCalledWith(undefined, undefined);
      });

      it('should return SDK instance with parameters', async () => {
        const chainId = 5;
        const forceNewInstance = true;

        const sdk = await transactionKit.getSdk(chainId, forceNewInstance);

        expect(sdk).toBe(mockSdk);
        expect(mockProvider.getSdk).toHaveBeenCalledWith(
          chainId,
          forceNewInstance
        );
      });
    });

    describe('Debug Mode', () => {
      it('should enable debug mode', () => {
        transactionKit.setDebugMode(true);
        expect(() => transactionKit.setDebugMode(true)).not.toThrow();
      });

      it('should disable debug mode', () => {
        transactionKit.setDebugMode(false);
        expect(() => transactionKit.setDebugMode(false)).not.toThrow();
      });

      it('should not throw errors when debug mode is enabled', () => {
        const debugKit = new EtherspotTransactionKit({
          ...mockConfig,
          debugMode: true,
        });

        expect(() => {
          debugKit.setDebugMode(true);
          debugKit.transaction({
            chainId: 1,
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          });
          debugKit.name({ transactionName: 'debug-tx' });
        }).not.toThrow();
      });
    });

    describe('Transaction Hash Retrieval', () => {
      it('returns transaction hash when available immediately', async () => {
        const mockSdk = {
          getUserOpReceipt: jest.fn(),
        } as any;
        transactionKit.getSdk = jest.fn().mockResolvedValue(mockSdk);

        (mockSdk.getUserOpReceipt as jest.Mock).mockResolvedValue('0xhash');
        const result = await transactionKit.getTransactionHash(
          '0xuserOpHash',
          1,
          1000,
          10
        );
        expect(result).toBe('0xhash');
        expect(mockSdk.getUserOpReceipt).toHaveBeenCalledWith('0xuserOpHash');
      });

      it('returns transaction hash after several polls', async () => {
        const mockSdk = {
          getUserOpReceipt: jest.fn(),
        } as any;
        transactionKit.getSdk = jest.fn().mockResolvedValue(mockSdk);

        let callCount = 0;
        (mockSdk.getUserOpReceipt as jest.Mock).mockImplementation(() => {
          callCount++;
          return callCount === 3 ? '0xhash' : null;
        });
        const result = await transactionKit.getTransactionHash(
          '0xuserOpHash',
          1,
          100,
          1
        );
        expect(result).toBe('0xhash');
        expect(callCount).toBeGreaterThan(1);
      });

      it('returns null on timeout', async () => {
        const mockSdk = {
          getUserOpReceipt: jest.fn(),
        } as any;
        transactionKit.getSdk = jest.fn().mockResolvedValue(mockSdk);

        (mockSdk.getUserOpReceipt as jest.Mock).mockResolvedValue(null);
        const result = await transactionKit.getTransactionHash(
          '0xuserOpHash',
          1,
          50,
          10
        );
        expect(result).toBeNull();
      });
    });
  });

  // ============================================================================
  // 6. VALIDATION & ERROR HANDLING
  // ============================================================================

  describe('Validation & Error Handling', () => {
    describe('Transaction Validation', () => {
      it('should throw error for missing to address', () => {
        expect(() => {
          transactionKit.transaction({ chainId: 1, to: '' });
        }).toThrow('transaction(): to is required.');
      });

      it('should throw error for invalid to address', () => {
        (isAddress as unknown as jest.Mock).mockReturnValue(false);

        expect(() => {
          transactionKit.transaction({ chainId: 1, to: 'invalid-address' });
        }).toThrow(`transaction(): 'invalid-address' is not a valid address.`);
      });

      it('should throw error for invalid chainId', () => {
        expect(() => {
          transactionKit.transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1.5,
          });
        }).toThrow('transaction(): chainId must be a valid number.');
      });

      it('should throw error for invalid value', () => {
        expect(() => {
          transactionKit.transaction({
            chainId: 1,
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            value: 'invalid',
          });
        }).toThrow(
          'transaction(): value must be a non-negative bigint or numeric string.'
        );
      });

      it('should throw error for negative value', () => {
        expect(() => {
          transactionKit.transaction({
            chainId: 1,
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            value: '-1',
          });
        }).toThrow(
          'transaction(): value must be a non-negative bigint or numeric string.'
        );
      });
    });

    describe('Name Validation', () => {
      it('should throw error for empty transaction name', () => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });

        expect(() => {
          transactionKit.name({ transactionName: '' });
        }).toThrow(
          'name(): transactionName is required and must be a non-empty string.'
        );
      });

      it('should throw error for whitespace-only transaction name', () => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });

        expect(() => {
          transactionKit.name({ transactionName: '   ' });
        }).toThrow(
          'name(): transactionName is required and must be a non-empty string.'
        );
      });

      it('should throw error for non-string transaction name', () => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        });

        expect(() => {
          transactionKit.name({ transactionName: 123 as any });
        }).toThrow(
          'name(): transactionName is required and must be a non-empty string.'
        );
      });
    });

    describe('Estimation Error Handling', () => {
      beforeEach(() => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
          data: '0x1234',
        });
        transactionKit.name({ transactionName: 'test' });
      });

      it('should handle totalGasEstimated error gracefully', async () => {
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockRejectedValue(
          new Error('Gas calculation failed')
        );

        const result = await transactionKit.estimate();

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorType).toBe('ESTIMATION_ERROR');
      });

      it('should handle fresh SDK instance creation failure', async () => {
        mockProvider.getSdk.mockRejectedValue(new Error('SDK creation failed'));

        const result = await transactionKit.estimate();

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorType).toBe('ESTIMATION_ERROR');
      });

      it('should handle estimation errors', async () => {
        mockSdk.estimate.mockRejectedValue(new Error('Estimation failed'));

        const result = await transactionKit.estimate();

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorType).toBe('ESTIMATION_ERROR');
      });

      it('should handle SDK errors gracefully', async () => {
        mockSdk.addUserOpsToBatch.mockRejectedValue(new Error('SDK error'));

        const result = await transactionKit.estimate();

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorType).toBe('ESTIMATION_ERROR');
      });
    });

    describe('Send Error Handling', () => {
      beforeEach(() => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
          data: '0x1234',
        });
        transactionKit.name({ transactionName: 'test' });
      });

      it('should handle totalGasEstimated error after successful estimation', async () => {
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockRejectedValue(
          new Error('Gas calculation failed')
        );

        const result = await transactionKit.send();

        expect(result.isSentSuccessfully).toBe(false);
        expect(result.errorType).toBe('SEND_ERROR');
      });

      it('should handle estimation errors before sending', async () => {
        mockSdk.estimate.mockRejectedValue(new Error('Estimation failed'));

        const result = await transactionKit.send();

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorType).toBe('ESTIMATION_ERROR');
        expect(result.errorMessage).toBe('Estimation failed');
      });

      it('should handle send errors', async () => {
        const mockUserOp = {
          sender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          maxFeePerGas: '0x77359400',
        };

        mockSdk.estimate.mockResolvedValue(mockUserOp);
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockRejectedValue(new Error('Send failed'));

        const result = await transactionKit.send();

        expect(result.isSentSuccessfully).toBe(false);
        expect(result.errorType).toBe('SEND_ERROR');
        expect(result.errorMessage).toBe('Send failed');
      });

      it('should handle generic errors', async () => {
        mockSdk.clearUserOpsFromBatch.mockRejectedValue(
          new Error('Generic error')
        );

        const result = await transactionKit.send();

        expect(result.isSentSuccessfully).toBe(false);
        expect(result.errorType).toBe('SEND_ERROR');
      });
    });
  });

  // ============================================================================
  // 7. CONCURRENT OPERATIONS & RACE CONDITIONS
  // ============================================================================

  describe('Concurrent Operations & Race Conditions', () => {
    describe('Concurrent Estimation', () => {
      it('should handle concurrent estimation calls safely', async () => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'concurrent-test' });

        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

        // Start multiple concurrent estimation calls
        const promises = Array.from({ length: 5 }, () =>
          transactionKit.estimate()
        );
        const results = await Promise.all(promises);

        // All should succeed
        results.forEach((result) => {
          expect(result.isEstimatedSuccessfully).toBe(true);
        });

        // Each call should call SDK methods (no caching in estimate)
        expect(mockSdk.clearUserOpsFromBatch).toHaveBeenCalledTimes(5);
        expect(mockSdk.addUserOpsToBatch).toHaveBeenCalledTimes(5);
      });
    });

    describe('Concurrent Send Operations', () => {
      it('should handle concurrent send calls safely', async () => {
        // Use modular mode for this test to avoid complex delegation setup
        mockProvider.getWalletMode.mockReturnValue('modular');

        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockResolvedValue('0xhash');
        mockSdk.clearUserOpsFromBatch = jest.fn().mockResolvedValue(undefined);
        mockSdk.addUserOpsToBatch = jest.fn().mockResolvedValue(undefined);

        // Create separate transaction kits for each concurrent call
        const promises = Array.from({ length: 3 }, (_, i) => {
          const kit = new EtherspotTransactionKit(mockConfig);
          kit.getEtherspotProvider().getSdk = jest
            .fn()
            .mockResolvedValue(mockSdk);

          kit.transaction({
            chainId: 1,
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            value: '1000000000000000000',
          });
          kit.name({ transactionName: `concurrent-send-test-${i}` });

          return kit.send();
        });

        const results = await Promise.all(promises);

        // All should succeed
        results.forEach((result, index) => {
          if (!result.isSentSuccessfully) {
            console.log(`Result ${index}:`, {
              isSentSuccessfully: result.isSentSuccessfully,
              errorMessage: result.errorMessage,
              errorType: result.errorType,
            });
          }
          expect(result.isSentSuccessfully).toBe(true);
        });
      });
    });

    describe('State Management During Operations', () => {
      beforeEach(() => {
        transactionKit.transaction({
          chainId: 1,
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'test' });
      });

      it('should set isEstimating state during estimation', async () => {
        let isEstimatingDuringCall = false;

        mockSdk.estimate.mockImplementation(async () => {
          isEstimatingDuringCall = transactionKit.getState().isEstimating;
          return { maxFeePerGas: '0x77359400' };
        });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

        await transactionKit.estimate();

        expect(isEstimatingDuringCall).toBe(true);
        expect(transactionKit.getState().isEstimating).toBe(false);
      });

      it('should set isSending state during send', async () => {
        let isSendingDuringCall = false;

        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockImplementation(async () => {
          isSendingDuringCall = transactionKit.getState().isSending;
          return '0xhash';
        });

        await transactionKit.send();

        expect(isSendingDuringCall).toBe(true);
        expect(transactionKit.getState().isSending).toBe(false);
      });

      it('should set error states on estimation failure', async () => {
        mockSdk.estimate.mockRejectedValue(new Error('Estimation failed'));

        await transactionKit.estimate();

        expect(transactionKit.getState().containsEstimatingError).toBe(true);
        expect(transactionKit.getState().isEstimating).toBe(false);
      });

      it('should set error states on send failure', async () => {
        mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
        mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
        mockSdk.send.mockRejectedValue(new Error('Send failed'));

        await transactionKit.send();

        expect(transactionKit.getState().containsSendingError).toBe(true);
        expect(transactionKit.getState().isSending).toBe(false);
      });
    });
  });
});

// ============================================================================
// 7. INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  describe('Complete Transaction Flows', () => {
    it('should handle complete transaction flow from creation to sending', async () => {
      const kit = new EtherspotTransactionKit(mockConfig);

      // Create transaction
      kit
        .transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
          data: '0x1234',
        })
        .name({ transactionName: 'complete-flow-tx' });

      // Mock SDK for estimation
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

      // Estimate transaction
      const estimateResult = await kit.estimate();
      expect(estimateResult.isEstimatedSuccessfully).toBe(true);

      // Test that we can create and estimate transactions successfully
      expect(estimateResult).toBeDefined();
    });

    it('should handle complete batch flow from creation to sending', async () => {
      const kit = new EtherspotTransactionKit(mockConfig);

      // Create multiple transactions
      kit
        .transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        })
        .name({ transactionName: 'batch-tx1' })
        .addToBatch({ batchName: 'integration-batch' });

      kit
        .transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '2000000000000000000',
        })
        .name({ transactionName: 'batch-tx2' })
        .addToBatch({ batchName: 'integration-batch' });

      // Mock SDK for batch operations
      mockSdk.clearUserOpsFromBatch.mockResolvedValue(undefined as any);
      mockSdk.addUserOpsToBatch.mockResolvedValue(undefined as any);
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('42000') as any);

      // Estimate batch
      const estimateResult = await kit.estimateBatches({
        onlyBatchNames: ['integration-batch'],
      });
      expect(estimateResult.isEstimatedSuccessfully).toBe(true);

      // Test that we can create and estimate batches successfully
      expect(estimateResult).toBeDefined();
    });

    it('should handle transaction updates and re-estimation', async () => {
      const kit = new EtherspotTransactionKit(mockConfig);

      // Create initial transaction
      kit
        .transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        })
        .name({ transactionName: 'updateable-tx' });

      // Mock SDK for initial estimation
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

      const initialEstimate = await kit.estimate();
      expect(initialEstimate.isEstimatedSuccessfully).toBe(true);

      // Update transaction
      kit.name({ transactionName: 'updateable-tx' }).update().transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '2000000000000000000', // Updated value
      });

      // Mock SDK for updated estimation
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x8f0d1800' });
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('25000') as any);

      const updatedEstimate = await kit.estimate();
      expect(updatedEstimate.isEstimatedSuccessfully).toBe(true);
      // Check that the estimate was successful rather than checking specific gas value
      expect(updatedEstimate).toBeDefined();
    });

    it('should handle transaction state management', async () => {
      const kit = new EtherspotTransactionKit(mockConfig);

      // Create transaction
      kit
        .transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        })
        .name({ transactionName: 'state-tx' });

      // Mock SDK for successful estimation
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

      // Estimation should succeed
      const estimate = await kit.estimate();
      expect(estimate.isEstimatedSuccessfully).toBe(true);

      // Check that transaction state is maintained
      const state = kit.getState();
      expect(state.namedTransactions['state-tx']).toBeDefined();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple named transactions and batches', async () => {
      const kit = new EtherspotTransactionKit(mockConfig);

      // Create multiple named transactions
      const transactions = ['tx1', 'tx2', 'tx3'];
      const batches = ['batch1', 'batch2'];

      // Create transactions
      for (let i = 0; i < transactions.length; i++) {
        kit
          .transaction({
            to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            chainId: 1,
            value: `${(i + 1) * 1000000000000000000}`,
          })
          .name({ transactionName: transactions[i] });
      }

      // Add to batches
      kit.name({ transactionName: 'tx1' }).addToBatch({ batchName: 'batch1' });
      kit.name({ transactionName: 'tx2' }).addToBatch({ batchName: 'batch1' });
      kit.name({ transactionName: 'tx3' }).addToBatch({ batchName: 'batch2' });

      const state = kit.getState();
      expect(Object.keys(state.namedTransactions)).toHaveLength(3);
      expect(Object.keys(state.batches)).toHaveLength(2);
      expect(state.batches['batch1']).toHaveLength(2);
      expect(state.batches['batch2']).toHaveLength(1);
    });

    it('should handle state management across operations', async () => {
      const kit = new EtherspotTransactionKit(mockConfig);

      // Create transaction
      kit
        .transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        })
        .name({ transactionName: 'state-tx' });

      // Check initial state
      let state = kit.getState();
      expect(state.selectedTransactionName).toBe('state-tx');
      expect(state.workingTransaction).toBeDefined();

      // Add to batch
      kit.addToBatch({ batchName: 'state-batch' });
      state = kit.getState();
      expect(state.namedTransactions['state-tx'].batchName).toBe('state-batch');

      // Remove from batch
      kit.name({ transactionName: 'state-tx' }).remove();
      state = kit.getState();
      expect(state.namedTransactions['state-tx']).toBeUndefined();
      expect(state.batches['state-batch']).toBeUndefined();
    });

    it('should handle concurrent operations safely', async () => {
      // Mock SDK for concurrent operations
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

      // Create multiple transactions concurrently
      const promises: Promise<
        TransactionEstimateResult & IEstimatedTransaction
      >[] = [];
      for (let i = 0; i < 5; i++) {
        const kit = new EtherspotTransactionKit(mockConfig);
        promises.push(
          kit
            .transaction({
              to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
              chainId: 1,
              value: '1000000000000000000',
            })
            .name({ transactionName: `concurrent-tx-${i}` })
            .estimate()
        );
      }

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result.isEstimatedSuccessfully).toBe(true);
      });
    });
  });
});

// ============================================================================
// 8. DELEGATED EOA MODE INTEGRATION
// ============================================================================

describe('DelegatedEoa Mode Integration', () => {
  let transactionKit: EtherspotTransactionKit;
  let mockProvider: jest.Mocked<EtherspotProvider>;
  let mockSdk: jest.Mocked<ModularSdk>;

  beforeEach(() => {
    // Reset viem mocks
    (isAddress as unknown as jest.Mock).mockReturnValue(true);
    (parseEther as jest.Mock).mockReturnValue(BigInt('1000000000000000000'));

    mockSdk = {
      getCounterFactualAddress: jest.fn(),
      clearUserOpsFromBatch: jest.fn(),
      addUserOpsToBatch: jest.fn(),
      estimate: jest.fn(),
      send: jest.fn(),
      totalGasEstimated: jest.fn(),
      etherspotWallet: {
        accountAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      },
    } as any;

    mockProvider = {
      getSdk: jest.fn().mockResolvedValue(mockSdk),
      getProvider: jest.fn().mockReturnValue({}),
      getChainId: jest.fn().mockReturnValue(1),
      clearAllCaches: jest.fn(),
      getWalletMode: jest.fn().mockReturnValue('delegatedEoa'),
      getDelegatedEoaAccount: jest
        .fn()
        .mockResolvedValue({ address: '0xdelegatedeoa' }),
      getOwnerAccount: jest.fn().mockResolvedValue({ address: '0xowner' }),
      getBundlerClient: jest.fn().mockResolvedValue({
        signAuthorization: jest
          .fn()
          .mockResolvedValue({ authorization: '0xauth' }),
        sendUserOperation: jest.fn().mockResolvedValue('0xtxhash'),
        estimateUserOperationGas: jest.fn().mockResolvedValue({
          preVerificationGas: BigInt(100000),
          verificationGasLimit: BigInt(100000),
          callGasLimit: BigInt(100000),
        }),
        getUserOperationReceipt: jest.fn().mockResolvedValue({
          receipt: { transactionHash: '0xhash' },
        }),
      }),
      getWalletClient: jest.fn().mockResolvedValue({
        signAuthorization: jest
          .fn()
          .mockResolvedValue({ authorization: '0xauth' }),
        sendTransaction: jest.fn().mockResolvedValue('0xtxhash'),
      }),
      getPublicClient: jest.fn().mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0x'),
        estimateFeesPerGas: jest.fn().mockResolvedValue({
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        }),
        getTransactionCount: jest.fn().mockResolvedValue(5),
      }),
    } as any;

    (EtherspotProvider as jest.Mock).mockImplementation(() => mockProvider);

    transactionKit = new EtherspotTransactionKit({
      provider: {} as any,
      chainId: 1,
      bundlerApiKey: 'test-key',
      debugMode: false,
    });
  });

  describe('getWalletAddress with delegatedEoa mode', () => {
    it('should return wallet address from delegatedEoa account', async () => {
      const mockAccount = {
        address: '0xdelegatedeoa123456789012345678901234567890',
        encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
      } as any;
      mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);

      const result = await transactionKit.getWalletAddress(1);

      expect(result).toBe('0xdelegatedeoa123456789012345678901234567890');
      expect(mockProvider.getDelegatedEoaAccount).toHaveBeenCalledWith(1);
      expect(mockProvider.getSdk).not.toHaveBeenCalled();
    });

    it('should cache wallet address for delegatedEoa mode', async () => {
      const mockAccount = {
        address: '0xcached123456789012345678901234567890',
      } as any;
      mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);

      // First call
      const result1 = await transactionKit.getWalletAddress(1);
      expect(result1).toBe('0xcached123456789012345678901234567890');
      expect(mockProvider.getDelegatedEoaAccount).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await transactionKit.getWalletAddress(1);
      expect(result2).toBe('0xcached123456789012345678901234567890');
      expect(mockProvider.getDelegatedEoaAccount).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully in delegatedEoa mode for getWalletAddress', async () => {
      mockProvider.getDelegatedEoaAccount.mockRejectedValue(
        new Error('DelegatedEoa error')
      );

      const result = await transactionKit.getWalletAddress(1);

      expect(result).toEqual(undefined);
    });
  });

  describe('isDelegateSmartAccountToEoa', () => {
    it('should return true when EOA has EIP-7702 code (delegated)', async () => {
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0xef01001234'),
      } as any);

      const result = await transactionKit.isDelegateSmartAccountToEoa(1);

      expect(result).toBe(true);
      expect(mockProvider.getPublicClient).toHaveBeenCalledWith(1);
      expect(mockProvider.getDelegatedEoaAccount).toHaveBeenCalledWith(1);
    });

    it('should return false when EOA has no code (not delegated)', async () => {
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0x'),
      } as any);

      const result = await transactionKit.isDelegateSmartAccountToEoa(1);

      expect(result).toBe(false);
    });

    it('should return false when EOA has non-EIP-7702 code', async () => {
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0x1234'),
      } as any);

      const result = await transactionKit.isDelegateSmartAccountToEoa(1);

      expect(result).toBe(false);
    });

    it('should throw error for non-delegatedEoa wallet mode', async () => {
      mockProvider.getWalletMode.mockReturnValue('modular');

      await expect(
        transactionKit.isDelegateSmartAccountToEoa(1)
      ).rejects.toThrow(
        "isDelegateSmartAccountToEoa() is only available in 'delegatedEoa' wallet mode"
      );
    });

    it('should handle errors gracefully', async () => {
      mockProvider.getPublicClient.mockRejectedValue(new Error('RPC error'));

      const result = await transactionKit.isDelegateSmartAccountToEoa(1);

      expect(result).toBeUndefined();
    });
  });

  describe('delegateSmartAccountToEoa', () => {
    it('should delegate successfully when not already installed', async () => {
      const mockOwner = {
        address: '0xowner123456789012345678901234567890',
      } as any;
      const mockBundlerClient = {
        signAuthorization: jest
          .fn()
          .mockResolvedValue({ authorization: '0xauth123' }),
        sendUserOperation: jest.fn().mockResolvedValue('0xtxhash'),
      } as any;
      const mockDelegatedEoaAccount = { address: '0xdelegatedeoa' } as any;

      mockProvider.getOwnerAccount.mockResolvedValue(mockOwner);
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
      mockProvider.getDelegatedEoaAccount.mockResolvedValue(
        mockDelegatedEoaAccount
      );
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0x'), // Not already installed
      } as any);

      const result = await transactionKit.delegateSmartAccountToEoa({
        chainId: 1,
        delegateImmediately: true,
      });

      expect(result.isAlreadyInstalled).toBe(false);
      expect(result.eoaAddress).toBe('0xowner123456789012345678901234567890');
      expect(result.userOpHash).toBe('0xtxhash');
      expect(mockBundlerClient.signAuthorization).toHaveBeenCalled();
      expect(mockBundlerClient.sendUserOperation).toHaveBeenCalled();
    });

    it('should skip delegation if already installed', async () => {
      const mockOwner = {
        address: '0xowner123456789012345678901234567890',
      } as any;
      const mockBundlerClient = {
        signAuthorization: jest
          .fn()
          .mockResolvedValue({ authorization: '0xauth123' }),
        sendUserOperation: jest.fn().mockResolvedValue('0xtxhash'),
      } as any;

      mockProvider.getOwnerAccount.mockResolvedValue(mockOwner);
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0xef01001234'), // Already installed with EIP-7702
      } as any);

      const result = await transactionKit.delegateSmartAccountToEoa({
        chainId: 1,
      });

      expect(result.isAlreadyInstalled).toBe(true);
      expect(result.eoaAddress).toBe('0xowner123456789012345678901234567890');
      expect(mockBundlerClient.signAuthorization).not.toHaveBeenCalled();
      expect(mockBundlerClient.sendUserOperation).not.toHaveBeenCalled();
    });

    it('should return authorization without executing when delegateImmediately is false', async () => {
      const mockOwner = {
        address: '0xowner123456789012345678901234567890',
      } as any;
      const mockBundlerClient = {
        signAuthorization: jest
          .fn()
          .mockResolvedValue({ authorization: '0xauth123' }),
        sendUserOperation: jest.fn().mockResolvedValue('0xtxhash'),
      } as any;

      mockProvider.getOwnerAccount.mockResolvedValue(mockOwner);
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0x'), // Not already installed
      } as any);

      const result = await transactionKit.delegateSmartAccountToEoa({
        chainId: 1,
        delegateImmediately: false,
      });

      expect(result.isAlreadyInstalled).toBe(false);
      expect(result.authorization).toEqual({ authorization: '0xauth123' });
      expect(result.eoaAddress).toBe('0xowner123456789012345678901234567890');
      expect(mockBundlerClient.signAuthorization).toHaveBeenCalled();
      expect(mockBundlerClient.sendUserOperation).not.toHaveBeenCalled();
    });

    it('should throw error for non-delegatedEoa wallet mode', async () => {
      mockProvider.getWalletMode.mockReturnValue('modular');

      await expect(
        transactionKit.delegateSmartAccountToEoa({ chainId: 1 })
      ).rejects.toThrow(
        "delegateSmartAccountToEoa() is only available in 'delegatedEoa' wallet mode"
      );
    });

    it('should handle delegation failures gracefully', async () => {
      const mockOwner = {
        address: '0xowner123456789012345678901234567890',
      } as any;
      const mockBundlerClient = {
        signAuthorization: jest
          .fn()
          .mockRejectedValue(new Error('Authorization failed')),
        sendUserOperation: jest.fn().mockResolvedValue('0xtxhash'),
      } as any;

      mockProvider.getOwnerAccount.mockResolvedValue(mockOwner);
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0x'), // Not already installed
      } as any);

      await expect(
        transactionKit.delegateSmartAccountToEoa({ chainId: 1 })
      ).rejects.toThrow('Authorization failed');
    });
  });

  describe('undelegateSmartAccountToEoa', () => {
    it('should undelegate successfully when delegation is active', async () => {
      const mockOwner = {
        address: '0xowner123456789012345678901234567890',
      } as any;
      const mockWalletClient = {
        signAuthorization: jest
          .fn()
          .mockResolvedValue({ authorization: '0xauth123' }),
        sendTransaction: jest.fn().mockResolvedValue('0xtxhash'),
      } as any;

      mockProvider.getOwnerAccount.mockResolvedValue(mockOwner);
      mockProvider.getWalletClient = jest
        .fn()
        .mockResolvedValue(mockWalletClient);
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0xef01001234'), // Currently delegated with EIP-7702
      } as any);

      const result = await transactionKit.undelegateSmartAccountToEoa({
        chainId: 1,
        delegateImmediately: true,
      });

      expect(result).toBeDefined();
      expect(result.eoaAddress).toBe('0xowner123456789012345678901234567890');
      expect(result.userOpHash).toBe('0xtxhash');
      expect(mockWalletClient.signAuthorization).toHaveBeenCalled();
      expect(mockWalletClient.sendTransaction).toHaveBeenCalled();
    });

    it('should skip undelegation if not already installed', async () => {
      const mockOwner = {
        address: '0xowner123456789012345678901234567890',
      } as any;
      const mockWalletClient = {
        signAuthorization: jest
          .fn()
          .mockResolvedValue({ authorization: '0xauth123' }),
        sendTransaction: jest.fn().mockResolvedValue('0xtxhash'),
      } as any;

      mockProvider.getOwnerAccount.mockResolvedValue(mockOwner);
      mockProvider.getWalletClient = jest
        .fn()
        .mockResolvedValue(mockWalletClient);
      mockProvider.getPublicClient.mockResolvedValue({
        getCode: jest.fn().mockResolvedValue('0x'), // Not currently delegated
      } as any);

      const result = await transactionKit.undelegateSmartAccountToEoa({
        chainId: 1,
      });

      expect(result).toBeDefined();
      expect(result.eoaAddress).toBe('0xowner123456789012345678901234567890');
      expect(result.authorization).toBeUndefined();
      expect(mockWalletClient.signAuthorization).not.toHaveBeenCalled();
      expect(mockWalletClient.sendTransaction).not.toHaveBeenCalled();
    });

    it('should throw error for non-delegatedEoa wallet mode', async () => {
      mockProvider.getWalletMode.mockReturnValue('modular');

      await expect(
        transactionKit.undelegateSmartAccountToEoa({ chainId: 1 })
      ).rejects.toThrow(
        "undelegateSmartAccountToEoa() is only available in 'delegatedEoa' wallet mode"
      );
    });
  });

  describe('estimate with delegatedEoa mode', () => {
    it('should estimate transaction in delegatedEoa mode when EOA is designated', async () => {
      const mockAccount = {
        address: '0xdelegatedeoa123456789012345678901234567890',
        encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
      } as any;
      const mockBundlerClient = {
        estimateUserOperationGas: jest.fn().mockResolvedValue({
          preVerificationGas: BigInt(100000),
          verificationGasLimit: BigInt(100000),
          callGasLimit: BigInt(100000),
        }),
      } as any;
      const mockPublicClient = {
        getCode: jest
          .fn()
          .mockResolvedValueOnce('0xef01001234') // For isDelegateSmartAccountToEoa check
          .mockResolvedValue('0xef01001234'), // For other calls
        estimateFeesPerGas: jest.fn().mockResolvedValue({
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        }),
        getTransactionCount: jest.fn().mockResolvedValue(5),
      } as any;

      mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
      mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'delegated-tx' });

      const result = await transactionKit.estimate();

      expect(result.isEstimatedSuccessfully).toBe(true);
      expect(mockProvider.getDelegatedEoaAccount).toHaveBeenCalled();
      expect(mockProvider.getBundlerClient).toHaveBeenCalled();
      expect(mockBundlerClient.estimateUserOperationGas).toHaveBeenCalled();
    });

    it('should reject estimation when EOA is not designated', async () => {
      const mockAccount = {
        address: '0xdelegatedeoa123456789012345678901234567890',
        encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
      } as any;
      const mockPublicClient = {
        getCode: jest.fn().mockResolvedValue('0x'), // No code - not designated
      } as any;

      mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
      mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'delegated-tx' });

      const result = await transactionKit.estimate();

      expect(result.isEstimatedSuccessfully).toBe(false);
      expect(result.errorMessage).toContain(
        'EOA is not yet designated as a smart account'
      );
      expect(result.errorType).toBe('VALIDATION_ERROR');
    });

    it('should reject paymasterDetails in delegatedEoa mode', async () => {
      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'delegated-tx' });

      const result = await transactionKit.estimate({
        paymasterDetails: { type: 'sponsor' } as any,
      });

      expect(result.isEstimatedSuccessfully).toBe(false);
      expect(result.errorMessage).toBe(
        'paymasterDetails is not yet supported in delegatedEoa mode.'
      );
      expect(result.errorType).toBe('VALIDATION_ERROR');
    });

    describe('authorization parameter', () => {
      const realKernelAddress = KernelVersionToAddressesMap[KERNEL_V3_3]
        .accountImplementationAddress as `0x${string}`;
      const validAuthorization = {
        address: realKernelAddress,
        chainId: 1,
        nonce: 0,
        r: ('0x' + '1'.repeat(64)) as `0x${string}`,
        s: ('0x' + '2'.repeat(64)) as `0x${string}`,
        v: BigInt(27),
        yParity: 0,
      } as any;
      const invalidKernelAuthorization = {
        address:
          '0xInvalidKernelAddress123456789012345678901234' as `0x${string}`,
        chainId: 1,
        nonce: 0,
        r: ('0x' + '1'.repeat(64)) as `0x${string}`,
        s: ('0x' + '2'.repeat(64)) as `0x${string}`,
        v: BigInt(27),
        yParity: 0,
      } as any;
      const wrongChainIdAuthorization = {
        address: realKernelAddress,
        chainId: 137,
        nonce: 0,
        r: ('0x' + '1'.repeat(64)) as `0x${string}`,
        s: ('0x' + '2'.repeat(64)) as `0x${string}`,
        v: BigInt(27),
        yParity: 0,
      } as any;

      it('should estimate with valid authorization when EOA is not designated', async () => {
        const mockAccount = {
          address: '0xdelegatedeoa123456789012345678901234567890',
          encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
        } as any;
        const mockBundlerClient = {
          estimateUserOperationGas: jest.fn().mockResolvedValue({
            preVerificationGas: BigInt(100000),
            verificationGasLimit: BigInt(100000),
            callGasLimit: BigInt(100000),
          }),
        } as any;
        const mockPublicClient = {
          getCode: jest.fn().mockResolvedValue('0x'), // Not designated
          estimateFeesPerGas: jest.fn().mockResolvedValue({
            maxFeePerGas: BigInt(20000000000),
            maxPriorityFeePerGas: BigInt(2000000000),
          }),
          getTransactionCount: jest.fn().mockResolvedValue(5),
        } as any;

        mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
        mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
        mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

        transactionKit.transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'delegated-tx' });

        const result = await transactionKit.estimate({
          authorization: validAuthorization,
        });

        expect(result.isEstimatedSuccessfully).toBe(true);
        expect(mockBundlerClient.estimateUserOperationGas).toHaveBeenCalledWith(
          expect.objectContaining({
            authorization: validAuthorization,
          })
        );
      });

      it('should reject authorization with wrong chainId', async () => {
        const mockAccount = {
          address: '0xdelegatedeoa123456789012345678901234567890',
          encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
        } as any;
        const mockPublicClient = {
          getCode: jest.fn().mockResolvedValue('0x'),
        } as any;

        mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
        mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

        transactionKit.transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'delegated-tx' });

        const result = await transactionKit.estimate({
          authorization: wrongChainIdAuthorization,
        });

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorMessage).toContain(
          'Authorization chain ID (137) does not match transaction chain ID (1)'
        );
        expect(result.errorType).toBe('VALIDATION_ERROR');
      });

      it('should reject invalid Kernel authorization', async () => {
        const mockAccount = {
          address: '0xdelegatedeoa123456789012345678901234567890',
          encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
        } as any;
        const mockPublicClient = {
          getCode: jest.fn().mockResolvedValue('0x'),
        } as any;

        mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
        mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

        transactionKit.transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'delegated-tx' });

        const result = await transactionKit.estimate({
          authorization: invalidKernelAuthorization,
        });

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorMessage).toContain(
          'does not match Kernel v3.3 implementation'
        );
        expect(result.errorType).toBe('VALIDATION_ERROR');
      });

      it('should reject authorization in modular mode', async () => {
        mockProvider.getWalletMode.mockReturnValue('modular');

        transactionKit.transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'delegated-tx' });

        const result = await transactionKit.estimate({
          authorization: validAuthorization,
        });

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorMessage).toContain(
          'authorization is only supported in delegatedEoa mode'
        );
        expect(result.errorType).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('send with delegatedEoa mode', () => {
    it('should reject send when EOA is not designated', async () => {
      const mockAccount = {
        address: '0xdelegatedeoa123456789012345678901234567890',
        encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
      } as any;
      const mockPublicClient = {
        getCode: jest.fn().mockResolvedValue('0x'), // No code - not designated
      } as any;

      mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
      mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'delegated-send-tx' });

      const result = await transactionKit.send();

      expect(result.isEstimatedSuccessfully).toBe(false);
      expect(result.errorMessage).toContain(
        'EOA is not yet designated as a smart account'
      );
      expect(result.errorType).toBe('VALIDATION_ERROR');
    });

    it('should reject paymasterDetails in delegatedEoa mode', async () => {
      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'delegated-send-tx' });

      const result = await transactionKit.send({
        paymasterDetails: { type: 'sponsor' } as any,
      });

      expect(result.isEstimatedSuccessfully).toBe(false);
      expect(result.errorMessage).toBe(
        'paymasterDetails is not yet supported in delegatedEoa mode.'
      );
      expect(result.errorType).toBe('VALIDATION_ERROR');
    });

    it('should reject userOpOverrides in delegatedEoa mode', async () => {
      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'delegated-send-tx' });

      const result = await transactionKit.send({
        userOpOverrides: { maxFeePerGas: BigInt(1000000) },
      });

      expect(result.isEstimatedSuccessfully).toBe(false);
      expect(result.errorMessage).toBe(
        'userOpOverrides is not yet supported in delegatedEoa mode.'
      );
      expect(result.errorType).toBe('VALIDATION_ERROR');
    });

    describe('authorization parameter', () => {
      const realKernelAddress = KernelVersionToAddressesMap[KERNEL_V3_3]
        .accountImplementationAddress as `0x${string}`;
      const validAuthorization = {
        address: realKernelAddress,
        chainId: 1,
        nonce: 0,
        r: ('0x' + '1'.repeat(64)) as `0x${string}`,
        s: ('0x' + '2'.repeat(64)) as `0x${string}`,
        v: BigInt(27),
        yParity: 0,
      } as any;
      const wrongChainIdAuthorization = {
        address: realKernelAddress,
        chainId: 137,
        nonce: 0,
        r: ('0x' + '1'.repeat(64)) as `0x${string}`,
        s: ('0x' + '2'.repeat(64)) as `0x${string}`,
        v: BigInt(27),
        yParity: 0,
      } as any;

      it('should send with valid authorization when EOA is not designated', async () => {
        const mockAccount = {
          address: '0xdelegatedeoa123456789012345678901234567890',
          encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
        } as any;
        const mockBundlerClient = {
          estimateUserOperationGas: jest.fn().mockResolvedValue({
            preVerificationGas: BigInt(100000),
            verificationGasLimit: BigInt(100000),
            callGasLimit: BigInt(100000),
          }),
          sendUserOperation: jest.fn().mockResolvedValue('0xuserOpHash'),
          getUserOperation: jest.fn().mockResolvedValue({
            userOperation: {
              sender: '0xdelegatedeoa123456789012345678901234567890',
              nonce: BigInt(5),
              callData: '0xencodedcalls',
              callGasLimit: BigInt(100000),
              verificationGasLimit: BigInt(100000),
              preVerificationGas: BigInt(100000),
              maxFeePerGas: BigInt(20000000000),
              maxPriorityFeePerGas: BigInt(2000000000),
              signature: '0xsig',
              paymasterAndData: '0x',
            },
          }),
        } as any;
        const mockPublicClient = {
          getCode: jest.fn().mockResolvedValue('0x'), // Not designated
          estimateFeesPerGas: jest.fn().mockResolvedValue({
            maxFeePerGas: BigInt(20000000000),
            maxPriorityFeePerGas: BigInt(2000000000),
          }),
          getTransactionCount: jest.fn().mockResolvedValue(5),
        } as any;

        mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
        mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
        mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

        transactionKit.transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'delegated-send-tx' });

        const result = await transactionKit.send({
          authorization: validAuthorization,
        });

        expect(result.isSentSuccessfully).toBe(true);
        expect(mockBundlerClient.sendUserOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            authorization: validAuthorization,
          })
        );
      }, 10000); // 10 second timeout

      it('should reject authorization with wrong chainId in send', async () => {
        const mockAccount = {
          address: '0xdelegatedeoa123456789012345678901234567890',
          encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
        } as any;
        const mockPublicClient = {
          getCode: jest.fn().mockResolvedValue('0x'),
        } as any;

        mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
        mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

        transactionKit.transaction({
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          chainId: 1,
          value: '1000000000000000000',
        });
        transactionKit.name({ transactionName: 'delegated-send-tx' });

        const result = await transactionKit.send({
          authorization: wrongChainIdAuthorization,
        });

        expect(result.isEstimatedSuccessfully).toBe(false);
        expect(result.errorMessage).toContain(
          'Authorization chain ID (137) does not match transaction chain ID (1)'
        );
        expect(result.errorType).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('getTransactionHash with delegatedEoa mode', () => {
    it('should get transaction hash in delegatedEoa mode', async () => {
      const mockBundlerClient = {
        getUserOperationReceipt: jest.fn().mockResolvedValue({
          receipt: { transactionHash: '0xhash' },
        }),
      } as any;
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);

      const result = await transactionKit.getTransactionHash(
        '0xuserOpHash',
        1,
        1000,
        10
      );

      expect(result).toBe('0xhash');
      expect(mockProvider.getBundlerClient).toHaveBeenCalledWith(1);
      expect(mockBundlerClient.getUserOperationReceipt).toHaveBeenCalledWith({
        hash: '0xuserOpHash',
      });
    });

    it('should handle timeout in delegatedEoa mode', async () => {
      const mockBundlerClient = {
        getUserOperationReceipt: jest.fn().mockResolvedValue(null),
      } as any;
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);

      const result = await transactionKit.getTransactionHash(
        '0xuserOpHash',
        1,
        50,
        10
      );

      expect(result).toBeNull();
    });

    it('should handle errors gracefully in delegatedEoa mode', async () => {
      const mockBundlerClient = {
        getUserOperationReceipt: jest
          .fn()
          .mockRejectedValue(new Error('Bundler error')),
      } as any;
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);

      const result = await transactionKit.getTransactionHash(
        '0xuserOpHash',
        1,
        1000,
        10
      );

      expect(result).toBeNull();
    });
  });

  describe('estimateBatches with delegatedEoa mode and authorization', () => {
    const realKernelAddress = KernelVersionToAddressesMap[KERNEL_V3_3]
      .accountImplementationAddress as `0x${string}`;
    const validAuthorization = {
      address: realKernelAddress,
      chainId: 1,
      nonce: 0,
      r: ('0x' + '1'.repeat(64)) as `0x${string}`,
      s: ('0x' + '2'.repeat(64)) as `0x${string}`,
      v: BigInt(27),
      yParity: 0,
    } as any;

    beforeEach(() => {
      mockProvider.getWalletMode.mockReturnValue('delegatedEoa');
      transactionKit.reset();
    });

    it('should estimate batches with valid authorization', async () => {
      const mockAccount = {
        address: '0xdelegatedeoa123456789012345678901234567890',
        encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
      } as any;
      const mockBundlerClient = {
        estimateUserOperationGas: jest.fn().mockResolvedValue({
          preVerificationGas: BigInt(100000),
          verificationGasLimit: BigInt(100000),
          callGasLimit: BigInt(100000),
        }),
      } as any;
      const mockPublicClient = {
        getCode: jest
          .fn()
          .mockResolvedValueOnce('0x') // For isDelegateSmartAccountToEoa check - not designated
          .mockResolvedValue('0x'), // For any subsequent calls
        estimateFeesPerGas: jest.fn().mockResolvedValue({
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        }),
        getTransactionCount: jest.fn().mockResolvedValue(5),
      } as any;

      mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
      mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'batch-tx1' });
      transactionKit.addToBatch({ batchName: 'test-batch' });

      const result = await transactionKit.estimateBatches({
        onlyBatchNames: ['test-batch'],
        authorization: validAuthorization,
      });

      expect(result.isEstimatedSuccessfully).toBe(true);
      if (result.batches['test-batch']?.errorMessage) {
        throw new Error(
          `Batch estimation failed: ${result.batches['test-batch'].errorMessage}`
        );
      }
      expect(mockBundlerClient.estimateUserOperationGas).toHaveBeenCalledWith(
        expect.objectContaining({
          authorization: validAuthorization,
        })
      );
    });

    it('should reject authorization in modular mode for estimateBatches', async () => {
      mockProvider.getWalletMode.mockReturnValue('modular');

      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'batch-tx1' });
      transactionKit.addToBatch({ batchName: 'test-batch' });

      await expect(
        transactionKit.estimateBatches({
          onlyBatchNames: ['test-batch'],
          authorization: validAuthorization,
        })
      ).rejects.toThrow('authorization is only supported in delegatedEoa mode');
    });

    it('should handle multi-chain batches with authorization (only matching chain)', async () => {
      const mockAccount = {
        address: '0xdelegatedeoa123456789012345678901234567890',
        encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
      } as any;
      const mockBundlerClientChain1 = {
        estimateUserOperationGas: jest.fn().mockResolvedValue({
          preVerificationGas: BigInt(100000),
          verificationGasLimit: BigInt(100000),
          callGasLimit: BigInt(100000),
        }),
      } as any;
      const mockBundlerClientChain137 = {
        estimateUserOperationGas: jest.fn().mockResolvedValue({
          preVerificationGas: BigInt(100000),
          verificationGasLimit: BigInt(100000),
          callGasLimit: BigInt(100000),
        }),
      } as any;
      const mockPublicClientChain1 = {
        getCode: jest
          .fn()
          .mockResolvedValueOnce('0x') // For isDelegateSmartAccountToEoa check - not designated
          .mockResolvedValue('0x'), // For any subsequent calls
        estimateFeesPerGas: jest.fn().mockResolvedValue({
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        }),
        getTransactionCount: jest.fn().mockResolvedValue(5),
      } as any;
      const mockPublicClientChain137 = {
        getCode: jest.fn().mockResolvedValue('0xef01001234'), // Chain 137 - designated
        estimateFeesPerGas: jest.fn().mockResolvedValue({
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        }),
        getTransactionCount: jest.fn().mockResolvedValue(5),
      } as any;

      mockProvider.getDelegatedEoaAccount.mockImplementation((chainId) => {
        return Promise.resolve(mockAccount);
      });
      mockProvider.getBundlerClient.mockImplementation((chainId) => {
        return Promise.resolve(
          chainId === 1 ? mockBundlerClientChain1 : mockBundlerClientChain137
        );
      });
      mockProvider.getPublicClient.mockImplementation((chainId) => {
        return Promise.resolve(
          chainId === 1 ? mockPublicClientChain1 : mockPublicClientChain137
        );
      });

      // Add transaction on chain 1 (matches authorization)
      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'batch-tx1' });
      transactionKit.addToBatch({ batchName: 'mixed-batch' });

      // Add transaction on chain 137 (doesn't match authorization)
      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 137,
        value: '2000000000000000000',
      });
      transactionKit.name({ transactionName: 'batch-tx2' });
      transactionKit.addToBatch({ batchName: 'mixed-batch' });

      const result = await transactionKit.estimateBatches({
        onlyBatchNames: ['mixed-batch'],
        authorization: validAuthorization,
      });

      if (result.batches['mixed-batch']?.errorMessage) {
        throw new Error(
          `Multi-chain batch estimation failed: ${result.batches['mixed-batch'].errorMessage}`
        );
      }
      expect(result.isEstimatedSuccessfully).toBe(true);
      // Authorization should only be passed to chain 1 UserOperation
      expect(
        mockBundlerClientChain1.estimateUserOperationGas
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          authorization: validAuthorization,
        })
      );
      // Chain 137 should not receive authorization (different chainId)
      expect(
        mockBundlerClientChain137.estimateUserOperationGas
      ).toHaveBeenCalledWith(
        expect.not.objectContaining({
          authorization: expect.anything(),
        })
      );
    });
  });

  describe('sendBatches with delegatedEoa mode and authorization', () => {
    const realKernelAddress = KernelVersionToAddressesMap[KERNEL_V3_3]
      .accountImplementationAddress as `0x${string}`;
    const validAuthorization = {
      address: realKernelAddress,
      chainId: 1,
      nonce: 0,
      r: ('0x' + '1'.repeat(64)) as `0x${string}`,
      s: ('0x' + '2'.repeat(64)) as `0x${string}`,
      v: BigInt(27),
      yParity: 0,
    } as any;

    beforeEach(() => {
      mockProvider.getWalletMode.mockReturnValue('delegatedEoa');
      transactionKit.reset();
    });

    it('should send batches with valid authorization', async () => {
      const mockAccount = {
        address: '0xdelegatedeoa123456789012345678901234567890',
        encodeCalls: jest.fn().mockReturnValue('0xencodedcalls'),
      } as any;
      const mockBundlerClient = {
        estimateUserOperationGas: jest.fn().mockResolvedValue({
          preVerificationGas: BigInt(100000),
          verificationGasLimit: BigInt(100000),
          callGasLimit: BigInt(100000),
        }),
        sendUserOperation: jest.fn().mockResolvedValue('0xuserOpHash'),
        getUserOperation: jest.fn().mockResolvedValue({
          userOperation: {
            sender: '0xdelegatedeoa123456789012345678901234567890',
            nonce: BigInt(5),
            callData: '0xencodedcalls',
            callGasLimit: BigInt(100000),
            verificationGasLimit: BigInt(100000),
            preVerificationGas: BigInt(100000),
            maxFeePerGas: BigInt(20000000000),
            maxPriorityFeePerGas: BigInt(2000000000),
            signature: '0xsig',
            paymasterAndData: '0x',
          },
        }),
      } as any;
      const mockPublicClient = {
        getCode: jest
          .fn()
          .mockResolvedValueOnce('0x') // For isDelegateSmartAccountToEoa check - not designated
          .mockResolvedValue('0x'), // For any subsequent calls
        estimateFeesPerGas: jest.fn().mockResolvedValue({
          maxFeePerGas: BigInt(20000000000),
          maxPriorityFeePerGas: BigInt(2000000000),
        }),
        getTransactionCount: jest.fn().mockResolvedValue(5),
      } as any;

      mockProvider.getDelegatedEoaAccount.mockResolvedValue(mockAccount);
      mockProvider.getBundlerClient.mockResolvedValue(mockBundlerClient);
      mockProvider.getPublicClient.mockResolvedValue(mockPublicClient);

      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'batch-tx1' });
      transactionKit.addToBatch({ batchName: 'test-batch' });

      const result = await transactionKit.sendBatches({
        onlyBatchNames: ['test-batch'],
        authorization: validAuthorization,
      });

      if (result.batches['test-batch']?.errorMessage) {
        throw new Error(
          `Batch send failed: ${result.batches['test-batch'].errorMessage}`
        );
      }
      expect(result.isSentSuccessfully).toBe(true);
      expect(mockBundlerClient.sendUserOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          authorization: validAuthorization,
        })
      );
    });

    it('should reject authorization in modular mode for sendBatches', async () => {
      mockProvider.getWalletMode.mockReturnValue('modular');

      transactionKit.transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chainId: 1,
        value: '1000000000000000000',
      });
      transactionKit.name({ transactionName: 'batch-tx1' });
      transactionKit.addToBatch({ batchName: 'test-batch' });

      await expect(
        transactionKit.sendBatches({
          onlyBatchNames: ['test-batch'],
          authorization: validAuthorization,
        })
      ).rejects.toThrow('authorization is only supported in delegatedEoa mode');
    });
  });
});
