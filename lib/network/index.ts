// constants
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
