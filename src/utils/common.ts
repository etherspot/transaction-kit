import { ethers } from 'ethers';
import * as _ from 'lodash';

// types
import { TypePerId } from '../types/Helper';

export async function sleep(seconds: number) {
  return new Promise((resolve) =>setTimeout(resolve, seconds * 1000));
}

export const getObjectSortedByKeys = (
  object: TypePerId<any>,
) => _.sortBy(Object.keys(object).map((key) => +key)).map((key) => object[key]);

export const parseEtherspotErrorMessageIfAvailable = (errorMessage: string): string => {
  let etherspotErrorMessage;

  try {
    // parsing etherspot estimate error based on return scheme
    const errorMessageJson = JSON.parse(errorMessage.trim());
    etherspotErrorMessage = Object.values(errorMessageJson[0].constraints)[0] as string;
  } catch (e) {
    // unable to parse etherspot json
  }

  return etherspotErrorMessage ?? errorMessage;
};

export const isTestnetChainId = (chainId: number): boolean => {
  const testnetChainIds: number[] = [
    5, // Goerli
    97, // BscTest
    4002, // FantomTest
    80001, // Mumbai
    1313161555, // AuroraTest
    43113, // Fuji
    421613, // ArbitrumGoerli
    123, // FuseSparknet
    42170, // ArbitrumNova
    245022926, // NeonDevnet
    420, // OptimismGoerli
  ];

  return testnetChainIds.some((testnetChainId) => testnetChainId === chainId);
}

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
