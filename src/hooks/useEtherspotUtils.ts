import { ethers } from 'ethers';
import { isValidEip1271Signature } from '@etherspot/eip1271-verification-util';

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
  toBigNumber: (number: string | number) => ethers.BigNumber;
  parseBigNumber: (number: ethers.BigNumberish) => string;
  isZeroAddress: (address: string) => boolean;
  addressesEqual: (address1: string, address2: string) => boolean;
}

/**
 * Hook that exposes various Etherspot and EVM related utils
 * @returns {IEtherspotUtilsHook} - utils related to Etherspot and EVM
 */
const useEtherspotUtils = (): IEtherspotUtilsHook => {

  const checksumAddress = (address: string) => {
    if (!ethers.utils.isAddress(address)) {
      throw new Error('Invalid address');
    }
    return ethers.utils.getAddress(address.toLowerCase());
  }

  const verifyEip1271Message = async (
    address: string,
    hash: string,
    signature: string,
    rpcUrls: string[]
  ) => {
    return isValidEip1271Signature(
      rpcUrls,
      address,
      hash,
      signature
    );
  }

  const toBigNumber = (number: string | number, decimals: number = 18) => {
    return ethers.utils.parseUnits(`${number}`, decimals);
  }

  const parseBigNumber = (number: ethers.BigNumberish, decimals: number = 18) => {
    return ethers.utils.formatUnits(number, decimals);
  }

  const isZeroAddress = (address: string) => {
    const zeroAddresses = [
      ethers.constants.AddressZero,
      '0x000000000000000000000000000000000000dEaD',
      '0xdeaDDeADDEaDdeaDdEAddEADDEAdDeadDEADDEaD',
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd',
      '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
    ];
    return zeroAddresses.some((zeroAddress) => addressesEqual(zeroAddress, address));
  }

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
