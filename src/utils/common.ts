import { ethers } from 'ethers';
import sortBy from 'lodash/sortBy';

// types
import { TypePerId } from '../types/Helper';

export const getObjectSortedByKeys = (
  object: TypePerId<any>,
) => sortBy(Object.keys(object).map((key) => +key)).map((key) => object[key]);

export const isCaseInsensitiveMatch = (a: string | undefined, b: string | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};

export const addressesEqual = (address1: string | undefined | null, address2: string | undefined | null): boolean => {
  if (address1 === address2) return true;
  if (!address1 || !address2) return false;

  return isCaseInsensitiveMatch(address1, address2);
};

export const switchWalletProviderToChain = async (chainId: number): Promise<{ errorMessage?: string }> => {
  // @ts-ignore
  if (!window?.ethereum) {
    console.warn('Unsupported browser!');
    return { errorMessage: 'Unsupported browser!' };
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ethers.utils.hexValue(chainId) }], // chainId must be in hex
    });
  } catch (e) {
    console.warn('Failed to switch chain', e);
  }

  return { errorMessage: 'Failed to switch chain!' };
};

export const getTokenDecimals = async (tokenAddress: string, provider: ethers.Wallet): Promise<number> => {
  const abi = ["function decimals() view returns (uint8)"];
  const contract = new ethers.Contract(tokenAddress, abi, provider);
  const decimals = await contract.decimals();
  return decimals;
};
