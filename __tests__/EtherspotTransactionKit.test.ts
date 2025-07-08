import { ModularSdk, PaymasterApi } from '@etherspot/modular-sdk';
import { isAddress, parseEther } from 'viem';
import { EtherspotProvider } from '../src/TransactionKit/EtherspotProvider';
import { EtherspotUtils } from '../src/TransactionKit/EtherspotUtils';
import {
  EtherspotTransactionKit,
  TransactionKit,
} from '../src/TransactionKit/TransactionKit';

// Mock dependencies
jest.mock('../src/TransactionKit/EtherspotProvider');
jest.mock('../src/TransactionKit/EtherspotUtils');
jest.mock('@etherspot/modular-sdk');
jest.mock('viem', () => ({
  isAddress: jest.fn(),
  parseEther: jest.fn(),
}));

describe('EtherspotTransactionKit', () => {
  let transactionKit: EtherspotTransactionKit;
  let mockProvider: jest.Mocked<EtherspotProvider>;
  let mockSdk: jest.Mocked<ModularSdk>;
  let mockWeb3Provider: any;

  const mockConfig = {
    provider: {} as any,
    chainId: 1,
    dataApiKey: 'test-data-key',
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
        accountAddress: '0x1234567890123456789012345678901234567890',
      },
    } as any;

    // Mock EtherspotProvider
    mockProvider = {
      getSdk: jest.fn().mockResolvedValue(mockSdk),
      getProvider: jest.fn().mockReturnValue(mockWeb3Provider),
      getChainId: jest.fn().mockReturnValue(1),
      clearAllCaches: jest.fn(),
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

  describe('Constructor', () => {
    it('should initialize with config', () => {
      expect(EtherspotProvider).toHaveBeenCalledWith(mockConfig);
      expect(transactionKit.getProvider()).toBe(mockProvider);
    });

    it('should set debug mode from config', () => {
      const debugConfig = { ...mockConfig, debugMode: true };
      const debugKit = new EtherspotTransactionKit(debugConfig);
      expect(debugKit).toBeDefined();
    });
  });

  describe('getWalletAddress', () => {
    it('should return wallet address', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      mockSdk.getCounterFactualAddress.mockResolvedValue(walletAddress);

      const callWalletAddress = await transactionKit.getWalletAddress(1);

      expect(callWalletAddress).toBe(walletAddress);
      expect(mockProvider.getSdk).toHaveBeenCalledTimes(1);
    });

    it('should fallback to getCounterFactualAddress if SDK state fails', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
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
      const walletAddress = '0x1234567890123456789012345678901234567890';
      mockSdk.getCounterFactualAddress.mockResolvedValue(walletAddress);

      await transactionKit.getWalletAddress(chainId);

      expect(mockProvider.getSdk).toHaveBeenCalledWith(chainId);
    });

    it('should cache wallet address and return from cache on subsequent calls', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
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

  describe('nativeAmount', () => {
    it('should set native amount correctly', () => {
      const amount = 1.5;
      const chainId = 1;

      const result = transactionKit.nativeAmount({ amount, chainId });

      expect(parseEther).toHaveBeenCalledWith('1.5');
      expect(result).toBe(transactionKit);
      expect(transactionKit.getState().currentTransaction.chainId).toBe(
        chainId
      );
    });

    it('should use default chainId if not provided', () => {
      const amount = 1;

      transactionKit.nativeAmount({ amount });

      expect(transactionKit.getState().currentTransaction.chainId).toBe(1);
    });

    it('should throw error for invalid amount type', () => {
      expect(() => {
        transactionKit.nativeAmount({ amount: 'invalid' as any });
      }).toThrow('nativeAmount(): amount must be a valid number.');
    });

    it('should throw error for NaN amount', () => {
      expect(() => {
        transactionKit.nativeAmount({ amount: NaN });
      }).toThrow('nativeAmount(): amount must be a valid number.');
    });

    it('should throw error for zero or negative amount', () => {
      expect(() => {
        transactionKit.nativeAmount({ amount: 0 });
      }).toThrow('nativeAmount(): amount must be greater than 0.');

      expect(() => {
        transactionKit.nativeAmount({ amount: -1 });
      }).toThrow('nativeAmount(): amount must be greater than 0.');
    });

    it('should reset state when called', () => {
      // Set up some state first
      transactionKit.nativeAmount({ amount: 1 });
      transactionKit.to({
        address: '0x1234567890123456789012345678901234567890',
      });

      expect(transactionKit.getState().hasValidTransaction).toBe(true);

      // Call nativeAmount again
      transactionKit.nativeAmount({ amount: 2 });

      expect(transactionKit.getState().hasValidTransaction).toBe(false);
    });
  });

  describe('to', () => {
    beforeEach(() => {
      transactionKit.nativeAmount({ amount: 1 });
    });

    it('should set destination address correctly', () => {
      const address = '0x1234567890123456789012345678901234567890';

      const result = transactionKit.to({ address });

      expect(result).toBe(transactionKit);
      expect(transactionKit.getState().currentTransaction.to).toBe(address);
      expect(transactionKit.getState().hasValidTransaction).toBe(true);
    });

    it('should throw error for empty address', () => {
      expect(() => {
        transactionKit.to({ address: '' });
      }).toThrow('to(): address is required.');
    });

    it('should throw error for invalid address', () => {
      (isAddress as unknown as jest.Mock).mockReturnValue(false);
      const invalidAddress = 'invalid-address';

      expect(() => {
        transactionKit.to({ address: invalidAddress });
      }).toThrow(`to(): '${invalidAddress}' is not a valid address.`);
    });
  });

  describe('transaction', () => {
    it('should create transaction with all parameters', () => {
      const txParams = {
        chainId: 1,
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        data: '0x1234',
      };

      const result = transactionKit.transaction(txParams);

      expect(result).toBe(transactionKit);
      expect(transactionKit.getState().currentTransaction).toEqual(txParams);
      expect(transactionKit.getState().hasValidTransaction).toBe(true);
    });

    it('should use default values for optional parameters', () => {
      const txParams = {
        to: '0x1234567890123456789012345678901234567890',
      };

      transactionKit.transaction(txParams);

      const state = transactionKit.getState().currentTransaction;
      expect(state.chainId).toBe(1);
      expect(state.value).toBe('0');
      expect(state.data).toBe('0x');
    });

    it('should throw error for missing to address', () => {
      expect(() => {
        transactionKit.transaction({ to: '' });
      }).toThrow('transaction(): to is required.');
    });

    it('should throw error for invalid to address', () => {
      (isAddress as unknown as jest.Mock).mockReturnValue(false);

      expect(() => {
        transactionKit.transaction({ to: 'invalid-address' });
      }).toThrow(`transaction(): 'invalid-address' is not a valid address.`);
    });

    it('should throw error for invalid chainId', () => {
      expect(() => {
        transactionKit.transaction({
          to: '0x1234567890123456789012345678901234567890',
          chainId: 1.5,
        });
      }).toThrow('transaction(): chainId must be a valid number.');
    });

    it('should throw error for invalid value', () => {
      expect(() => {
        transactionKit.transaction({
          to: '0x1234567890123456789012345678901234567890',
          value: 'invalid',
        });
      }).toThrow(
        'transaction(): value must be a non-negative bigint or numeric string.'
      );
    });

    it('should throw error for negative value', () => {
      expect(() => {
        transactionKit.transaction({
          to: '0x1234567890123456789012345678901234567890',
          value: '-1',
        });
      }).toThrow(
        'transaction(): value must be a non-negative bigint or numeric string.'
      );
    });

    it('should accept bigint value', () => {
      const txParams = {
        to: '0x1234567890123456789012345678901234567890',
        value: BigInt(1000),
      };

      transactionKit.transaction(txParams);

      expect(transactionKit.getState().currentTransaction.value).toBe(
        BigInt(1000)
      );
    });
  });

  describe('name', () => {
    beforeEach(() => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
      });
    });

    it('should name transaction correctly', () => {
      const transactionName = 'test-transaction';

      const result = transactionKit.name({ transactionName });

      expect(result).toBe(transactionKit);
      expect(transactionKit.getState().currentTransaction.transactionName).toBe(
        transactionName
      );
    });

    it('should throw error if no valid transaction', () => {
      const emptyKit = new EtherspotTransactionKit(mockConfig);

      expect(() => {
        emptyKit.name({ transactionName: 'test' });
      }).toThrow(
        'name(): Cannot name transaction. Call transaction() or nativeAmount().to() first.'
      );
    });

    it('should throw error for empty transaction name', () => {
      expect(() => {
        transactionKit.name({ transactionName: '' });
      }).toThrow(
        'name(): transactionName is required and must be a non-empty string.'
      );
    });

    it('should throw error for whitespace-only transaction name', () => {
      expect(() => {
        transactionKit.name({ transactionName: '   ' });
      }).toThrow(
        'name(): transactionName is required and must be a non-empty string.'
      );
    });

    it('should throw error for non-string transaction name', () => {
      expect(() => {
        transactionKit.name({ transactionName: 123 as any });
      }).toThrow(
        'name(): transactionName is required and must be a non-empty string.'
      );
    });
  });

  describe('remove', () => {
    it('should remove named transaction', () => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
      });
      transactionKit.name({ transactionName: 'test' });

      expect(transactionKit.getState().hasValidTransaction).toBe(true);

      transactionKit.remove();

      expect(transactionKit.getState().hasValidTransaction).toBe(false);
      expect(transactionKit.getState().currentTransaction).toEqual({});
    });

    it('should throw error if no named transaction', () => {
      expect(() => {
        transactionKit.remove();
      }).toThrow(
        'remove(): No named transaction to remove. Call name() first.'
      );
    });

    it('should throw error if transaction not named', () => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
      });

      expect(() => {
        transactionKit.remove();
      }).toThrow(
        'remove(): No named transaction to remove. Call name() first.'
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
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
        'update(): No named transaction to update. Call name() first.'
      );
    });
  });

  describe('estimate', () => {
    beforeEach(() => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        data: '0x1234',
      });
      transactionKit.name({ transactionName: 'test' });
    });

    it('should estimate transaction successfully', async () => {
      const mockUserOp = {
        sender: '0x1234567890123456789012345678901234567890',
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

      expect(result.isSuccess).toBe(true);
      expect(result.userOp).toEqual(mockUserOp);
      expect(result.cost).toBeDefined();
      expect(mockSdk.clearUserOpsFromBatch).toHaveBeenCalled();
      expect(mockSdk.addUserOpsToBatch).toHaveBeenCalledWith({
        to: '0x1234567890123456789012345678901234567890',
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
        sender: '0x1234567890123456789012345678901234567890',
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

    it('should handle provider returning null/undefined', async () => {
      // @ts-ignore
      mockProvider.getProvider.mockReturnValue(null);

      const result = await transactionKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.errorMessage).toBe('Failed to get Web3 provider!');
    });

    it('should pass through gas details and call gas limit', async () => {
      const gasDetails = {
        maxFeePerGas: BigInt('1000000000'),
        maxPriorityFeePerGas: BigInt('1000000000'),
      };
      const callGasLimit = BigInt('21000');

      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);

      await transactionKit.estimate({ gasDetails, callGasLimit });

      expect(mockSdk.estimate).toHaveBeenCalledWith({
        paymasterDetails: undefined,
        gasDetails,
        callGasLimit,
      });
    });

    it('should handle totalGasEstimated error gracefully', async () => {
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockRejectedValue(
        new Error('Gas calculation failed')
      );

      const result = await transactionKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('ESTIMATION_ERROR');
    });

    it('should handle fresh SDK instance creation failure', async () => {
      mockProvider.getSdk.mockRejectedValue(new Error('SDK creation failed'));

      const result = await transactionKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('ESTIMATION_ERROR');
    });

    it('should return error if no named transaction', async () => {
      const emptyKit = new EtherspotTransactionKit(mockConfig);

      const result = await emptyKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.errorMessage).toBe(
        'No named transaction to estimate. Call name() first.'
      );
    });

    it('should return error for invalid transaction (value = 0 and data = 0x)', async () => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        data: '0x',
      });
      transactionKit.name({ transactionName: 'test' });

      const result = await transactionKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.errorMessage).toContain(
        'Invalid transaction: cannot have both value = 0 and data = 0x'
      );
    });

    it('should return error if no provider', async () => {
      // @ts-ignore
      mockProvider.getProvider.mockReturnValue(null);

      const result = await transactionKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.errorMessage).toBe('Failed to get Web3 provider!');
    });

    it('should handle estimation errors', async () => {
      mockSdk.estimate.mockRejectedValue(new Error('Estimation failed'));

      const result = await transactionKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('ESTIMATION_ERROR');
      expect(result.errorMessage).toBe('Estimation failed');
    });

    it('should handle SDK errors gracefully', async () => {
      mockSdk.addUserOpsToBatch.mockRejectedValue(new Error('SDK error'));

      const result = await transactionKit.estimate();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('ESTIMATION_ERROR');
    });
  });

  describe('send', () => {
    beforeEach(() => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        data: '0x1234',
      });
      transactionKit.name({ transactionName: 'test' });
    });

    it('should send transaction successfully', async () => {
      const mockUserOp = {
        sender: '0x1234567890123456789012345678901234567890',
        maxFeePerGas: '0x77359400',
      };
      const mockUserOpHash = '0xabcdef1234567890';

      mockSdk.estimate.mockResolvedValue(mockUserOp);
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
      mockSdk.send.mockResolvedValue(mockUserOpHash);

      const result = await transactionKit.send();

      expect(result.isSuccess).toBe(true);
      expect(result.userOpHash).toBe(mockUserOpHash);
      expect(result.userOp).toEqual(mockUserOp);
    });

    it('should send with user operation overrides', async () => {
      const mockUserOp = {
        sender: '0x1234567890123456789012345678901234567890',
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
      expect(result.isSuccess).toBe(true);
    });

    it('should handle provider returning null/undefined', async () => {
      // @ts-ignore
      mockProvider.getProvider.mockReturnValue(null);

      const result = await transactionKit.send();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.errorMessage).toBe('Failed to get Web3 provider!');
    });

    it('should handle totalGasEstimated error after successful estimation', async () => {
      mockSdk.estimate.mockResolvedValue({ maxFeePerGas: '0x77359400' });
      mockSdk.totalGasEstimated.mockRejectedValue(
        new Error('Gas calculation failed')
      );

      const result = await transactionKit.send();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('SEND_ERROR');
    });

    it('should preserve original userOp when overrides are applied', async () => {
      const originalUserOp = {
        sender: '0x1234567890123456789012345678901234567890',
        maxFeePerGas: '0x77359400',
        callGasLimit: '0x5208',
      };
      const userOpOverrides = {
        maxFeePerGas: '0x88888888',
      };

      mockSdk.estimate.mockResolvedValue(originalUserOp);
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
      mockSdk.send.mockResolvedValue('0xhash');

      const result = await transactionKit.send({ userOpOverrides });

      expect(mockSdk.send).toHaveBeenCalledWith({
        ...originalUserOp,
        ...userOpOverrides,
      });
      expect(result.userOp).toEqual({
        ...originalUserOp,
        ...userOpOverrides,
      });
    });

    it('should return error if no named transaction', async () => {
      const emptyKit = new EtherspotTransactionKit(mockConfig);

      const result = await emptyKit.send();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
      expect(result.errorMessage).toBe(
        'No named transaction to send. Call name() first.'
      );
    });

    it('should return error for invalid transaction', async () => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '0',
        data: '0x',
      });
      transactionKit.name({ transactionName: 'test' });

      const result = await transactionKit.send();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('VALIDATION_ERROR');
    });

    it('should handle estimation errors before sending', async () => {
      mockSdk.estimate.mockRejectedValue(new Error('Estimation failed'));

      const result = await transactionKit.send();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('ESTIMATION_ERROR');
      expect(result.errorMessage).toBe('Estimation failed');
    });

    it('should handle send errors', async () => {
      const mockUserOp = {
        sender: '0x1234567890123456789012345678901234567890',
        maxFeePerGas: '0x77359400',
      };

      mockSdk.estimate.mockResolvedValue(mockUserOp);
      mockSdk.totalGasEstimated.mockResolvedValue(BigInt('21000') as any);
      mockSdk.send.mockRejectedValue(new Error('Send failed'));

      const result = await transactionKit.send();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('SEND_ERROR');
      expect(result.errorMessage).toBe('Send failed');
    });

    it('should handle generic errors', async () => {
      mockSdk.clearUserOpsFromBatch.mockRejectedValue(
        new Error('Generic error')
      );

      const result = await transactionKit.send();

      expect(result.isSuccess).toBe(false);
      expect(result.errorType).toBe('SEND_ERROR');
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = transactionKit.getState();

      expect(state).toEqual({
        currentTransaction: {},
        hasValidTransaction: false,
        namedTransactions: {},
        isEstimating: false,
        isSending: false,
        containsSendingError: false,
        containsEstimatingError: false,
        walletAddresses: {},
      });
    });

    it('should return state with transaction', () => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
      });

      const state = transactionKit.getState();

      expect(state.hasValidTransaction).toBe(true);
      expect(state.currentTransaction.to).toBe(
        '0x1234567890123456789012345678901234567890'
      );
    });
  });

  describe('setDebugMode', () => {
    it('should enable debug mode', () => {
      transactionKit.setDebugMode(true);

      // Debug mode is private, so we test indirectly to check that it doesn't throw
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
          to: '0x1234567890123456789012345678901234567890',
        });
        debugKit.name({ transactionName: 'debug-tx' });
      }).not.toThrow();
    });

    it('should handle debug mode toggle', () => {
      transactionKit.setDebugMode(true);
      transactionKit.setDebugMode(false);
      transactionKit.setDebugMode(true);

      expect(() => transactionKit.setDebugMode(false)).not.toThrow();
    });
  });

  describe('getProvider', () => {
    it('should return etherspot provider', () => {
      const provider = transactionKit.getProvider();

      expect(provider).toBe(mockProvider);
    });
  });

  describe('getSdk', () => {
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

  describe('reset', () => {
    it('should reset all state', () => {
      // Set up some state
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
      });
      transactionKit.name({ transactionName: 'test' });

      expect(transactionKit.getState().hasValidTransaction).toBe(true);

      // Reset
      transactionKit.reset();

      const state = transactionKit.getState();
      expect(state.hasValidTransaction).toBe(false);
      expect(state.currentTransaction).toEqual({});
      expect(state.namedTransactions).toEqual({});
      expect(state.isEstimating).toBe(false);
      expect(state.isSending).toBe(false);
      expect(state.containsSendingError).toBe(false);
      expect(state.containsEstimatingError).toBe(false);
      expect(state.walletAddresses).toEqual({});
      expect(mockProvider.clearAllCaches).toHaveBeenCalled();
    });
  });

  describe('Static utils', () => {
    it('should expose EtherspotUtils', () => {
      expect(EtherspotTransactionKit.utils).toBe(EtherspotUtils);
    });
  });

  describe('TransactionKit factory function', () => {
    it('should create EtherspotTransactionKit instance', () => {
      const kit = TransactionKit(mockConfig);

      expect(kit).toBeInstanceOf(EtherspotTransactionKit);
    });
  });

  describe('State management during operations', () => {
    beforeEach(() => {
      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
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

  describe('Provider integration', () => {
    it('should handle provider chain ID changes', () => {
      mockProvider.getChainId.mockReturnValue(5);

      transactionKit.transaction({
        to: '0x1234567890123456789012345678901234567890',
      });

      const state = transactionKit.getState();
      expect(state.currentTransaction.chainId).toBe(1);

      // Test with no explicit chainId
      transactionKit.nativeAmount({ amount: 1 });
      const state2 = transactionKit.getState();
      expect(state2.currentTransaction.chainId).toBe(1); // Should use default
    });

    it('should handle SDK instance errors gracefully', async () => {
      mockProvider.getSdk.mockRejectedValue(new Error('SDK creation failed'));

      const result = await transactionKit.getWalletAddress();
      expect(result).toBeUndefined();
    });
  });
});
