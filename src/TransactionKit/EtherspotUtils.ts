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

export class EtherspotUtils {
  static checksumAddress(address: string): string {
    if (!isAddress(address)) {
      throw new Error(
        `Invalid address: ${address} at checksumAddress(). Please ensure it is a valid address starting with 0x.`
      );
    }
    return getAddress(address.toLowerCase() as `0x${string}`);
  }

  static async verifyEip1271Message(
    address: string,
    hash: string,
    signature: string,
    rpcUrls: string[]
  ): Promise<boolean> {
    return isValidEip1271Signature(rpcUrls, address, hash, signature);
  }

  static toBigNumber(
    number: string | number,
    decimals: number = 18
  ): BigNumber {
    return BigNumber.from(parseUnits(`${number}`, decimals));
  }

  static parseBigNumber(number: BigNumberish, decimals: number = 18): string {
    return formatUnits(BigNumber.from(number).toBigInt(), decimals);
  }

  static isZeroAddress(address: string): boolean {
    const zeroAddresses = [
      zeroAddressConstant,
      '0x000000000000000000000000000000000000dEaD',
      '0xdeaDDeADDEaDdeaDdEAddEADDEAdDeadDEADDEaD',
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      '0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd',
      '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
    ];
    return zeroAddresses.some((zeroAddress) =>
      this.addressesEqual(zeroAddress, address)
    );
  }

  static addressesEqual(address1: string, address2: string): boolean {
    return addressesEqual(address1, address2);
  }
}
