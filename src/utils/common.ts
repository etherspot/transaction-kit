import { ethers } from 'ethers';

// types
import { TypePerId } from '../types/Helper';

export async function sleep(seconds: number) {
  return new Promise((resolve) =>setTimeout(resolve, seconds * 1000));
}

export const getObjectSortedByKeys = (
  object: TypePerId<any>,
) => Object.keys(object).sort().map((key) => object[key]);

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

export const prepareValueForRpcCall = (rawValue: any): string | undefined => {
  let value;

  try {
    const valueBN = ethers.BigNumber.isBigNumber(rawValue) ? rawValue : ethers.BigNumber.from(rawValue);
    if (!valueBN.isZero()) value = valueBN.toHexString();
  } catch (e) {
    //
  }

  return value;
};

export const switchWalletProviderToChain = async (chainId: number): Promise<boolean> => {
  // @ts-ignore
  if (!window?.ethereum) {
    alert('Unsupported browser!');
    return false;
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ethers.utils.hexValue(chainId) }], // chainId must be in hex
    });
    return true;
  } catch (e) {
    alert('Failed to switch chain!');
    console.warn('Failed to switch chain', e);
  }

  return false;
};
