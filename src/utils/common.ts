/* eslint-disable @typescript-eslint/no-explicit-any */
import { sortBy } from 'lodash';
import { toHex } from 'viem';

// types
import { TypePerId } from '../types/Helper';

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
