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

// network
import { getNetworkConfig } from './network';

// interfaces
import {
  BundlerClientExtended,
  DelegatedEoaModeConfig,
  EtherspotTransactionKitConfig,
  WalletMode,
} from './interfaces';

// utils
import { log, sanitizeObject } from './utils';

export class EtherspotProvider {
  private sdkPerChain: { [chainId: number]: ModularSdk | Promise<ModularSdk> } =
    {};

  private prevProvider: WalletProviderLike | null = null;

  private prevDelegatedEoaConfig: DelegatedEoaModeConfig | null = null;

  private config: EtherspotTransactionKitConfig;

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
   * @throws {Error} If privateKey is missing in delegatedEoa mode.
   */
  constructor(config: EtherspotTransactionKitConfig) {
    // Validate chainId (required for all modes)
    if (!config.chainId || config.chainId <= 0) {
      throw new Error(
        'Valid chainId is required in EtherspotTransactionKitConfig. Please provide a valid chain ID number.'
      );
    }

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
      // DelegatedEoa mode requires privateKey
      const delegatedEoaConfig = config as Extract<
        EtherspotTransactionKitConfig,
        { walletMode: 'delegatedEoa' }
      >;
      if (!delegatedEoaConfig.privateKey) {
        throw new Error(
          'privateKey is required when walletMode is "delegatedEoa". Please provide a private key in the configuration.'
        );
      }
    }

    this.config = config;
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
      bundlerUrl: delegatedEoaConfig.bundlerUrl,
      bundlerApiKey: delegatedEoaConfig.bundlerApiKey,
      bundlerApiKeyFormat: delegatedEoaConfig.bundlerApiKeyFormat,
      walletMode: 'delegatedEoa',
    };
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
      newConfig.walletMode && newConfig.walletMode !== this.config.walletMode;

    this.config = {
      ...this.config,
      ...newConfig,
    } as EtherspotTransactionKitConfig;

    // Clear all caches if wallet mode changed
    if (walletModeChanged) {
      this.clearAllCaches();
    } else if (this.getWalletMode() === 'delegatedEoa') {
      // Check if delegatedEoa config changed
      const newConfigObject = this.createDelegatedEoaConfigObject(this.config);
      if (
        this.prevDelegatedEoaConfig &&
        !isEqual(this.prevDelegatedEoaConfig, newConfigObject)
      ) {
        this.clearDelegatedEoaCache();
      }
      this.prevDelegatedEoaConfig = newConfigObject;
    }

    return this.sanitized;
  }

  /**
   * Creates a BundlerConfig instance for the specified chain.
   * @param chainId - The chain ID to create bundler config for.
   * @returns A BundlerConfig instance.
   * @private
   */
  private createBundlerConfig(chainId: number): BundlerConfig {
    const delegatedEoaConfig =
      this.config.walletMode === 'delegatedEoa' ? this.config : null;

    return new BundlerConfig(
      chainId,
      this.config.bundlerApiKey,
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
    sdkChainId: number = this.config.chainId,
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

    // Cast to modular config once since we know we're in modular mode
    const modularConfig = this.config as Extract<
      EtherspotTransactionKitConfig,
      { walletMode?: 'modular' }
    >;

    // Check if provider has changed
    // If prevProvider is null (reset or first time), treat as changed
    const providerChanged =
      !this.prevProvider || !isEqual(this.prevProvider, modularConfig.provider);

    if (
      sdkChainId in this.sdkPerChain &&
      !forceNewInstance &&
      !providerChanged
    ) {
      return this.sdkPerChain[sdkChainId];
    }

    this.sdkPerChain[sdkChainId] = (async () => {
      const etherspotModularSdk = new ModularSdk(
        modularConfig.provider as WalletProvider,
        {
          chainId: +sdkChainId,
          chain: customChain,
          bundlerProvider: new EtherspotBundler(
            +sdkChainId,
            this.config.bundlerApiKey ?? '__ETHERSPOT_BUNDLER_API_KEY__'
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
            this.config.debugMode
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
        const modularConfig = this.config as Extract<
          EtherspotTransactionKitConfig,
          { walletMode?: 'modular' }
        >;
        this.prevProvider = modularConfig.provider;
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
    chainId: number = this.config.chainId
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
          this.config.debugMode
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
          this.config.debugMode
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
    chainId: number = this.config.chainId
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
          this.config.debugMode
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
          this.config.debugMode
        );
        throw error;
      }
    })();

    return this.delegatedEoaAccountPerChain[chainId];
  }

  /**
   * Gets the owner account (EOA) from the private key in config (delegatedEoa mode).
   *
   * @param chainId - (Optional) The chain ID.
   * @returns A promise that resolves to the owner account created from the private key.
   * @throws {Error} If wallet mode is not 'delegatedEoa' or private key is not available.
   *
   * @remarks
   * - Only available in delegatedEoa wallet mode.
   * - Creates a new account instance each time (no caching needed for simple account creation).
   * - This is the same account used internally in getDelegatedEoaAccount().
   */
  async getOwnerAccount(
    chainId: number = this.config.chainId
  ): Promise<LocalAccount> {
    if (this.getWalletMode() !== 'delegatedEoa') {
      throw new Error(
        `getOwnerAccount() is only available in 'delegatedEoa' wallet mode. ` +
          `Current mode: '${this.getWalletMode()}'. ` +
          `Please set walletMode: 'delegatedEoa' in your configuration.`
      );
    }

    const delegatedEoaConfig = this.config as Extract<
      EtherspotTransactionKitConfig,
      { walletMode: 'delegatedEoa' }
    >;

    if (!delegatedEoaConfig.privateKey) {
      throw new Error(
        'getOwnerAccount(): privateKey not found in config. ' +
          'Please ensure the privateKey is set in config.'
      );
    }

    // Create owner account from private key
    const owner = privateKeyToAccount(delegatedEoaConfig.privateKey as Hex);

    log(
      `[EtherspotProvider] getOwnerAccount(): Created owner account ${owner.address} for chain ${chainId}`,
      { ownerAddress: owner.address },
      this.config.debugMode
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
    chainId: number = this.config.chainId
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
          this.config.debugMode
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
          this.config.debugMode
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
    chainId: number = this.config.chainId
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
          this.config.debugMode
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
          this.config.debugMode
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

    const modularConfig = this.config as Extract<
      EtherspotTransactionKitConfig,
      { walletMode?: 'modular' }
    >;

    return modularConfig.provider;
  }

  /**
   * Gets the current chain ID.
   * @returns The chain ID as a number.
   */
  getChainId(): number {
    return this.config.chainId;
  }

  /**
   * Gets the current wallet mode.
   * @returns The wallet mode ('modular' or 'delegatedEoa'), defaults to 'modular' if not set.
   */
  getWalletMode(): WalletMode {
    return this.config.walletMode ?? 'modular';
  }

  /**
   * Clears all cached SDK instances (modular mode).
   * @returns A sanitized EtherspotProvider instance (for chaining).
   */
  clearSdkCache(): this {
    this.sdkPerChain = {};
    return this.sanitized;
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
    return this.sanitized;
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
    return this.sanitized;
  }

  /**
   * Gets a copy of the current provider configuration with sensitive data sanitized.
   * @returns The EtherspotTransactionKitConfig object with private keys and API keys removed.
   */
  getConfig(): EtherspotTransactionKitConfig {
    return sanitizeObject(this.config) as EtherspotTransactionKitConfig;
  }

  /**
   * Returns a sanitized version of this instance.
   * This getter automatically sanitizes sensitive data when accessed.
   */
  get sanitized(): this {
    return sanitizeObject(this) as this;
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
      this.config.debugMode
    );
  }
}
