import {
  EtherspotBundler,
  ModularSdk,
  WalletProviderLike,
} from '@etherspot/modular-sdk';
import { isEqual } from 'lodash';
import { Chain } from 'viem';
import {
  EtherspotProvider,
  EtherspotProviderConfig,
} from '../src/TransactionKit/EtherspotProvider';

// Mock dependencies
jest.mock('@etherspot/modular-sdk', () => ({
  ModularSdk: jest.fn(),
  EtherspotBundler: jest.fn(),
  Factory: {},
  WalletProvider: {},
}));
jest.mock('lodash', () => ({
  isEqual: jest.fn(),
}));

// Get mocked constructors
const MockedModularSdk = ModularSdk as jest.MockedClass<typeof ModularSdk>;
const MockedEtherspotBundler = EtherspotBundler as jest.MockedClass<
  typeof EtherspotBundler
>;
const mockedIsEqual = isEqual as jest.MockedFunction<typeof isEqual>;

describe('EtherspotProvider', () => {
  let mockProvider: WalletProviderLike;
  let mockModularSdk: jest.Mocked<ModularSdk>;
  let mockBundler: EtherspotBundler;
  let config: EtherspotProviderConfig;
  let etherspotProvider: EtherspotProvider;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock provider
    mockProvider = {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    } as any;

    // Mock ModularSdk instance
    mockModularSdk = {
      getCounterFactualAddress: jest.fn(),
    } as any;

    // Mock EtherspotBundler instance
    mockBundler = {} as any;

    // Setup constructor mocks
    MockedModularSdk.mockImplementation(() => mockModularSdk);
    MockedEtherspotBundler.mockImplementation(() => mockBundler);

    // Mock isEqual
    mockedIsEqual.mockReturnValue(false);

    // Default config
    config = {
      provider: mockProvider,
      chainId: 1,
      bundlerApiKey: 'test-bundler-key',
    };

    etherspotProvider = new EtherspotProvider(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(etherspotProvider.getConfig()).toEqual(config);
    });
  });

  describe('updateConfig', () => {
    it('should update config with new values', () => {
      const newConfig = {
        chainId: 137,
      };

      const result = etherspotProvider.updateConfig(newConfig);

      expect(result).toBe(etherspotProvider);
      expect(etherspotProvider.getConfig()).toEqual({
        ...config,
        ...newConfig,
      });
    });

    it('should update config partially', () => {
      const result = etherspotProvider.updateConfig({ chainId: 56 });

      expect(result).toBe(etherspotProvider);
      expect(etherspotProvider.getChainId()).toBe(56);
      expect(etherspotProvider.getProvider()).toBe(mockProvider);
    });

    it('should handle empty config update', () => {
      const originalConfig = etherspotProvider.getConfig();
      etherspotProvider.updateConfig({});
      expect(etherspotProvider.getConfig()).toEqual(originalConfig);
    });
  });

  describe('getSdk', () => {
    beforeEach(() => {
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
    });

    it('should create and return SDK for default chain', async () => {
      const sdk = await etherspotProvider.getSdk();

      expect(MockedModularSdk).toHaveBeenCalledWith(mockProvider, {
        chainId: 1,
        chain: undefined,
        bundlerProvider: mockBundler,
        factoryWallet: 'etherspot',
      });
      expect(MockedEtherspotBundler).toHaveBeenCalledWith(
        1,
        'test-bundler-key'
      );
      expect(mockModularSdk.getCounterFactualAddress).toHaveBeenCalledTimes(1);
      expect(sdk).toBe(mockModularSdk);
    });

    it('should create and return SDK for specific chain', async () => {
      const sdk = await etherspotProvider.getSdk(137);

      expect(MockedModularSdk).toHaveBeenCalledWith(mockProvider, {
        chainId: 137,
        chain: undefined,
        bundlerProvider: mockBundler,
        factoryWallet: 'etherspot',
      });
      expect(MockedEtherspotBundler).toHaveBeenCalledWith(
        137,
        'test-bundler-key'
      );
      expect(sdk).toBe(mockModularSdk);
    });

    it('should use custom chain when provided', async () => {
      const customChain = { id: 1337, name: 'Custom Chain' } as Chain;
      const sdk = await etherspotProvider.getSdk(1337, false, customChain);

      expect(MockedModularSdk).toHaveBeenCalledWith(mockProvider, {
        chainId: 1337,
        chain: customChain,
        bundlerProvider: mockBundler,
        factoryWallet: 'etherspot',
      });
    });

    it('should use default bundler API key when not provided', () => {
      const configWithoutBundlerKey = {
        provider: mockProvider,
        chainId: 1,
      };
      const provider = new EtherspotProvider(configWithoutBundlerKey);

      provider.getSdk();

      expect(MockedEtherspotBundler).toHaveBeenCalledWith(
        1,
        '__ETHERSPOT_BUNDLER_API_KEY__'
      );
    });

    it('should create new instance when forceNewInstance is true', async () => {
      const mockModularSdk2 = {
        getCounterFactualAddress: jest.fn().mockResolvedValue('0x456'),
      } as any;

      // First call
      await etherspotProvider.getSdk();

      // Mock constructor to return different instance
      MockedModularSdk.mockImplementationOnce(() => mockModularSdk2);

      // Second call with forceNewInstance
      const sdk2 = await etherspotProvider.getSdk(1, true);

      expect(sdk2).toBe(mockModularSdk2);
      expect(MockedModularSdk).toHaveBeenCalledTimes(2);
    });

    it('should create new instance when provider changes', async () => {
      // First call
      await etherspotProvider.getSdk();

      // Mock isEqual to return false (provider changed)
      mockedIsEqual.mockReturnValue(false);

      // Update provider
      const newProvider = { request: jest.fn() } as any;
      etherspotProvider.updateConfig({ provider: newProvider });

      // Second call should create new instance
      const sdk2 = await etherspotProvider.getSdk();

      expect(MockedModularSdk).toHaveBeenCalledTimes(2);
      expect(sdk2).toBe(mockModularSdk);
    });

    it('should not create new instance when provider is the same', async () => {
      // First call
      await etherspotProvider.getSdk();

      // Mock isEqual to return true (provider same)
      mockedIsEqual.mockReturnValue(true);

      // Second call should return cached instance
      const sdk2 = await etherspotProvider.getSdk();

      expect(MockedModularSdk).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple concurrent calls for same chain', async () => {
      // Start multiple concurrent calls
      const promise1 = etherspotProvider.getSdk();
      const promise2 = etherspotProvider.getSdk();
      const promise3 = etherspotProvider.getSdk();

      const [sdk1, sdk2, sdk3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(sdk1).toBe(mockModularSdk);
      expect(sdk2).toBe(mockModularSdk);
      expect(sdk3).toBe(mockModularSdk);
      expect(MockedModularSdk).toHaveBeenCalledTimes(1);
    });

    describe('retry logic for getCounterFactualAddress', () => {
      it('should succeed on first attempt', async () => {
        mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');

        const sdk = await etherspotProvider.getSdk();

        expect(mockModularSdk.getCounterFactualAddress).toHaveBeenCalledTimes(
          1
        );
        expect(sdk).toBe(mockModularSdk);
      });

      it('should retry and succeed on second attempt', async () => {
        mockModularSdk.getCounterFactualAddress
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce('0x123');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const sdk = await etherspotProvider.getSdk();

        expect(mockModularSdk.getCounterFactualAddress).toHaveBeenCalledTimes(
          2
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          'Attempt 1 failed to get counter factual address when initialising the Etherspot Modular SDK:',
          expect.any(Error)
        );
        expect(sdk).toBe(mockModularSdk);

        consoleSpy.mockRestore();
      });

      it('should retry and succeed on third attempt', async () => {
        mockModularSdk.getCounterFactualAddress
          .mockRejectedValueOnce(new Error('Network error 1'))
          .mockRejectedValueOnce(new Error('Network error 2'))
          .mockResolvedValueOnce('0x123');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const sdk = await etherspotProvider.getSdk();

        expect(mockModularSdk.getCounterFactualAddress).toHaveBeenCalledTimes(
          3
        );
        expect(consoleSpy).toHaveBeenCalledTimes(2);
        expect(sdk).toBe(mockModularSdk);

        consoleSpy.mockRestore();
      });

      it('should fail after 3 attempts', async () => {
        mockModularSdk.getCounterFactualAddress.mockRejectedValue(
          new Error('Persistent error')
        );

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(etherspotProvider.getSdk()).rejects.toThrow(
          'Failed to get counter factual address when initialising the Etherspot Modular SDK after 3 attempts.'
        );

        expect(mockModularSdk.getCounterFactualAddress).toHaveBeenCalledTimes(
          3
        );
        expect(consoleSpy).toHaveBeenCalledTimes(3);

        consoleSpy.mockRestore();
      });

      it('should wait 1 second between retries', async () => {
        mockModularSdk.getCounterFactualAddress
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce('0x123');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

        await etherspotProvider.getSdk();

        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

        consoleSpy.mockRestore();
        setTimeoutSpy.mockRestore();
      });
    });
  });

  describe('getProvider', () => {
    it('should return current provider', () => {
      expect(etherspotProvider.getProvider()).toBe(mockProvider);
    });

    it('should return updated provider after config update', () => {
      const newProvider = { request: jest.fn() } as any;
      etherspotProvider.updateConfig({ provider: newProvider });

      expect(etherspotProvider.getProvider()).toBe(newProvider);
    });
  });

  describe('getChainId', () => {
    it('should return current chain ID', () => {
      expect(etherspotProvider.getChainId()).toBe(1);
    });

    it('should return updated chain ID after config update', () => {
      etherspotProvider.updateConfig({ chainId: 137 });

      expect(etherspotProvider.getChainId()).toBe(137);
    });
  });

  describe('clearSdkCache', () => {
    it('should clear SDK cache', async () => {
      // Create SDK instance
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
      await etherspotProvider.getSdk();

      // Clear cache
      const result = etherspotProvider.clearSdkCache();

      expect(result).toBe(etherspotProvider); // Should return this for chaining

      // Next call should create new instance
      await etherspotProvider.getSdk();

      expect(MockedModularSdk).toHaveBeenCalledTimes(2);
    });

    it('should clear cache for multiple chains', async () => {
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');

      // Create SDKs for different chains
      await etherspotProvider.getSdk(1);
      await etherspotProvider.getSdk(137);

      // Clear cache
      etherspotProvider.clearSdkCache();

      // Next calls should create new instances
      await etherspotProvider.getSdk(1);
      await etherspotProvider.getSdk(137);

      expect(MockedModularSdk).toHaveBeenCalledTimes(4);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', async () => {
      // Create SDK instance
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
      await etherspotProvider.getSdk();

      // Clear all caches
      const result = etherspotProvider.clearAllCaches();

      expect(result).toBe(etherspotProvider); // Should return this for chaining

      // Next call should create new instance
      await etherspotProvider.getSdk();

      expect(MockedModularSdk).toHaveBeenCalledTimes(2);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const returnedConfig = etherspotProvider.getConfig();

      expect(returnedConfig).toEqual(config);
      expect(returnedConfig).not.toBe(config); // Should be a copy, not reference
    });

    it('should return updated config after changes', () => {
      const newConfig = { chainId: 56 };
      etherspotProvider.updateConfig(newConfig);

      expect(etherspotProvider.getConfig()).toEqual({
        ...config,
        ...newConfig,
      });
    });
  });

  describe('destroy', () => {
    it('should clear SDK cache and reset prevProvider', async () => {
      // Create SDK instance
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
      await etherspotProvider.getSdk();

      // Destroy
      etherspotProvider.destroy();

      // Next call should create new instance (cache cleared)
      await etherspotProvider.getSdk();

      expect(MockedModularSdk).toHaveBeenCalledTimes(2);
    });

    it('should reset prevProvider to null', async () => {
      // Create SDK instance to set prevProvider
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
      await etherspotProvider.getSdk();

      // Destroy
      etherspotProvider.destroy();

      // Mock isEqual to always return false
      mockedIsEqual.mockReturnValue(false);

      // Next call should not detect provider change since prevProvider is null
      await etherspotProvider.getSdk();

      expect(mockedIsEqual).not.toHaveBeenCalled();
    });
  });

  describe('Error scenarios', () => {
    it('should handle undefined bundlerApiKey', () => {
      const configWithoutBundlerKey = {
        provider: mockProvider,
        chainId: 1,
      };
      const provider = new EtherspotProvider(configWithoutBundlerKey);

      expect(provider.getConfig().bundlerApiKey).toBeUndefined();
    });

    it('should handle chainId as string (converted to number)', async () => {
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');

      await etherspotProvider.getSdk();

      expect(MockedModularSdk).toHaveBeenCalledWith(
        mockProvider,
        expect.objectContaining({
          chainId: 1, // Should be converted to number
        })
      );
    });

    it('should handle concurrent getSdk calls for different chains', async () => {
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');

      // Start concurrent calls for different chains
      const promise1 = etherspotProvider.getSdk(1);
      const promise2 = etherspotProvider.getSdk(137);
      const promise3 = etherspotProvider.getSdk(56);

      const [sdk1, sdk2, sdk3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(sdk1).toBe(mockModularSdk);
      expect(sdk2).toBe(mockModularSdk);
      expect(sdk3).toBe(mockModularSdk);
      expect(MockedModularSdk).toHaveBeenCalledTimes(3);
    });
  });
});
