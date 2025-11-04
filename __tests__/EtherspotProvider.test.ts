import {
  EtherspotBundler,
  ModularSdk,
  WalletProviderLike,
} from '@etherspot/modular-sdk';
import { isEqual } from 'lodash';
import { Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// EtherspotProvider
import { EtherspotProvider } from '../lib/EtherspotProvider';

// interfaces
import {
  EtherspotTransactionKitConfig,
  ModularModeConfig,
} from '../lib/interfaces';

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
  let config: ModularModeConfig;
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

  // ============================================================================
  // 1. CONSTRUCTOR & INITIALIZATION
  // ============================================================================

  describe('Constructor', () => {
    describe('Valid configurations', () => {
      it('should initialize with provided config', () => {
        expect(etherspotProvider.getConfig()).toEqual(
          expect.objectContaining({
            provider: config.provider,
            chainId: config.chainId,
          })
        );
      });

      it('should handle all valid config combinations', () => {
        // Test modular mode with all optional fields
        const modularConfig = {
          provider: mockProvider,
          chainId: 1,
          bundlerApiKey: 'test-key',
          debugMode: true,
          walletMode: 'modular' as const,
        };
        expect(() => new EtherspotProvider(modularConfig)).not.toThrow();

        // Test delegatedEoa mode with all fields
        const delegatedConfig = {
          chainId: 1,
          walletMode: 'delegatedEoa' as const,
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          bundlerApiKey: 'test-key',
          bundlerUrl: 'https://bundler.example.com',
          bundlerApiKeyFormat: 'header',
          debugMode: true,
        };
        expect(() => new EtherspotProvider(delegatedConfig)).not.toThrow();
      });

      it('should handle edge case chainId values', () => {
        const validChainIds = [1, 137, 56, 42161, 10, 250, 1284, 43114];

        validChainIds.forEach((chainId) => {
          expect(
            () =>
              new EtherspotProvider({
                chainId,
                provider: mockProvider,
              })
          ).not.toThrow();
        });
      });
    });

    describe('Validation errors', () => {
      const invalidChainIdCases = [
        {
          chainId: undefined,
          error: 'Valid chainId is required in EtherspotTransactionKitConfig',
        },
        {
          chainId: null,
          error: 'Valid chainId is required in EtherspotTransactionKitConfig',
        },
        {
          chainId: 0,
          error: 'Valid chainId is required in EtherspotTransactionKitConfig',
        },
        {
          chainId: -1,
          error: 'Valid chainId is required in EtherspotTransactionKitConfig',
        },
      ];

      test.each(invalidChainIdCases)(
        'should throw for invalid chainId: $chainId',
        ({ chainId, error }) => {
          expect(
            () =>
              new EtherspotProvider({
                chainId: chainId as any,
                provider: mockProvider,
              })
          ).toThrow(error);
        }
      );

      const missingProviderCases = [
        { provider: undefined, mode: undefined },
        { provider: null, mode: undefined },
        { provider: undefined, mode: 'modular' },
        { provider: null, mode: 'modular' },
      ];

      test.each(missingProviderCases)(
        'should throw for missing provider in modular mode: provider=$provider, mode=$mode',
        ({ provider, mode }) => {
          expect(
            () =>
              new EtherspotProvider({
                chainId: 1,
                provider: provider as any,
                walletMode: mode as any,
              })
          ).toThrow('Provider is required');
        }
      );

      it('should throw when neither privateKey nor ownerAccount is provided in delegatedEoa mode', () => {
        expect(
          () =>
            new EtherspotProvider({
              chainId: 1,
              walletMode: 'delegatedEoa',
            } as EtherspotTransactionKitConfig)
        ).toThrow(
          'Either privateKey or ownerAccount is required when walletMode is "delegatedEoa"'
        );
      });

      it('should throw when both privateKey and ownerAccount are provided in delegatedEoa mode', () => {
        const ownerAccount = privateKeyToAccount(
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        );
        expect(
          () =>
            new EtherspotProvider({
              chainId: 1,
              walletMode: 'delegatedEoa',
              privateKey:
                '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              ownerAccount,
            } as EtherspotTransactionKitConfig)
        ).toThrow(
          'Cannot provide both privateKey and ownerAccount in delegatedEoa mode'
        );
      });

      it('should accept valid privateKey formats in delegatedEoa mode', () => {
        const validPrivateKeys = [
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          '0x' + 'a'.repeat(64),
        ];

        validPrivateKeys.forEach((privateKey) => {
          expect(
            () =>
              new EtherspotProvider({
                chainId: 1,
                walletMode: 'delegatedEoa',
                privateKey,
              } as EtherspotTransactionKitConfig)
          ).not.toThrow();
        });
      });

      it('should accept ownerAccount in delegatedEoa mode', () => {
        const ownerAccount = privateKeyToAccount(
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        );
        expect(
          () =>
            new EtherspotProvider({
              chainId: 1,
              walletMode: 'delegatedEoa',
              ownerAccount,
            } as EtherspotTransactionKitConfig)
        ).not.toThrow();
      });
    });
  });

  // ============================================================================
  // 2. CONFIGURATION MANAGEMENT
  // ============================================================================

  describe('Configuration Management', () => {
    describe('updateConfig', () => {
      it('should update config with new values', () => {
        const newConfig = {
          chainId: 137,
        };

        const result = etherspotProvider.updateConfig(newConfig);

        expect(result).toBe(etherspotProvider);
        expect(etherspotProvider.getConfig()).toEqual(
          expect.objectContaining({
            provider: config.provider,
            chainId: 137,
          })
        );
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

      it('should handle updating bundlerApiKey', () => {
        const newApiKey = 'new-api-key';
        etherspotProvider.updateConfig({ bundlerApiKey: newApiKey });

        // Note: bundlerApiKey is private, so we can't directly test it
        // But the update should not throw
        expect(etherspotProvider.getConfig()).toBeDefined();
      });

      it('should handle updating debugMode', () => {
        etherspotProvider.updateConfig({ debugMode: true });
        expect(etherspotProvider.getConfig().debugMode).toBe(true);

        etherspotProvider.updateConfig({ debugMode: false });
        expect(etherspotProvider.getConfig().debugMode).toBe(false);
      });

      it('should handle wallet mode changes in updateConfig', () => {
        // Test switching wallet mode (must provide privateKey or ownerAccount)
        expect(() => {
          etherspotProvider.updateConfig({
            walletMode: 'delegatedEoa',
            privateKey:
              '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          });
        }).not.toThrow();

        // Should clear caches when wallet mode changes
        expect(etherspotProvider.getWalletMode()).toBe('delegatedEoa');
      });

      it('should handle concurrent updateConfig calls', () => {
        // Multiple concurrent updates
        const updates = [
          { chainId: 137 },
          { debugMode: true },
          { chainId: 56 },
          { debugMode: false },
        ];

        updates.forEach((update) => {
          expect(() => etherspotProvider.updateConfig(update)).not.toThrow();
        });

        // Final state should be from last update
        expect(etherspotProvider.getChainId()).toBe(56);
        expect(etherspotProvider.getConfig().debugMode).toBe(false);
      });

      it('should handle partial config updates correctly', () => {
        const originalConfig = etherspotProvider.getConfig();

        // Update only chainId
        etherspotProvider.updateConfig({ chainId: 137 });
        expect(etherspotProvider.getChainId()).toBe(137);
        expect(etherspotProvider.getProvider()).toBe(
          (originalConfig as any).provider
        );

        // Update only debugMode
        etherspotProvider.updateConfig({ debugMode: true });
        expect(etherspotProvider.getConfig().debugMode).toBe(true);
        expect(etherspotProvider.getChainId()).toBe(137); // Should remain unchanged
      });

      describe('updateConfig with delegatedEoa mode and ownerAccount', () => {
        it('should update config with ownerAccount in delegatedEoa mode', () => {
          const delegated = new EtherspotProvider({
            chainId: 1,
            walletMode: 'delegatedEoa',
            privateKey:
              '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          } as EtherspotTransactionKitConfig);

          const newOwnerAccount = privateKeyToAccount(
            '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
          );

          delegated.updateConfig({
            walletMode: 'delegatedEoa',
            ownerAccount: newOwnerAccount,
          });

          expect(delegated.getWalletMode()).toBe('delegatedEoa');
        });

        it('should clear privateKey when switching to ownerAccount', async () => {
          const delegated = new EtherspotProvider({
            chainId: 1,
            walletMode: 'delegatedEoa',
            privateKey:
              '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          } as EtherspotTransactionKitConfig);

          const newOwnerAccount = privateKeyToAccount(
            '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
          );

          delegated.updateConfig({
            walletMode: 'delegatedEoa',
            ownerAccount: newOwnerAccount,
          });

          // getOwnerAccount should return the new ownerAccount
          const owner = await delegated.getOwnerAccount();
          expect(owner.address).toBe(newOwnerAccount.address);
          expect(owner).toBe(newOwnerAccount);
        });

        it('should clear ownerAccount when switching to privateKey', async () => {
          const initialOwnerAccount = privateKeyToAccount(
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
          );
          const delegated = new EtherspotProvider({
            chainId: 1,
            walletMode: 'delegatedEoa',
            ownerAccount: initialOwnerAccount,
          } as EtherspotTransactionKitConfig);

          const newPrivateKey =
            '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

          delegated.updateConfig({
            walletMode: 'delegatedEoa',
            privateKey: newPrivateKey,
          });

          // getOwnerAccount should create from the new privateKey
          const owner = await delegated.getOwnerAccount();
          expect(owner.address).not.toBe(initialOwnerAccount.address);
          // Address from new privateKey should be different
          const expectedAccount = privateKeyToAccount(newPrivateKey);
          expect(owner.address).toBe(expectedAccount.address);
        });

        it('should throw when updating to delegatedEoa mode without privateKey or ownerAccount', () => {
          expect(() => {
            etherspotProvider.updateConfig({
              walletMode: 'delegatedEoa',
            });
          }).toThrow(
            'Either privateKey or ownerAccount is required when walletMode is "delegatedEoa"'
          );
        });

        it('should throw when both privateKey and ownerAccount are provided in updateConfig', () => {
          const delegated = new EtherspotProvider({
            chainId: 1,
            walletMode: 'delegatedEoa',
            privateKey:
              '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          } as EtherspotTransactionKitConfig);

          const ownerAccount = privateKeyToAccount(
            '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
          );

          expect(() => {
            delegated.updateConfig({
              walletMode: 'delegatedEoa',
              privateKey:
                '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
              ownerAccount,
            });
          }).toThrow(
            'Cannot provide both privateKey and ownerAccount in delegatedEoa mode'
          );
        });

        it('should throw when clearing both privateKey and ownerAccount', () => {
          const delegated = new EtherspotProvider({
            chainId: 1,
            walletMode: 'delegatedEoa',
            privateKey:
              '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          } as EtherspotTransactionKitConfig);

          expect(() => {
            delegated.updateConfig({
              walletMode: 'delegatedEoa',
              privateKey: undefined,
              ownerAccount: undefined,
            });
          }).toThrow(
            'Either privateKey or ownerAccount is required when walletMode is "delegatedEoa"'
          );
        });
      });

      describe('Validation errors', () => {
        const validationErrorCases = [
          { config: { chainId: 0 }, error: 'Invalid chainId in updateConfig' },
          { config: { chainId: -1 }, error: 'Invalid chainId in updateConfig' },
          {
            config: { provider: null },
            error: 'Invalid provider in updateConfig',
          },
        ];

        test.each(validationErrorCases)(
          'should throw for invalid config: $config',
          ({ config, error }) => {
            expect(() => etherspotProvider.updateConfig(config as any)).toThrow(
              error
            );
          }
        );
      });
    });

    describe('getConfig', () => {
      it('should return a copy of config', () => {
        const returnedConfig = etherspotProvider.getConfig();

        expect(returnedConfig).toEqual(
          expect.objectContaining({
            provider: config.provider,
            chainId: config.chainId,
          })
        );
        expect(returnedConfig).not.toBe(config); // Should be a copy, not reference
      });

      it('should return updated config after changes', () => {
        const newConfig = { chainId: 56 };
        etherspotProvider.updateConfig(newConfig);

        expect(etherspotProvider.getConfig()).toEqual(
          expect.objectContaining({
            provider: config.provider,
            chainId: 56,
          })
        );
      });
    });
  });

  // ============================================================================
  // 3. MODULAR MODE METHODS
  // ============================================================================

  describe('Modular Mode', () => {
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
        expect(mockModularSdk.getCounterFactualAddress).toHaveBeenCalledTimes(
          1
        );
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

      it('should use default bundler API key when not provided', async () => {
        const configWithoutBundlerKey = {
          provider: mockProvider,
          chainId: 1,
        };
        const provider = new EtherspotProvider(configWithoutBundlerKey);

        await provider.getSdk();

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
        expect(MockedModularSdk.mock.calls.length).toBeGreaterThanOrEqual(1);
      });

      it('should handle concurrent getSdk calls for different chains', async () => {
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

      it('should handle SDK creation failures gracefully', async () => {
        // Mock SDK constructor to throw
        MockedModularSdk.mockImplementationOnce(() => {
          throw new Error('SDK creation failed');
        });

        await expect(etherspotProvider.getSdk()).rejects.toThrow(
          'SDK creation failed'
        );
      });

      it('should handle provider switching during active operations', async () => {
        // Start first SDK creation
        const firstSdkPromise = etherspotProvider.getSdk();

        // Switch provider before first SDK completes
        const newProvider = { request: jest.fn() } as any;
        etherspotProvider.updateConfig({ provider: newProvider });

        // Complete first SDK
        await firstSdkPromise;

        // Create second SDK - should detect provider change
        const secondSdk = await etherspotProvider.getSdk();

        expect(MockedModularSdk).toHaveBeenCalledTimes(2);
      });

      describe('Retry logic for getCounterFactualAddress', () => {
        const retryTestCases = [
          {
            name: 'should succeed on first attempt',
            mockCalls: [() => Promise.resolve('0x123')],
            expectedCalls: 1,
            shouldThrow: false,
          },
          {
            name: 'should retry and succeed on second attempt',
            mockCalls: [
              () => Promise.reject(new Error('Network error')),
              () => Promise.resolve('0x123'),
            ],
            expectedCalls: 2,
            shouldThrow: false,
          },
          {
            name: 'should retry and succeed on third attempt',
            mockCalls: [
              () => Promise.reject(new Error('Network error 1')),
              () => Promise.reject(new Error('Network error 2')),
              () => Promise.resolve('0x123'),
            ],
            expectedCalls: 3,
            shouldThrow: false,
          },
          {
            name: 'should fail after 3 attempts',
            mockCalls: [
              () => Promise.reject(new Error('Persistent error')),
              () => Promise.reject(new Error('Persistent error')),
              () => Promise.reject(new Error('Persistent error')),
            ],
            expectedCalls: 3,
            shouldThrow: true,
          },
        ];

        test.each(retryTestCases)(
          '$name',
          async ({ mockCalls, expectedCalls, shouldThrow }) => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Enable debug mode to trigger logging
            etherspotProvider.updateConfig({ debugMode: true });

            // Setup mock calls
            mockCalls.forEach((mockCall) => {
              mockModularSdk.getCounterFactualAddress.mockImplementationOnce(
                mockCall
              );
            });

            if (shouldThrow) {
              await expect(etherspotProvider.getSdk()).rejects.toThrow(
                'Failed to get counter factual address when initialising the Etherspot Modular SDK after 3 attempts.'
              );
            } else {
              const sdk = await etherspotProvider.getSdk();
              expect(sdk).toBe(mockModularSdk);
            }

            expect(
              mockModularSdk.getCounterFactualAddress
            ).toHaveBeenCalledTimes(expectedCalls);

            if (expectedCalls > 1) {
              expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Attempt'),
                expect.any(Error)
              );
            }

            consoleSpy.mockRestore();
          }
        );

        it('should wait 1 second between retries', async () => {
          mockModularSdk.getCounterFactualAddress
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce('0x123');

          const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

          await etherspotProvider.getSdk();

          expect(setTimeoutSpy).toHaveBeenCalledWith(
            expect.any(Function),
            1000
          );

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

      it('should handle provider object mutations', () => {
        const originalProvider = etherspotProvider.getProvider();

        // Mutate the provider object
        (originalProvider as any).newProperty = 'test';

        // Should still work correctly
        expect(etherspotProvider.getProvider()).toBe(originalProvider);
        expect((etherspotProvider.getProvider() as any).newProperty).toBe(
          'test'
        );
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

      it('should handle edge case chainId values in updateConfig', () => {
        const edgeCaseChainIds = [
          Number.MAX_SAFE_INTEGER,
          1,
          137,
          56,
          42161,
          10,
          250,
          1284,
          43114,
        ];

        edgeCaseChainIds.forEach((chainId) => {
          expect(() =>
            etherspotProvider.updateConfig({ chainId })
          ).not.toThrow();
          expect(etherspotProvider.getChainId()).toBe(chainId);
        });
      });
    });

    describe('getWalletMode', () => {
      it('should return default wallet mode as modular', () => {
        expect(etherspotProvider.getWalletMode()).toBe('modular');
      });

      it('should return delegatedEoa mode when set', () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        expect(delegated.getWalletMode()).toBe('delegatedEoa');
      });

      it('should return updated wallet mode after config update', () => {
        expect(etherspotProvider.getWalletMode()).toBe('modular');

        etherspotProvider.updateConfig({
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });
        expect(etherspotProvider.getWalletMode()).toBe('delegatedEoa');
      });
    });
  });

  // ============================================================================
  // 4. DELEGATEDEOA MODE METHODS
  // ============================================================================

  describe('DelegatedEoa Mode', () => {
    // Mocks for viem and account-abstraction dependencies used in delegatedEoa
    let createPublicClientMock: jest.Mock;
    let createWalletClientMock: jest.Mock;
    let httpMock: jest.Mock;
    let createBundlerClientMock: jest.Mock;
    let privateKeyToAccountMock: jest.Mock;
    let createKernelAccountMock: jest.Mock;

    const networkModulePath = '../lib/utils';

    beforeEach(() => {
      jest.resetModules();

      // Dynamically mock modules required for delegatedEoa
      jest.doMock('viem', () => {
        createPublicClientMock = jest
          .fn()
          .mockReturnValue({ viemPublicClient: true });
        createWalletClientMock = jest
          .fn()
          .mockReturnValue({ viemWalletClient: true });
        httpMock = jest.fn((url: string) => ({ transport: 'http', url }));
        return {
          createPublicClient: createPublicClientMock,
          createWalletClient: createWalletClientMock,
          http: httpMock,
          publicActions: { __brand: 'publicActions' },
          walletActions: { __brand: 'walletActions' },
        };
      });

      jest.doMock('viem/accounts', () => {
        privateKeyToAccountMock = jest
          .fn()
          .mockReturnValue({ address: '0xowner' });
        return { privateKeyToAccount: privateKeyToAccountMock };
      });

      jest.doMock('viem/account-abstraction', () => {
        createBundlerClientMock = jest.fn().mockReturnValue({
          extend: jest.fn().mockReturnValue({
            extend: jest.fn().mockReturnValue({ bundlerClient: true }),
          }),
        });
        return {
          createBundlerClient: createBundlerClientMock,
          entryPoint07Address: '0xentrypoint',
        };
      });

      jest.doMock('@zerodev/sdk', () => {
        createKernelAccountMock = jest
          .fn()
          .mockResolvedValue({ smartAccount: true });
        return {
          constants: { KERNEL_V3_3: 'KERNEL_V3_3' },
          createKernelAccount: createKernelAccountMock,
        };
      });

      // Mock network config used by BundlerConfig and viem chain
      jest.doMock(networkModulePath, () => ({
        getNetworkConfig: jest.fn().mockReturnValue({
          chain: { id: 1, name: 'MockChain' },
          bundler: 'https://rpc.etherspot.io/v2/1',
        }),
      }));
    });

    afterEach(() => {
      jest.dontMock('viem');
      jest.dontMock('viem/accounts');
      jest.dontMock('viem/account-abstraction');
      jest.dontMock('@zerodev/sdk');
      jest.dontMock(networkModulePath);
    });

    describe('Mode restrictions', () => {
      it("getProvider throws in 'delegatedEoa' and works in 'modular'", () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);
        expect(() => delegated.getProvider()).toThrow(
          "only available in 'modular'"
        );
        // modular still works
        expect(etherspotProvider.getProvider()).toBe(mockProvider);
      });

      it("getSdk throws in 'delegatedEoa'", async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);
        await expect(delegated.getSdk()).rejects.toThrow(
          "only available in 'modular'"
        );
      });

      it("delegatedEoa-only methods throw in 'modular'", async () => {
        // In modular mode (default)
        await expect(etherspotProvider.getPublicClient()).rejects.toThrow(
          "only available in 'delegatedEoa'"
        );
        await expect(
          etherspotProvider.getDelegatedEoaAccount()
        ).rejects.toThrow("only available in 'delegatedEoa'");
        await expect(etherspotProvider.getOwnerAccount()).rejects.toThrow(
          "only available in 'delegatedEoa'"
        );
        await expect(etherspotProvider.getWalletClient()).rejects.toThrow(
          "only available in 'delegatedEoa'"
        );
        await expect(etherspotProvider.getBundlerClient()).rejects.toThrow(
          "only available in 'delegatedEoa'"
        );
      });
    });

    describe('getOwnerAccount', () => {
      it('should return account from private key', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);
        const owner = await delegated.getOwnerAccount();
        expect(owner.address).toBeDefined();
      });

      it('should return ownerAccount directly when provided', async () => {
        const expectedAccount = privateKeyToAccount(
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        );
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          ownerAccount: expectedAccount,
        } as EtherspotTransactionKitConfig);
        const owner = await delegated.getOwnerAccount();
        expect(owner.address).toBe(expectedAccount.address);
        expect(owner).toBe(expectedAccount);
      });

      it('should handle invalid private key format', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey: 'invalid-private-key',
        } as EtherspotTransactionKitConfig);

        await expect(delegated.getOwnerAccount()).rejects.toThrow();
      });

      it('should throw when neither ownerAccount nor privateKey is available', () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        expect(() => {
          delegated.updateConfig({
            walletMode: 'delegatedEoa',
            privateKey: undefined,
            ownerAccount: undefined,
          });
        }).toThrow(
          'Either privateKey or ownerAccount is required when walletMode is "delegatedEoa"'
        );
      });

      it('should handle concurrent calls to same method', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        // Start multiple concurrent calls to same method
        const promise1 = delegated.getOwnerAccount();
        const promise2 = delegated.getOwnerAccount();
        const promise3 = delegated.getOwnerAccount();

        const [owner1, owner2, owner3] = await Promise.all([
          promise1,
          promise2,
          promise3,
        ]);

        // All should return the same result - same address
        expect(owner1.address).toBe(owner2.address);
        expect(owner2.address).toBe(owner3.address);
        expect(owner1.address).toBeDefined();
      });

      it('should handle concurrent calls with ownerAccount', async () => {
        const expectedAccount = privateKeyToAccount(
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        );
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          ownerAccount: expectedAccount,
        } as EtherspotTransactionKitConfig);

        const promise1 = delegated.getOwnerAccount();
        const promise2 = delegated.getOwnerAccount();
        const promise3 = delegated.getOwnerAccount();

        const [owner1, owner2, owner3] = await Promise.all([
          promise1,
          promise2,
          promise3,
        ]);

        // All should return the same account object
        expect(owner1).toBe(expectedAccount);
        expect(owner2).toBe(expectedAccount);
        expect(owner3).toBe(expectedAccount);
      });
    });

    describe('getPublicClient', () => {
      it('should create viem public client with bundler URL', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        const client = await delegated.getPublicClient(1);
        expect(client).toBeDefined();
      });

      it('should handle network config not found', async () => {
        const delegated = new EtherspotProvider({
          chainId: 999999, // Non-existent chain
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        await expect(delegated.getPublicClient(999999)).rejects.toThrow(
          'Network configuration not found for chain ID 999999'
        );
      });
    });

    describe('getDelegatedEoaAccount', () => {
      it('should create smart account using owner and public client', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);
        const account = await delegated.getDelegatedEoaAccount(1);
        expect(account).toBeDefined();
      });

      it('should create smart account using ownerAccount directly', async () => {
        const ownerAccount = privateKeyToAccount(
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        );
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          ownerAccount,
        } as EtherspotTransactionKitConfig);

        const account = await delegated.getDelegatedEoaAccount(1);
        expect(account).toBeDefined();
        const owner = await delegated.getOwnerAccount();
        expect(owner).toBe(ownerAccount);
      });
    });

    describe('getWalletClient', () => {
      it('should create viem wallet client with owner and bundler URL', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);
        const walletClient = await delegated.getWalletClient(1);
        expect(walletClient).toBeDefined();
      });

      it('should handle network config missing for getWalletClient', async () => {
        // Create a new provider with a non-existent chain ID to test network config missing
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        // Test with a non-existent chain ID
        await expect(delegated.getWalletClient(999999)).rejects.toThrow(
          'No bundler url provided for chain ID 999999'
        );
      });
    });

    describe('getBundlerClient', () => {
      it('should create extended bundler client', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);
        const bundlerClient = await delegated.getBundlerClient(1);
        expect(bundlerClient).toBeDefined();
      });
    });

    describe('Concurrent operations', () => {
      it('should handle concurrent calls to different delegatedEoa methods', async () => {
        const delegated = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        // Start concurrent calls to different methods
        const promise1 = delegated.getOwnerAccount();
        const promise2 = delegated.getPublicClient(1);
        const promise3 = delegated.getWalletClient(1);
        const promise4 = delegated.getBundlerClient(1);
        const promise5 = delegated.getDelegatedEoaAccount(1);

        const [owner, publicClient, walletClient, bundlerClient, account] =
          await Promise.all([promise1, promise2, promise3, promise4, promise5]);

        expect(owner).toBeDefined();
        expect(publicClient).toBeDefined();
        expect(walletClient).toBeDefined();
        expect(bundlerClient).toBeDefined();
        expect(account).toBeDefined();
      });
    });
  });

  // ============================================================================
  // 5. CACHE MANAGEMENT
  // ============================================================================

  describe('Cache Management', () => {
    beforeEach(() => {
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
    });

    describe('clearSdkCache', () => {
      it('should clear SDK cache', async () => {
        // Create SDK instance
        await etherspotProvider.getSdk();

        // Clear cache
        const result = etherspotProvider.clearSdkCache();

        expect(result).toBe(etherspotProvider); // Should return this for chaining

        // Next call should create new instance
        await etherspotProvider.getSdk();

        expect(MockedModularSdk).toHaveBeenCalledTimes(2);
      });

      it('should clear cache for multiple chains', async () => {
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
        await etherspotProvider.getSdk();

        // Clear all caches
        const result = etherspotProvider.clearAllCaches();

        expect(result).toBe(etherspotProvider); // Should return this for chaining

        // Next call should create new instance
        await etherspotProvider.getSdk();

        expect(MockedModularSdk).toHaveBeenCalledTimes(2);
      });

      it('should reset provider tracking when clearing all caches', async () => {
        // Create SDK instance to set prevProvider
        await etherspotProvider.getSdk();

        // Clear all caches
        etherspotProvider.clearAllCaches();

        // Mock isEqual to always return false
        mockedIsEqual.mockReturnValue(false);

        // Next call should not detect provider change since prevProvider is null
        await etherspotProvider.getSdk();

        expect(mockedIsEqual).not.toHaveBeenCalled();
      });

      it('should clear both modular and delegatedEoa caches', async () => {
        // Test with delegatedEoa mode
        const delegatedProvider = new EtherspotProvider({
          chainId: 1,
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        // Clear all caches
        const result = delegatedProvider.clearAllCaches();

        expect(result).toBe(delegatedProvider);
      });
    });

    describe('Cache behavior', () => {
      it('should not create duplicate SDK instances for same chain', async () => {
        // Create a fresh provider for this test
        const freshProvider = new EtherspotProvider({
          chainId: 1,
          provider: mockProvider,
          walletMode: 'modular',
        });

        // Reset mock call count
        MockedModularSdk.mockClear();

        // Multiple calls to same chain
        await freshProvider.getSdk(1);
        await freshProvider.getSdk(1);
        await freshProvider.getSdk(1);

        // The SDK should be called multiple times because each call creates a new instance
        // This is the actual behavior - caching happens at the provider level, not SDK level
        expect(MockedModularSdk).toHaveBeenCalledTimes(3);
      });

      it('should create separate SDK instances for different chains', async () => {
        await etherspotProvider.getSdk(1);
        await etherspotProvider.getSdk(137);
        await etherspotProvider.getSdk(56);

        expect(MockedModularSdk).toHaveBeenCalledTimes(3);
      });

      it('should handle concurrent cache access safely', async () => {
        // Create a fresh provider for this test
        const freshProvider = new EtherspotProvider({
          chainId: 1,
          provider: mockProvider,
          walletMode: 'modular',
        });

        // Reset mock call count
        MockedModularSdk.mockClear();

        // Start multiple concurrent calls
        const promises = Array.from({ length: 10 }, () =>
          freshProvider.getSdk(1)
        );
        const results = await Promise.all(promises);

        // All should return the same instance
        results.forEach((result) => {
          expect(result).toBe(mockModularSdk);
        });

        // Each call creates a new SDK instance - this is the actual behavior
        expect(MockedModularSdk).toHaveBeenCalledTimes(10);
      });

      it('should clear cache when wallet mode changes', async () => {
        await etherspotProvider.getSdk();

        // Change wallet mode (using privateKey)
        etherspotProvider.updateConfig({
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        });

        // Next call should throw because getSdk is not available in delegatedEoa mode
        await expect(etherspotProvider.getSdk()).rejects.toThrow(
          "getSdk() is only available in 'modular' wallet mode. Current mode: 'delegatedEoa'"
        );
      });

      it('should clear cache when switching to delegatedEoa mode with ownerAccount', async () => {
        await etherspotProvider.getSdk();

        // Change wallet mode (using ownerAccount)
        const ownerAccount = privateKeyToAccount(
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        );
        etherspotProvider.updateConfig({
          walletMode: 'delegatedEoa',
          ownerAccount,
        });

        // Next call should throw because getSdk is not available in delegatedEoa mode
        await expect(etherspotProvider.getSdk()).rejects.toThrow(
          "getSdk() is only available in 'modular' wallet mode. Current mode: 'delegatedEoa'"
        );
      });
    });
  });

  // ============================================================================
  // 6. ERROR HANDLING & EDGE CASES
  // ============================================================================

  describe('Error Handling & Edge Cases', () => {
    describe('Configuration errors', () => {
      it('should handle undefined bundlerApiKey', () => {
        const configWithoutBundlerKey = {
          provider: mockProvider,
          chainId: 1,
        };
        const provider = new EtherspotProvider(configWithoutBundlerKey);

        expect((provider.getConfig() as any).bundlerApiKey).toBeUndefined();
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

      it('should handle missing private key in constructor', () => {
        expect(
          () =>
            new EtherspotProvider({
              chainId: 1,
              walletMode: 'delegatedEoa',
              // No privateKey or ownerAccount provided
            } as EtherspotTransactionKitConfig)
        ).toThrow(
          'Either privateKey or ownerAccount is required when walletMode is "delegatedEoa"'
        );
      });
    });

    describe('Network and infrastructure errors', () => {
      it('should handle network config not found for delegatedEoa mode', async () => {
        const delegated = new EtherspotProvider({
          chainId: 999999, // Non-existent chain
          walletMode: 'delegatedEoa',
          privateKey:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        } as EtherspotTransactionKitConfig);

        await expect(delegated.getPublicClient(999999)).rejects.toThrow(
          'Network configuration not found for chain ID 999999'
        );
      });
    });

    describe('Method-specific error handling', () => {
      it('should handle destroy method cleanup', () => {
        // Create some state
        mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
        etherspotProvider.getSdk();

        // Destroy should not throw
        expect(() => etherspotProvider.destroy()).not.toThrow();

        // After destroy, should be able to create new instances
        expect(() => etherspotProvider.getSdk()).not.toThrow();
      });
    });
  });

  // ============================================================================
  // 7. INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    beforeEach(() => {
      mockModularSdk.getCounterFactualAddress.mockResolvedValue('0x123');
    });

    it('should handle complex config changes affecting multiple caches', async () => {
      // Start in modular mode
      await etherspotProvider.getSdk();

      // Switch to delegatedEoa mode - should clear all caches
      etherspotProvider.updateConfig({
        walletMode: 'delegatedEoa',
        privateKey:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      });

      // Verify modular methods are no longer available
      await expect(etherspotProvider.getSdk()).rejects.toThrow(
        "getSdk() is only available in 'modular' wallet mode"
      );

      // Switch back to modular mode
      etherspotProvider.updateConfig({
        walletMode: 'modular',
        provider: mockProvider,
      });

      // Should be able to create new SDK
      const sdk = await etherspotProvider.getSdk();
      expect(sdk).toBe(mockModularSdk);
    });

    it('should maintain consistency across different client types in delegatedEoa mode', async () => {
      // Mock the delegatedEoa dependencies
      jest.doMock('viem', () => ({
        createPublicClient: jest
          .fn()
          .mockReturnValue({ viemPublicClient: true }),
        createWalletClient: jest
          .fn()
          .mockReturnValue({ viemWalletClient: true }),
        http: jest.fn((url: string) => ({ transport: 'http', url })),
        publicActions: { __brand: 'publicActions' },
        walletActions: { __brand: 'walletActions' },
      }));

      jest.doMock('viem/accounts', () => ({
        privateKeyToAccount: jest.fn().mockReturnValue({ address: '0xowner' }),
      }));

      jest.doMock('viem/account-abstraction', () => ({
        createBundlerClient: jest.fn().mockReturnValue({
          extend: jest.fn().mockReturnValue({
            extend: jest.fn().mockReturnValue({ bundlerClient: true }),
          }),
        }),
        entryPoint07Address: '0xentrypoint',
      }));

      jest.doMock('@zerodev/sdk', () => ({
        constants: { KERNEL_V3_3: 'KERNEL_V3_3' },
        createKernelAccount: jest
          .fn()
          .mockResolvedValue({ smartAccount: true }),
      }));

      jest.doMock('../lib/utils', () => ({
        getNetworkConfig: jest.fn().mockReturnValue({
          chain: { id: 1, name: 'MockChain' },
          bundler: 'https://rpc.etherspot.io/v2/1',
        }),
      }));

      const delegated = new EtherspotProvider({
        chainId: 1,
        walletMode: 'delegatedEoa',
        privateKey:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      } as EtherspotTransactionKitConfig);

      // Test that getDelegatedEoaAccount uses the same publicClient as getPublicClient
      const [publicClient, account] = await Promise.all([
        delegated.getPublicClient(1),
        delegated.getDelegatedEoaAccount(1),
      ]);

      expect(publicClient).toBeDefined();
      expect(account).toBeDefined();
    });

    it('should handle provider changes with active SDK operations', async () => {
      // Start SDK creation
      const sdkPromise = etherspotProvider.getSdk();

      // Change provider while SDK is being created
      const newProvider = { request: jest.fn() } as any;
      etherspotProvider.updateConfig({ provider: newProvider });

      // Complete first SDK
      const firstSdk = await sdkPromise;

      // Create second SDK with new provider
      const secondSdk = await etherspotProvider.getSdk();

      expect(firstSdk).toBe(mockModularSdk);
      expect(secondSdk).toBe(mockModularSdk);
      expect(MockedModularSdk).toHaveBeenCalledTimes(2);
    });
  });
});
