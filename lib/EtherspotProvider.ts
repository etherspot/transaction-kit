/* eslint-disable quotes */
import {
  EtherspotBundler,
  Factory,
  ModularSdk,
  WalletProvider,
  WalletProviderLike,
} from '@etherspot/modular-sdk';
import {
  constants,
  createKernelAccount,
  type KernelSmartAccountImplementation,
} from '@zerodev/sdk';
import { isEqual } from 'lodash';
import {
  Chain,
  Hex,
  LocalAccount,
  createPublicClient,
  createWalletClient,
  http,
  publicActions,
  walletActions,
  type PublicClient,
  type WalletClient,
} from 'viem';
import {
  createBundlerClient,
  entryPoint07Address,
  type SmartAccount,
} from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';

// bundler
import { BundlerConfig } from './BundlerConfig';

// interfaces
import {
  BundlerClientExtended,
  DelegatedEoaModeConfig,
  EtherspotTransactionKitConfig,
  PrivateConfig,
  PublicConfig,
  WalletMode,
} from './interfaces';

// utils
import { getNetworkConfig, log } from './utils';

export class EtherspotProvider {
  // Security: private fields (#) to prevent external access
  #privateConfig: PrivateConfig;
  #publicConfig: PublicConfig;

  private sdkPerChain: { [chainId: number]: ModularSdk | Promise<ModularSdk> } =
    {};

  private prevProvider: WalletProviderLike | null = null;

  private prevDelegatedEoaConfig: DelegatedEoaModeConfig | null = null;

  // delegatedEoa mode infrastructure
  private publicClientPerChain: {
    [chainId: number]: PublicClient | Promise<PublicClient>;
  } = {};

  private delegatedEoaAccountPerChain: {
    [chainId: number]:
      | SmartAccount<KernelSmartAccountImplementation<'0.7'>>
      | Promise<SmartAccount<KernelSmartAccountImplementation<'0.7'>>>;
  } = {};

  private bundlerClientPerChain: {
    [chainId: number]: BundlerClientExtended | Promise<BundlerClientExtended>;
  } = {};

  private walletClientPerChain: {
    [chainId: number]: WalletClient | Promise<WalletClient>;
  } = {};

  /**
   * Creates a new EtherspotProvider instance.
   * @param config - The provider configuration.
   * @throws {Error} If provider is not provided in modular mode.
   * @throws {Error} If chainId is invalid.
   * @throws {Error} If neither privateKey nor viemLocalAcocunt is provided in delegatedEoa mode.
   * @throws {Error} If both privateKey and viemLocalAcocunt are provided in delegatedEoa mode.
   */
  constructor(config: EtherspotTransactionKitConfig) {
    // Validate chainId (required for all modes)
    if (!config.chainId || config.chainId <= 0) {
      throw new Error(
        'Valid chainId is required in EtherspotTransactionKitConfig. Please provide a valid chain ID number.'
      );
    }

    // Security: Separate sensitive and public data
    this.#privateConfig = {
      privateKey: 'privateKey' in config ? config.privateKey : undefined,
      viemLocalAcocunt:
        'viemLocalAcocunt' in config ? config.viemLocalAcocunt : undefined,
      bundlerApiKey:
        'bundlerApiKey' in config ? config.bundlerApiKey : undefined,
      bundlerApiKeyFormat:
        'bundlerApiKeyFormat' in config
          ? config.bundlerApiKeyFormat
          : undefined,
    };

    this.#publicConfig = {
      chainId: config.chainId,
      walletMode: config.walletMode,
      debugMode: config.debugMode,
      bundlerUrl: 'bundlerUrl' in config ? config.bundlerUrl : undefined,
      provider: 'provider' in config ? config.provider : undefined,
    };

    // Validate mode-specific requirements
    if (config.walletMode === 'modular' || !config.walletMode) {
      // Modular mode requires provider
      const modularConfig = config as Extract<
        EtherspotTransactionKitConfig,
        { walletMode?: 'modular' }
      >;
      if (!modularConfig.provider) {
        throw new Error(
          'Provider is required when walletMode is "modular" (or not specified). Please provide a valid WalletProviderLike instance.'
        );
      }
    } else if (config.walletMode === 'delegatedEoa') {
      // DelegatedEoa mode requires either privateKey or viemLocalAcocunt (but not both)
      const delegatedEoaConfig = config as Extract<
        EtherspotTransactionKitConfig,
        { walletMode: 'delegatedEoa' }
      >;
      const hasPrivateKey = !!delegatedEoaConfig.privateKey;
      const hasViemLocalAcocunt = !!delegatedEoaConfig.viemLocalAcocunt;

      if (!hasPrivateKey && !hasViemLocalAcocunt) {
        throw new Error(
          'Either privateKey or viemLocalAcocunt is required when walletMode is "delegatedEoa". Please provide a private key or a LocalAccount (viemLocalAcocunt) in the configuration.'
        );
      }

      if (hasPrivateKey && hasViemLocalAcocunt) {
        throw new Error(
          'Cannot provide both privateKey and viemLocalAcocunt in delegatedEoa mode. Please provide either privateKey or viemLocalAcocunt, but not both.'
        );
      }
    }
  }

  /**
   * Creates a config object for delegatedEoa change detection.
   * @private
   */
  private createDelegatedEoaConfigObject(
    config: EtherspotTransactionKitConfig
  ): DelegatedEoaModeConfig | null {
    if (config.walletMode !== 'delegatedEoa') {
      return null;
    }

    const delegatedEoaConfig = config as Extract<
      EtherspotTransactionKitConfig,
      { walletMode: 'delegatedEoa' }
    >;

    return {
      chainId: delegatedEoaConfig.chainId,
      privateKey: delegatedEoaConfig.privateKey,
      // Store viemLocalAcocunt address as string for comparison (not in DelegatedEoaModeConfig type)
      viemLocalAcocuntAddress: delegatedEoaConfig.viemLocalAcocunt?.address,
      bundlerUrl: delegatedEoaConfig.bundlerUrl,
      bundlerApiKey: delegatedEoaConfig.bundlerApiKey,
      bundlerApiKeyFormat: delegatedEoaConfig.bundlerApiKeyFormat,
      walletMode: 'delegatedEoa',
    } as DelegatedEoaModeConfig & { ownerAccountAddress?: string };
  }

  /**
   * Updates the provider configuration.
   * @param newConfig - Partial configuration to merge with the current config.
   * @returns The EtherspotProvider instance (for chaining).
   *
   * @remarks
   * - If walletMode changes, all caches are cleared (different infrastructure needed).
   * - Provider changes are detected automatically in getter methods via prevProvider tracking.
   * - This lazy approach prevents race conditions with in-flight async operations.
   */
  updateConfig(newConfig: Partial<EtherspotTransactionKitConfig>): this {
    // Validate new config values
    if (
      'provider' in newConfig &&
      newConfig.provider !== undefined &&
      !newConfig.provider
    ) {
      throw new Error(
        'Invalid provider in updateConfig. Provider cannot be null or undefined.'
      );
    }
    if (newConfig.chainId !== undefined && newConfig.chainId <= 0) {
      throw new Error(
        'Invalid chainId in updateConfig. Please provide a valid chain ID number.'
      );
    }

    const walletModeChanged =
      newConfig.walletMode &&
      newConfig.walletMode !== this.#publicConfig.walletMode;

    // Validate delegatedEoa mode requirements if we'll be in that mode after update
    const finalWalletMode =
      newConfig.walletMode ?? this.#publicConfig.walletMode;

    if (finalWalletMode === 'delegatedEoa') {
      // Calculate what will exist after update (accounting for clearing logic):
      // - If setting privateKey, viemLocalAcocunt will be cleared
      // - If setting viemLocalAcocunt, privateKey will be cleared
      // - If setting neither, both keep their current values
      const willHavePrivateKey =
        'privateKey' in newConfig
          ? !!newConfig.privateKey
          : 'viemLocalAcocunt' in newConfig
            ? false // Will be cleared when viemLocalAcocunt is set
            : !!this.#privateConfig.privateKey;

      const willHaveViemLocalAcocunt =
        'viemLocalAcocunt' in newConfig
          ? !!newConfig.viemLocalAcocunt
          : 'privateKey' in newConfig
            ? false // Will be cleared when privateKey is set
            : !!this.#privateConfig.viemLocalAcocunt;

      if (!willHavePrivateKey && !willHaveViemLocalAcocunt) {
        throw new Error(
          'Either privateKey or viemLocalAcocunt is required when walletMode is "delegatedEoa". Please provide a private key or a LocalAccount (viemLocalAcocunt) in the configuration.'
        );
      }

      if (willHavePrivateKey && willHaveViemLocalAcocunt) {
        throw new Error(
          'Cannot provide both privateKey and viemLocalAcocunt in delegatedEoa mode. Please provide either privateKey or viemLocalAcocunt, but not both.'
        );
      }
    }

    // Security: Update both private and public configs separately
    // When switching between privateKey and viemLocalAcocunt, clear the opposite field
    this.#privateConfig = {
      ...this.#privateConfig,
      privateKey:
        'privateKey' in newConfig
          ? newConfig.privateKey
          : 'viemLocalAcocunt' in newConfig
            ? undefined // Clear privateKey if viemLocalAcocunt is being set
            : this.#privateConfig.privateKey,
      viemLocalAcocunt:
        'viemLocalAcocunt' in newConfig
          ? newConfig.viemLocalAcocunt
          : 'privateKey' in newConfig
            ? undefined // Clear viemLocalAcocunt if privateKey is being set
            : this.#privateConfig.viemLocalAcocunt,
      bundlerApiKey:
        'bundlerApiKey' in newConfig
          ? newConfig.bundlerApiKey
          : this.#privateConfig.bundlerApiKey,
      bundlerApiKeyFormat:
        'bundlerApiKeyFormat' in newConfig
          ? newConfig.bundlerApiKeyFormat
          : this.#privateConfig.bundlerApiKeyFormat,
    };

    this.#publicConfig = {
      ...this.#publicConfig,
      chainId: newConfig.chainId ?? this.#publicConfig.chainId,
      walletMode: newConfig.walletMode ?? this.#publicConfig.walletMode,
      debugMode: newConfig.debugMode ?? this.#publicConfig.debugMode,
      bundlerUrl:
        'bundlerUrl' in newConfig
          ? newConfig.bundlerUrl
          : this.#publicConfig.bundlerUrl,
      provider:
        'provider' in newConfig
          ? newConfig.provider
          : this.#publicConfig.provider,
    };

    // Clear all caches if wallet mode changed
    if (walletModeChanged) {
      this.clearAllCaches();
    } else if (this.getWalletMode() === 'delegatedEoa') {
      // Check if delegatedEoa config changed
      const newConfigObject = this.createDelegatedEoaConfigObject({
        ...this.#publicConfig,
        ...this.#privateConfig,
      } as EtherspotTransactionKitConfig);
      if (!isEqual(this.prevDelegatedEoaConfig, newConfigObject)) {
        this.clearDelegatedEoaCache();
      }
      this.prevDelegatedEoaConfig = newConfigObject;
    }

    return this;
  }

  /**
   * Creates a BundlerConfig instance for the specified chain.
   * @param chainId - The chain ID to create bundler config for.
   * @returns A BundlerConfig instance.
   * @private
   */
  private createBundlerConfig(chainId: number): BundlerConfig {
    const delegatedEoaConfig =
      this.#publicConfig.walletMode === 'delegatedEoa'
        ? {
            bundlerUrl: this.#publicConfig.bundlerUrl,
            bundlerApiKeyFormat: this.#privateConfig.bundlerApiKeyFormat,
          }
        : null;

    return new BundlerConfig(
      chainId,
      this.#privateConfig.bundlerApiKey,
      delegatedEoaConfig?.bundlerUrl,
      delegatedEoaConfig?.bundlerApiKeyFormat
    );
  }

  /**
   * Gets an SDK instance for a specific chain.
   * @param sdkChainId - The chain ID for the SDK instance (defaults to current config chainId).
   * @param forceNewInstance - If true, forces creation of a new SDK instance.
   * @param customChain - Optional custom chain configuration.
   * @returns A promise that resolves to a ModularSdk instance.
   * @throws {Error} If the SDK cannot be initialized after 3 attempts to get the counter factual address.
   * @throws {Error} If wallet mode is not 'modular'.
   */
  async getSdk(
    sdkChainId: number = this.#publicConfig.chainId,
    forceNewInstance: boolean = false,
    customChain?: Chain
  ): Promise<ModularSdk> {
    // Only support modular SDK when walletMode is 'modular'
    if (this.getWalletMode() !== 'modular') {
      throw new Error(
        `getSdk() is only available in 'modular' wallet mode. ` +
          `Current mode: '${this.getWalletMode()}'. ` +
          `Please set walletMode: 'modular' in your configuration or use delegatedEoa mode methods.`
      );
    }

    // Check if provider has changed
    // If prevProvider is null (reset or first time), treat as changed
    const providerChanged =
      !this.prevProvider ||
      !isEqual(this.prevProvider, this.#publicConfig.provider);

    if (
      sdkChainId in this.sdkPerChain &&
      !forceNewInstance &&
      !providerChanged
    ) {
      return this.sdkPerChain[sdkChainId];
    }

    this.sdkPerChain[sdkChainId] = (async () => {
      const etherspotModularSdk = new ModularSdk(
        this.#publicConfig.provider as WalletProvider,
        {
          chainId: +sdkChainId,
          chain: customChain,
          bundlerProvider: new EtherspotBundler(
            +sdkChainId,
            this.#privateConfig.bundlerApiKey ?? '__ETHERSPOT_BUNDLER_API_KEY__'
          ),
          factoryWallet: 'etherspot' as Factory,
        }
      );

      // Retry 3 times to load the address into SDK state
      for (let i = 1; i <= 3; i++) {
        try {
          await etherspotModularSdk.getCounterFactualAddress();
          break;
        } catch (error) {
          log(
            `[EtherspotProvider] getSdk(): Attempt ${i}/3 failed to get counter factual address`,
            error,
            this.#publicConfig.debugMode
          );

          if (i < 3) {
            await new Promise((resolve) => {
              setTimeout(resolve, 1000);
            }); // Wait 1 sec before retrying
          } else {
            throw new Error(
              'Failed to get counter factual address when initialising the Etherspot Modular SDK after 3 attempts.'
            );
          }
        }
      }

      if (this.getWalletMode() === 'modular' || !this.getWalletMode()) {
        this.prevProvider = this.#publicConfig.provider || null;
      }
      return etherspotModularSdk;
    })();

    return this.sdkPerChain[sdkChainId];
  }

  /**
   * Gets or creates a public client for the specified chain (delegatedEoa mode).
   *
   * @param chainId - The chain ID to get the public client for.
   * @returns A promise that resolves to a PublicClient instance.
   * @throws {Error} If wallet mode is not 'delegatedEoa' or network config is not available.
   *
   * @remarks
   * - Only available in delegatedEoa wallet mode.
   * - Public clients are cached per chain for efficiency.
   * - Each chain ID gets its own client instance.
   */
  async getPublicClient(
    chainId: number = this.#publicConfig.chainId
  ): Promise<PublicClient> {
    if (this.getWalletMode() !== 'delegatedEoa') {
      throw new Error(
        "getPublicClient() is only available in 'delegatedEoa' wallet mode. " +
          `Current mode: '${this.getWalletMode()}'. ` +
          `Please set walletMode: 'delegatedEoa' in your configuration.`
      );
    }

    // Return cached client if available
    if (chainId in this.publicClientPerChain) {
      return this.publicClientPerChain[chainId];
    }

    // Create new public client
    this.publicClientPerChain[chainId] = (async () => {
      try {
        // Get network configuration
        const networkConfig = getNetworkConfig(chainId);
        if (!networkConfig) {
          throw new Error(
            `Network configuration not found for chain ID ${chainId}`
          );
        }

        // Get bundler URL with API key
        const bundlerConfig = this.createBundlerConfig(chainId);

        log(
          `[EtherspotProvider] getPublicClient(): Creating for chain ${chainId}`,
          { bundlerUrl: bundlerConfig.url },
          this.#publicConfig.debugMode
        );

        // Create public client
        const publicClient = createPublicClient({
          transport: http(bundlerConfig.url),
          chain: networkConfig.chain || undefined,
        });

        return publicClient;
      } catch (error) {
        log(
          `[EtherspotProvider] getPublicClient(): Error for chain ${chainId}`,
          error,
          this.#publicConfig.debugMode
        );
        throw error;
      }
    })();

    return this.publicClientPerChain[chainId];
  }

  /**
   * Gets or creates a delegatedEoa account for the specified chain (delegatedEoa mode).
   *
   * @param chainId - The chain ID to get the delegatedEoa account for.
   * @returns A promise that resolves to a KernelSmartAccount instance.
   * @throws {Error} If wallet mode is not 'delegatedEoa' or provider account is not available.
   *
   * @remarks
   * - Only available in delegatedEoa wallet mode.
   * - delegatedEoa accounts are cached per chain for efficiency.
   * - Each chain ID gets its own delegatedEoa account instance.
   */
  async getDelegatedEoaAccount(
    chainId: number = this.#publicConfig.chainId
  ): Promise<SmartAccount<KernelSmartAccountImplementation<'0.7'>>> {
    if (this.getWalletMode() !== 'delegatedEoa') {
      throw new Error(
        `getDelegatedEoaAccount() is only available in 'delegatedEoa' wallet mode. ` +
          `Current mode: '${this.getWalletMode()}'. ` +
          `Please set walletMode: 'delegatedEoa' in your configuration.`
      );
    }

    // Return cached account if available
    if (chainId in this.delegatedEoaAccountPerChain) {
      return this.delegatedEoaAccountPerChain[chainId];
    }

    // Create new delegatedEoa account
    this.delegatedEoaAccountPerChain[chainId] = (async () => {
      try {
        const publicClient = await this.getPublicClient(chainId);

        const owner = await this.getOwnerAccount(chainId);

        log(
          `[EtherspotProvider] getDelegatedEoaAccount(): Creating for chain ${chainId}`,
          { eip7702Account: owner.address },
          this.#publicConfig.debugMode
        );

        // Create delegatedEoa account with EIP-7702
        const delegatedEoaAccount = await createKernelAccount(publicClient, {
          entryPoint: { address: entryPoint07Address, version: '0.7' },
          kernelVersion: constants.KERNEL_V3_3,
          eip7702Account: owner,
        });

        return delegatedEoaAccount;
      } catch (error) {
        log(
          `[EtherspotProvider] getDelegatedEoaAccount(): Error for chain ${chainId}`,
          error,
          this.#publicConfig.debugMode
        );
        throw error;
      }
    })();

    return this.delegatedEoaAccountPerChain[chainId];
  }

  /**
   * Gets the owner account (EOA) from the config (delegatedEoa mode).
   * Returns the viemLocalAcocunt directly if provided, otherwise creates it from privateKey.
   *
   * @param chainId - (Optional) The chain ID.
   * @returns A promise that resolves to the owner account.
   * @throws {Error} If wallet mode is not 'delegatedEoa' or neither viemLocalAcocunt nor privateKey is available.
   *
   * @remarks
   * - Only available in delegatedEoa wallet mode.
   * - Returns the viemLocalAcocunt directly if provided in config, otherwise creates from privateKey.
   * - This is the same account used internally in getDelegatedEoaAccount().
   */
  async getOwnerAccount(
    chainId: number = this.#publicConfig.chainId
  ): Promise<LocalAccount> {
    if (this.getWalletMode() !== 'delegatedEoa') {
      throw new Error(
        `getOwnerAccount() is only available in 'delegatedEoa' wallet mode. ` +
          `Current mode: '${this.getWalletMode()}'. ` +
          `Please set walletMode: 'delegatedEoa' in your configuration.`
      );
    }

    // If viemLocalAcocunt is provided directly, return it
    if (this.#privateConfig.viemLocalAcocunt) {
      log(
        `[EtherspotProvider] getOwnerAccount(): Using provided owner account ${this.#privateConfig.viemLocalAcocunt.address} for chain ${chainId}`,
        { ownerAddress: this.#privateConfig.viemLocalAcocunt.address },
        this.#publicConfig.debugMode
      );
      return this.#privateConfig.viemLocalAcocunt;
    }

    // Otherwise, create from private key
    if (!this.#privateConfig.privateKey) {
      throw new Error(
        'getOwnerAccount(): Neither viemLocalAcocunt nor privateKey found in config. ' +
          'Please ensure either viemLocalAcocunt or privateKey is set in config.'
      );
    }

    // Create owner account from private key
    const owner = privateKeyToAccount(this.#privateConfig.privateKey as Hex);

    log(
      `[EtherspotProvider] getOwnerAccount(): Created owner account ${owner.address} from privateKey for chain ${chainId}`,
      { ownerAddress: owner.address },
      this.#publicConfig.debugMode
    );

    return owner;
  }

  /**
   * Gets or creates a wallet client for the specified chain (delegatedEoa mode).
   *
   * @param chainId - The chain ID to get the wallet client for.
   * @returns A promise that resolves to a WalletClient instance for EIP-7702 operations.
   * @throws {Error} If wallet mode is not 'delegatedEoa' or bundler config is not available.
   *
   * @remarks
   * - Only available in delegatedEoa wallet mode.
   * - Wallet clients are cached per chain for efficiency.
   * - Each chain ID gets its own client instance.
   * - Uses the bundler URL for proper EIP-7702 support.
   */
  async getWalletClient(
    chainId: number = this.#publicConfig.chainId
  ): Promise<WalletClient> {
    if (this.getWalletMode() !== 'delegatedEoa') {
      throw new Error(
        `getWalletClient() is only available in 'delegatedEoa' wallet mode. ` +
          `Current mode: '${this.getWalletMode()}'. ` +
          `Please set walletMode: 'delegatedEoa' in your configuration.`
      );
    }

    // Return cached client if available
    if (chainId in this.walletClientPerChain) {
      return this.walletClientPerChain[chainId];
    }

    // Create new wallet client
    this.walletClientPerChain[chainId] = (async () => {
      try {
        const owner = await this.getOwnerAccount(chainId);
        const bundlerConfig = this.createBundlerConfig(chainId);
        const networkConfig = getNetworkConfig(chainId);

        if (!networkConfig) {
          throw new Error(
            `Network configuration not found for chain ID ${chainId}`
          );
        }

        log(
          `[EtherspotProvider] getWalletClient(): Creating for chain ${chainId}`,
          { bundlerUrl: bundlerConfig.url, ownerAddress: owner.address },
          this.#publicConfig.debugMode
        );

        // Create wallet client with bundler URL
        const walletClient = createWalletClient({
          account: owner,
          chain: networkConfig.chain || undefined,
          transport: http(bundlerConfig.url),
        });

        return walletClient;
      } catch (error) {
        log(
          `[EtherspotProvider] getWalletClient(): Error for chain ${chainId}`,
          error,
          this.#publicConfig.debugMode
        );
        throw error;
      }
    })();

    return this.walletClientPerChain[chainId];
  }

  /**
   * Gets or creates a bundler client for the specified chain (delegatedEoa mode).
   *
   * @param chainId - The chain ID to get the bundler client for.
   * @returns A promise that resolves to an extended BundlerClient instance with publicActions and walletActions.
   * @throws {Error} If wallet mode is not 'delegatedEoa' or bundler config is not available.
   *
   * @remarks
   * - Only available in delegatedEoa wallet mode.
   * - Bundler clients are cached per chain for efficiency.
   * - Each chain ID gets its own client instance.
   * - The returned client is extended with publicActions and walletActions for full account abstraction support.
   */
  async getBundlerClient(
    chainId: number = this.#publicConfig.chainId
  ): Promise<BundlerClientExtended> {
    if (this.getWalletMode() !== 'delegatedEoa') {
      throw new Error(
        `getBundlerClient() is only available in 'delegatedEoa' wallet mode. ` +
          `Current mode: '${this.getWalletMode()}'. ` +
          `Please set walletMode: 'delegatedEoa' in your configuration.`
      );
    }

    // Return cached client if available
    if (chainId in this.bundlerClientPerChain) {
      return this.bundlerClientPerChain[chainId];
    }

    // Create new bundler client
    this.bundlerClientPerChain[chainId] = (async () => {
      try {
        const publicClient = await this.getPublicClient(chainId);

        // Get bundler URL with API key
        const bundlerConfig = this.createBundlerConfig(chainId);

        log(
          `[EtherspotProvider] getBundlerClient(): Creating for chain ${chainId}`,
          { bundlerUrl: bundlerConfig.url },
          this.#publicConfig.debugMode
        );

        // Create bundler client with extended actions for account abstraction
        const bundlerClient = createBundlerClient({
          client: publicClient,
          transport: http(bundlerConfig.url),
        })
          .extend(publicActions)
          .extend(walletActions) as unknown as BundlerClientExtended;

        return bundlerClient;
      } catch (error) {
        log(
          `[EtherspotProvider] getBundlerClient(): Error for chain ${chainId}`,
          error,
          this.#publicConfig.debugMode
        );
        throw error;
      }
    })();

    return this.bundlerClientPerChain[chainId];
  }

  /**
   * Gets the current provider.
   * @returns The WalletProviderLike instance (only available in modular mode).
   * @throws {Error} If called in delegatedEoa mode (no provider available).
   */
  getProvider(): WalletProviderLike {
    if (this.getWalletMode() === 'delegatedEoa') {
      throw new Error(
        "getProvider() is only available in 'modular' wallet mode. " +
          `Current mode: '${this.getWalletMode()}'. ` +
          'In delegatedEoa mode, use the privateKey directly for signing operations.'
      );
    }

    return this.#publicConfig.provider!;
  }

  /**
   * Gets the current chain ID.
   * @returns The chain ID as a number.
   */
  getChainId(): number {
    return this.#publicConfig.chainId;
  }

  /**
   * Gets the current wallet mode.
   * @returns The wallet mode ('modular' or 'delegatedEoa'), defaults to 'modular' if not set.
   */
  getWalletMode(): WalletMode {
    return this.#publicConfig.walletMode ?? 'modular';
  }

  /**
   * Clears all cached SDK instances (modular mode).
   * @returns A sanitized EtherspotProvider instance (for chaining).
   */
  clearSdkCache(): this {
    this.sdkPerChain = {};
    return this;
  }

  /**
   * Clears all delegatedEoa mode caches.
   * @returns A sanitized EtherspotProvider instance (for chaining).
   */
  clearDelegatedEoaCache(): this {
    this.publicClientPerChain = {};
    this.delegatedEoaAccountPerChain = {};
    this.bundlerClientPerChain = {};
    this.walletClientPerChain = {};
    return this;
  }

  /**
   * Clears all caches (both modular SDK and delegatedEoa mode).
   * @returns A sanitized EtherspotProvider instance (for chaining).
   *
   * @remarks
   * Also resets provider tracking to ensure fresh provider change detection.
   */
  clearAllCaches(): this {
    this.clearSdkCache();
    this.clearDelegatedEoaCache();
    this.prevProvider = null; // Reset provider tracking
    this.prevDelegatedEoaConfig = null; // Reset delegatedEoa config tracking
    return this;
  }

  /**
   * Gets a copy of the current public provider configuration.
   * @returns The PublicConfig object with only public data.
   */
  getConfig(): PublicConfig {
    return { ...this.#publicConfig };
  }

  /**
   * Destroys the provider and cleans up resources.
   * @remarks
   * - Clears all cached SDK and client instances.
   * - Resets provider tracking.
   * - Should be called when the provider is no longer needed to prevent memory leaks.
   */
  destroy(): void {
    this.clearAllCaches();

    log(
      '[EtherspotProvider] destroy(): All resources cleaned up',
      undefined,
      this.#publicConfig.debugMode
    );
  }
}
