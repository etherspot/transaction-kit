import { isValidEip1271Signature } from '@etherspot/eip1271-verification-util';
import { BigNumber, BigNumberish } from 'ethers';
import {
  formatUnits,
  checksumAddress as getAddress,
  isAddress,
  parseUnits,
  zeroAddress as zeroAddressConstant,
} from 'viem';

// utils
import { addressesEqual } from '../utils/common';

interface IEtherspotUtilsHook {
  checksumAddress: (address: string) => string;
  verifyEip1271Message: (
    address: string,
    hash: string,
    signature: string,
    rpcUrls: string[]
  ) => Promise<boolean>;
  toBigNumber: (number: string | number) => BigNumber;
  parseBigNumber: (number: BigNumberish) => string;
  isZeroAddress: (address: string) => boolean;
  addressesEqual: (address1: string, address2: string) => boolean;
}

/**
 * Hook that exposes various Etherspot and EVM related utils
 * @returns {IEtherspotUtilsHook} - utils related to Etherspot and EVM
 */
const useEtherspotUtils = (): IEtherspotUtilsHook => {
  const checksumAddress = (address: string) => {
    if (!isAddress(address)) {
      throw new Error('Invalid address');
    }
    return getAddress(address.toLowerCase() as `0x${string}`);
  };

  const verifyEip1271Message = async (
    address: string,
    hash: string,
    signature: string,
    rpcUrls: string[]
  ) => {
    return isValidEip1271Signature(rpcUrls, address, hash, signature);
  };

  const toBigNumber = (number: string | number, decimals: number = 18) => {
    return BigNumber.from(parseUnits(`${number}`, decimals));
  };

  const parseBigNumber = (number: BigNumberish, decimals: number = 18) => {
    return formatUnits(BigNumber.from(number).toBigInt(), decimals);
  };

  const isZeroAddress = (address: string) => {
    const zeroAddresses = [
      zeroAddressConstant,
      '0x000000000000000000000000000000000000dEaD',
      '0xdeaDDeADDEaDdeaDdEAddEADDEAdDeadDEADDEaD',
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd',
      '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
    ];
    return zeroAddresses.some((zeroAddress) =>
      addressesEqual(zeroAddress, address)
    );
  };

  return {
    checksumAddress,
    verifyEip1271Message,
    toBigNumber,
    parseBigNumber,
    isZeroAddress,
    addressesEqual,
  };
};

export default useEtherspotUtils;
