import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { EtherspotTransactionKit, useEtherspotAssets } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'goerli'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

describe('useEtherspotAssets()', () => {
  describe('getAssets()', () => {
    it('returns assets', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotAssets(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for assets to be fetched for chain ID 1
      await waitFor(() => expect(result.current).not.toBeNull());
      const assetsMainnet = await result.current.getAssets();
      expect(assetsMainnet.length).toEqual(3);

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const assetsPolygon = await result.current.getAssets();
      expect(assetsPolygon.length).toEqual(1);
    });
  })

  describe('getSupportedAssets()', () => {
    it('returns all supported assets for chain ID 1', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(({ chainId }) => useEtherspotAssets(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for assets to be fetched for chain ID 1
      await waitFor(() => expect(result.current).not.toBeNull());
      const assetsMainnet = await result.current.getSupportedAssets(1);
      expect(assetsMainnet.length).toBeGreaterThanOrEqual(1);

    });
  });

});