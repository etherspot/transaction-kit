import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { EtherspotTransactionKit, useEtherspotAssets } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
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

      console.log('log1', result)

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const assetsPolygon = await result.current.getAssets();
      expect(assetsPolygon.length).toEqual(1);
    });
  })

  describe('getSupportedAssets()', () => {
    it('returns all supported assets', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider} chainId={11155111}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotAssets(chainId), {
        initialProps: { chainId: 11155111 },
        wrapper,
      });

      // wait for assets to be fetched
      await waitFor(() => expect(result.current).not.toBeNull());

      const assetsMainnet = await result.current.getSupportedAssets();
      console.log('log', assetsMainnet);
      expect(assetsMainnet.length).toBeGreaterThan(0);




      // console.log('log1', result)
      // console.log('THEPROVIDER', provider)
      // // wait for assets to be fetched for chain ID 1
      // await waitFor(() => expect(result.current).not.toBeNull());
      // const assetsMainnet = await result.current.getSupportedAssets();
      // // expect(assetsMainnet.length).toEqual(3);

      // console.log('log2', assetsMainnet)

      // // rerender with different chain ID 137
      // rerender({ chainId: 137 });

      // // const assetsPolygon = await result.current.getSupportedAssets();
      // // expect(assetsPolygon.length).toEqual(1);
    });
  })
  // describe('getSupportedAssets()', () => {
  //   it('returns all supported assets for chain ID 1', async () => {
  //     const wrapper = ({ children }) => (
  //       <EtherspotTransactionKit provider={provider}>
  //         {children}
  //       </EtherspotTransactionKit>
  //     );

  //     const { result } = renderHook(({ chainId }) => useEtherspotAssets(chainId), {
  //       initialProps: { chainId: 1 },
  //       wrapper,
  //     });

  //     console.log('log3', result)

  //     // wait for assets to be fetched for chain ID 1
  //     await waitFor(() => expect(result.current).not.toBeNull());

  //     console.log('log4', result)
  //     // const assetsMainnet = await result.current.getSupportedAssets(1);
  //     // expect(assetsMainnet.length).toBeGreaterThanOrEqual(1);

  //   });
  // });

});