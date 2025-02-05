import { renderHook } from '@testing-library/react';
import { parseUnits } from 'viem';

import { useEtherspotUtils } from '../../src';

describe('useEtherspotUtils()', () => {
  let hookUtils;

  beforeEach(() => {
    const { result } = renderHook(() => useEtherspotUtils());
    hookUtils = result.current;
  });

  describe('checksumAddress()', () => {
    it('throws error when invalid address provided', () => {
      const checkInvalidAddress = () =>
        hookUtils.checksumAddress('0xsomeInvalidAddress');
      expect(checkInvalidAddress).toThrow('Invalid address');
    });

    it('returns checksum address when non checksum provided', () => {
      const walletAddress = '0x7f30b1960D5556929B03a0339814fE903c55a347';
      const checksumAddress = hookUtils.checksumAddress(
        walletAddress.toLowerCase()
      );
      expect(walletAddress).not.toEqual(checksumAddress);
      expect(checksumAddress).toEqual(
        '0x7F30B1960D5556929B03a0339814fE903c55a347'
      );
    });

    it('returns checksum address when checksum provided', () => {
      const walletAddress = '0x7F30B1960D5556929B03a0339814fE903c55a347';
      const checksumAddress = hookUtils.checksumAddress(walletAddress);
      expect(walletAddress).toEqual(checksumAddress);
    });
  });

  describe('toBigNumber()', () => {
    it('returns BigNumber', () => {
      const number1 = hookUtils.toBigNumber(420);
      const number2 = hookUtils.toBigNumber(420, 10);
      const number3 = hookUtils.toBigNumber('69');

      expect(number1.toString()).toEqual(parseUnits('420', 18).toString());
      expect(number2.toString()).toEqual(parseUnits('420', 10).toString());
      expect(number3.toString()).toEqual(parseUnits('69', 18).toString());
    });
  });

  describe('parseBigNumber()', () => {
    it('returns parsed string', () => {
      const number1 = hookUtils.parseBigNumber(parseUnits('420', 18));
      const number2 = hookUtils.parseBigNumber(parseUnits('420', 10), 10);
      const number3 = hookUtils.parseBigNumber(parseUnits('69', 18));

      expect(number1).toEqual('420');
      expect(number2).toEqual('420');
      expect(number3).toEqual('69');
    });
  });

  describe('isZeroAddress()', () => {
    it('returns true on zero address', () => {
      const result1 = hookUtils.isZeroAddress(
        '0x7F30B1960D5556929B03a0339814fE903c55a347'
      );
      const result2 = hookUtils.isZeroAddress(
        '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      );
      expect(result1).toEqual(false);
      expect(result2).toEqual(true);
    });
  });

  describe('verifyEip1271Message()', () => {
    it('returns true successful verification', async () => {
      const walletAddress = '0x7F30B1960D5556929B03a0339814fE903c55a347';
      const hash = '0x1';
      const signature = '0x222';
      const rpcUrls = ['rpcUrl1', 'rpcUrl2'];

      const result1 = await hookUtils.verifyEip1271Message(
        walletAddress,
        hash,
        '0x111',
        rpcUrls
      );
      const result2 = await hookUtils.verifyEip1271Message(
        walletAddress,
        hash,
        signature,
        rpcUrls
      );

      expect(result1).toEqual(false);
      expect(result2).toEqual(true);
    });
  });
});
