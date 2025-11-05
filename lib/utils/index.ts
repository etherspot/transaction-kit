/* eslint-disable quotes */
import { sortBy } from 'lodash';
import { Chain, toHex } from 'viem';

// constants
import {
  NETWORK_NAME_TO_CHAIN_ID,
  NetworkConfig,
  NetworkNames,
  Networks,
} from '../constants';

// interfaces
import { TypePerId } from '../interfaces';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getObjectSortedByKeys = (object: TypePerId<any>) =>
  sortBy(Object.keys(object).map((key) => +key)).map((key) => object[key]);

export const isCaseInsensitiveMatch = (
  a: string | undefined,
  b: string | undefined
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};

export const addressesEqual = (
  address1: string | undefined | null,
  address2: string | undefined | null
): boolean => {
  if (address1 === address2) return true;
  if (!address1 || !address2) return false;

  return isCaseInsensitiveMatch(address1, address2);
};

export const switchWalletProviderToChain = async (
  chainId: number
): Promise<{ errorMessage?: string }> => {
  if (!window?.ethereum) {
    console.warn('Unsupported browser!');
    return { errorMessage: 'Unsupported browser!' };
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHex(chainId) }], // chainId must be in hex
    });
  } catch (e) {
    console.warn('Failed to switch chain', e);
  }

  return { errorMessage: 'Failed to switch chain!' };
};

export const parseEtherspotErrorMessage = (
  e: Error | unknown,
  defaultMessage: string
): string => {
  return (e instanceof Error && e.message) || defaultMessage;
};

/**
 * Debug utility to log messages
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (message: string, data?: any, debugMode?: boolean): void => {
  if (debugMode) {
    // eslint-disable-next-line no-console
    console.log(`[EtherspotTransactionKit] ${message}`, data || '');
  }
};

/**
 * Sensitive keys specific to TransactionKit configuration.
 * ONLY the critical security-sensitive keys that must never leak.
 */
const SENSITIVE_KEYS = [
  'privateKey',
  'viemLocalAcocunt',
  'bundlerApiKey',
  'bundlerApiKeyFormat',
];

/**
 * Sanitizes any object by recursively sanitizing all properties and nested objects.
 * This utility prevents accidental exposure of sensitive data in logs or public methods.
 *
 * @param obj - The object to sanitize
 * @returns A sanitized copy of the object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  // Handle objects
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      // Check if this key should be redacted
      if (
        SENSITIVE_KEYS.includes(key) &&
        value !== undefined &&
        value !== null
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeObject(value);
      }
    }
  }

  return sanitized;
};

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
