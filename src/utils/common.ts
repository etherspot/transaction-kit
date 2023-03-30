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
