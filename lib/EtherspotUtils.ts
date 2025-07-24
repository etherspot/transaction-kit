import { isValidEip1271Signature } from '@etherspot/eip1271-verification-util';
import {
  Hex,
  formatUnits,
  checksumAddress as getAddress,
  isAddress,
  parseUnits,
  zeroAddress as zeroAddressConstant,
} from 'viem';

// utils
import { addressesEqual } from './utils';

export class EtherspotUtils {
  /**
   * Returns the checksummed version of an Ethereum address.
   * @param address - The address to checksum.
   * @returns The checksummed address string.
   * @throws If the address is invalid.
   */
  static checksumAddress(address: string): string {
    if (!isAddress(address)) {
      throw new Error(
        `Invalid address: ${address} at checksumAddress(). Please ensure it is a valid address starting with 0x.`
      );
    }
    return getAddress(address.toLowerCase() as `0x${string}`);
  }

  /**
   * Verifies an EIP-1271 signature for a contract wallet.
   * @param address - The contract wallet address.
   * @param hash - The message hash that was signed.
   * @param signature - The signature to verify.
   * @param rpcUrls - An array of RPC URLs to use for verification.
   * @returns A promise resolving to true if the signature is valid, otherwise false.
   */
  static async verifyEip1271Message(
    address: string,
    hash: string,
    signature: string,
    rpcUrls: string[]
  ): Promise<boolean> {
    return isValidEip1271Signature(rpcUrls, address, hash, signature);
  }

  /**
   * Converts a number or string to a bigint, using the specified number of decimals.
   * @param number - The number or string to convert.
   * @param decimals - The number of decimals (default is 18).
   * @returns The value as a bigint.
   */
  static toBigNumber(number: string | number, decimals: number = 18): bigint {
    return BigInt(parseUnits(`${number}`, decimals));
  }

  /**
   * Parses a bigint, number, string, or hex value to a string, using the specified number of decimals.
   * @param number - The value to parse.
   * @param decimals - The number of decimals (default is 18).
   * @returns The parsed value as a string.
   */
  static parseBigNumber(
    number: bigint | number | string | Hex,
    decimals: number = 18
  ): string {
    return formatUnits(BigInt(number), decimals);
  }

  /**
   * Checks if the provided address is a known zero address.
   * @param address - The address to check.
   * @returns True if the address is a zero address, otherwise false.
   */
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
      EtherspotUtils.addressesEqual(zeroAddress, address)
    );
  }

  /**
   * Compares two Ethereum addresses for equality, ignoring case and checksum.
   * @param address1 - The first address to compare.
   * @param address2 - The second address to compare.
   * @returns True if the addresses are equal, otherwise false.
   */
  static addressesEqual(address1: string, address2: string): boolean {
    return addressesEqual(address1, address2);
  }
}
