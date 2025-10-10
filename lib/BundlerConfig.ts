// network
import { getNetworkConfig } from './network';

/**
 * BundlerConfig utility for managing bundler URLs with API keys.
 *
 * @remarks
 * Handles bundler URL construction and API key management for both modular and delegatedEoa modes.
 * Supports flexible API key parameter formats (query params, path segments, etc.).
 */
export class BundlerConfig {
  readonly url: string;
  readonly apiKey: string | undefined;
  readonly chainId: string;

  /**
   * Creates a BundlerConfig instance.
   *
   * @param chainId - The chain ID to get bundler URL for.
   * @param apiKey - Optional API key for the bundler.
   * @param bundlerUrl - Optional custom bundler URL (overrides network config).
   * @param apiKeyFormat - Optional format string for how to append the API key.
   *                       Examples:
   *                       - '?api-key=' (default, query parameter)
   *                       - '?apikey='
   *                       - '/api-key/'
   *                       - '&key='
   *                       - Or leave empty to append the key directly to the URL
   * @throws {Error} If no bundler URL is available for the chain.
   */
  constructor(
    chainId: number,
    apiKey?: string,
    bundlerUrl?: string,
    apiKeyFormat?: string
  ) {
    this.chainId = chainId.toString();
    this.apiKey = apiKey;

    // Get bundler URL from network config if not provided
    if (!bundlerUrl) {
      const networkConfig = getNetworkConfig(chainId);
      if (!networkConfig || networkConfig.bundler === '') {
        throw new Error(`No bundler url provided for chain ID ${chainId}`);
      }
      bundlerUrl = networkConfig.bundler;
    }

    // Append API key if provided
    if (apiKey) {
      if (apiKeyFormat) {
        // Use custom format - just concatenate bundlerUrl + apiKeyFormat + apiKey
        // This gives maximum flexibility for any format (/, ?, &, etc.)
        this.url = bundlerUrl + apiKeyFormat + apiKey;
      } else {
        if (bundlerUrl.includes('?api-key=')) {
          this.url = bundlerUrl + apiKey;
        } else {
          this.url = `${bundlerUrl}?api-key=${apiKey}`;
        }
      }
    } else {
      this.url = bundlerUrl;
    }
  }
}
