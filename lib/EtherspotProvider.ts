/* eslint-disable no-await-in-loop */
import {
  EtherspotBundler,
  Factory,
  ModularSdk,
  WalletProvider,
  WalletProviderLike,
} from '@etherspot/modular-sdk';
import { isEqual } from 'lodash';
import { Chain } from 'viem';

// interfaces
import { EtherspotProviderConfig } from './interfaces';

export class EtherspotProvider {
  private sdkPerChain: { [chainId: number]: ModularSdk | Promise<ModularSdk> } =
    {};

  private prevProvider: WalletProviderLike | null = null;

  private config: EtherspotProviderConfig;

  /**
   * Creates a new EtherspotProvider instance.
   * @param config - The provider configuration.
   */
  constructor(config: EtherspotProviderConfig) {
    this.config = config;
  }

  /**
   * Updates the provider configuration.
   * @param newConfig - Partial configuration to merge with the current config.
   * @returns The EtherspotProvider instance (for chaining).
   */
  updateConfig(newConfig: Partial<EtherspotProviderConfig>): this {
    this.config = { ...this.config, ...newConfig };
    return this;
  }

  /**
   * Gets an SDK instance for a specific chain.
   * @param sdkChainId - The chain ID for the SDK instance (defaults to current config chainId).
   * @param forceNewInstance - If true, forces creation of a new SDK instance.
   * @param customChain - Optional custom chain configuration.
   * @returns A promise that resolves to a ModularSdk instance.
   * @throws {Error} If the SDK cannot be initialized after 3 attempts to get the counter factual address.
   */
  async getSdk(
    sdkChainId: number = this.config.chainId,
    forceNewInstance: boolean = false,
    customChain?: Chain
  ): Promise<ModularSdk> {
    const providerChanged =
      this.prevProvider && !isEqual(this.prevProvider, this.config.provider);

    if (this.sdkPerChain[sdkChainId] && !forceNewInstance && !providerChanged) {
      return this.sdkPerChain[sdkChainId];
    }

    this.sdkPerChain[sdkChainId] = (async () => {
      const etherspotModularSdk = new ModularSdk(
        this.config.provider as WalletProvider,
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
          console.error(
            `Attempt ${i} failed to get counter factual address when initialising the Etherspot Modular SDK:`,
            error
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

      this.prevProvider = this.config.provider;
      return etherspotModularSdk;
    })();

    return this.sdkPerChain[sdkChainId];
  }

  /**
   * Gets the current provider.
   * @returns The WalletProviderLike instance.
   */
  getProvider(): WalletProviderLike {
    return this.config.provider;
  }

  /**
   * Gets the current chain ID.
   * @returns The chain ID as a number.
   */
  getChainId(): number {
    return this.config.chainId;
  }

  /**
   * Clears all cached SDK instances.
   * @returns The EtherspotProvider instance (for chaining).
   */
  clearSdkCache(): this {
    this.sdkPerChain = {};
    return this;
  }

  /**
   * Clears all caches (SDK and provider).
   * @returns The EtherspotProvider instance (for chaining).
   */
  clearAllCaches(): this {
    this.clearSdkCache();
    return this;
  }

  /**
   * Gets a copy of the current provider configuration.
   * @returns The EtherspotProviderConfig object.
   */
  getConfig(): EtherspotProviderConfig {
    return { ...this.config };
  }

  /**
   * Destroys the provider and cleans up resources.
   */
  destroy(): void {
    this.sdkPerChain = {};
    this.prevProvider = null;
  }
}
