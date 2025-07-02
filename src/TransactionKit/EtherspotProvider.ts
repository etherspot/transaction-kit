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

export interface EtherspotProviderConfig {
  provider: WalletProviderLike;
  chainId: number;
  dataApiKey?: string;
  bundlerApiKey?: string;
}

export class EtherspotProvider {
  private sdkPerChain: { [chainId: number]: ModularSdk | Promise<ModularSdk> } =
    {};

  private prevProvider: WalletProviderLike | null = null;

  private config: EtherspotProviderConfig;

  constructor(config: EtherspotProviderConfig) {
    this.config = config;
  }

  /**
   * Update the provider configuration
   */
  updateConfig(newConfig: Partial<EtherspotProviderConfig>): this {
    this.config = { ...this.config, ...newConfig };
    return this;
  }

  /**
   * Get SDK instance for a specific chain
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
   * Get current provider
   */
  getProvider(): WalletProviderLike {
    return this.config.provider;
  }

  /**
   * Get current chain ID
   */
  getChainId(): number {
    return this.config.chainId;
  }

  /**
   * Clear all cached SDK instances
   */
  clearSdkCache(): this {
    this.sdkPerChain = {};
    return this;
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): this {
    this.clearSdkCache();
    return this;
  }

  /**
   * Get all config values
   */
  getConfig(): EtherspotProviderConfig {
    return { ...this.config };
  }

  /**
   * Destroy the provider and clean up resources
   */
  destroy(): void {
    this.sdkPerChain = {};
    this.prevProvider = null;
  }
}
