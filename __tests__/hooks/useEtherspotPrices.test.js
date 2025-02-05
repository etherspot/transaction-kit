import { renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { EtherspotTransactionKit, useEtherspotPrices } from '../../src';

const randomWallet = privateKeyToAccount(
  `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')}`
);
const provider = createWalletClient({
  account: randomWallet,
  chain: sepolia,
  transport: http('http://localhost:8545'),
});

jest.mock('@etherspot/data-utils', () => ({
  DataUtils: jest.fn().mockImplementation(() => ({
    fetchExchangeRates: jest.fn(({ chainId, tokens }) => {
      if (chainId !== 1) {
        return { items: [] };
      }

      if (tokens.includes('some_wrongAddressFormat')) {
        return { items: [], errored: true, error: 'Wrong address provided!' };
      }

      const prices = tokens.map((token, index) => ({
        address: token,
        eth: 1 + index * 0.1,
        usd: 1800 * (1 + index * 0.1),
      }));

      return { items: prices };
    }),
  })),
}));

describe('useEtherspotPrices()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getPrices()', () => {
    it('fails if wrong asset address provided', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(() => useEtherspotPrices(), { wrapper });

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const pricesMainnet = await result.current.getPrices([
        '0x1',
        'some_wrongAddressFormat',
      ]);
      expect(pricesMainnet.length).toEqual(0);
    });

    it('returns prices for assets', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(
        ({ chainId }) => useEtherspotPrices(chainId),
        {
          initialProps: { chainId: 1 },
          wrapper,
        }
      );

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const pricesMainnet = await result.current.getPrices(['0x1', '0x2']);
      expect(pricesMainnet.length).toEqual(2);
      expect(pricesMainnet[0].address).toBe('0x1');
      expect(pricesMainnet[0].eth).toBe(1);
      expect(pricesMainnet[0].usd).toBe(1800);
      expect(pricesMainnet[1].address).toBe('0x2');
      expect(pricesMainnet[1].eth).toBe(1.1);

      const pricesPolygon1 = await result.current.getPrices(
        ['0x1', '0x2'],
        137
      );
      expect(pricesPolygon1.length).toEqual(0);

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const pricesPolygon2 = await result.current.getPrices(['0x1', '0x2']);
      expect(pricesPolygon2.length).toEqual(0);
    });
  });

  describe('getPrice()', () => {
    it('fails if wrong asset address provided', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(() => useEtherspotPrices(), { wrapper });

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const pricesMainnet = await result.current.getPrice(
        'some_wrongAddressFormat'
      );
      expect(pricesMainnet).toEqual(undefined);
    });

    it('returns price for asset', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(
        ({ chainId }) => useEtherspotPrices(chainId),
        {
          initialProps: { chainId: 1 },
          wrapper,
        }
      );

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const pricesMainnet = await result.current.getPrice('0x1');
      expect(pricesMainnet.address).toBe('0x1');
      expect(pricesMainnet.eth).toBe(1);
      expect(pricesMainnet.usd).toBe(1800);

      const pricePolygon1 = await result.current.getPrice('0x1', 137);
      expect(pricePolygon1).toEqual(undefined);

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const pricePolygon2 = await result.current.getPrice('0x1');
      expect(pricePolygon2).toEqual(undefined);
    });
  });
});
