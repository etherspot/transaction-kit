import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { useEtherspotPrices, EtherspotTransactionKit } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

describe('useEtherspotPrices()', () => {
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

      const pricesMainnet = await result.current.getPrices(['0x1', 'some_wrongAddressFormat']);
      expect(pricesMainnet.length).toEqual(0);
    });

    it('returns prices for assets', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotPrices(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const pricesMainnet = await result.current.getPrices(['0x1', '0x2']);
      expect(pricesMainnet.length).toEqual(2);
      expect(pricesMainnet[0].address).toBe('0x1');
      expect(pricesMainnet[0].eth).toBe(1);
      expect(pricesMainnet[0].usd).toBe(1800);
      expect(pricesMainnet[1].address).toBe('0x2');
      expect(pricesMainnet[1].eth).toBe(1.1);

      const pricesPolygon1 = await result.current.getPrices(['0x1', '0x2'], 137);
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

      const pricesMainnet = await result.current.getPrice('some_wrongAddressFormat');
      expect(pricesMainnet).toEqual(undefined);
    });

    it('returns price for asset', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotPrices(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

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
})
