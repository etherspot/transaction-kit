/* eslint-disable quotes */
// constants
import { Chain } from 'viem';
import {
  NETWORK_NAME_TO_CHAIN_ID,
  NetworkConfig,
  NetworkNames,
  Networks,
} from './constants';

export const CHAIN_ID_TO_NETWORK_NAME: { [key: number]: NetworkNames } =
  Object.entries(NETWORK_NAME_TO_CHAIN_ID).reduce(
    (result, [networkName, chainId]) => ({
      ...result,
      [chainId]: networkName,
    }),
    {}
  );

export function getNetworkConfig(key: number): NetworkConfig | undefined {
  return Networks[key];
}

/**
 * Converts a chain ID to a viem Chain object.
 *
 * @param chainId - The chain ID to convert
 * @returns The viem Chain object for the given chain ID
 * @throws {Error} If the chain ID is not supported or recognized
 */
export function getChainFromId(chainId: number): Chain {
  const networkConfig = getNetworkConfig(chainId);

  if (!networkConfig) {
    const supportedChainIds = Object.keys(Networks)
      .map(Number)
      .sort((a, b) => a - b);
    throw new Error(
      `Unsupported chain ID: ${chainId}. ` +
        `Supported chain IDs: ${supportedChainIds.join(', ')}`
    );
  }

  if (!networkConfig.chain) {
    throw new Error(
      `Chain object not available for chain ID: ${chainId}. ` +
        "This may be a custom network that doesn't have a viem chain definition."
    );
  }

  return networkConfig.chain;
}
