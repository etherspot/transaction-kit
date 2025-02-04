import { renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { EtherspotTransactionKit, useEtherspotAssets } from '../../src';

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
    getTokenListTokens: jest.fn(({ name, chainId }) => {
      const token1 = {
        address: '0x1',
        chainId,
        name: 'tk1',
        symbol: 'TK1',
        decimals: 18,
        logoURI: '',
      };
      const token2 = {
        address: '0x2',
        chainId,
        name: 'tk2',
        symbol: 'TK2',
        decimals: 18,
        logoURI: '',
      };
      const token3 = {
        address: '0x3',
        chainId,
        name: 'tk3',
        symbol: 'TK3',
        decimals: 18,
        logoURI: '',
      };

      return chainId === 1 ? [token1, token2, token3] : [token1];
    }),
    getSupportedAssets: jest.fn(({ chainId, provider: bridgingProvider }) => {
      const allSupportedAssets = [
        {
          address: '0x123',
          chainId: 1,
          name: 'USDC',
          symbol: 'USDC',
        },
        {
          address: '0x456',
          chainId: 1,
          name: 'USDC',
          symbol: 'USDC',
        },
        {
          address: '0x789',
          chainId: 137,
          name: 'USDC',
          symbol: 'USDC',
        },
      ];

      if (!chainId) {
        return { tokens: allSupportedAssets };
      }

      if (allSupportedAssets.some((asset) => asset.chainId === chainId)) {
        return {
          tokens: allSupportedAssets.filter(
            (asset) => asset.chainId === chainId
          ),
        };
      }

      return { tokens: [] };
    }),
  })),
}));

describe('useEtherspotAssets()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getAssets()', () => {
    it('returns assets', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(
        ({ chainId }) => useEtherspotAssets(chainId),
        {
          initialProps: { chainId: 1 },
          wrapper,
        }
      );

      // wait for assets to be fetched for chain ID 1
      await waitFor(() => expect(result.current).not.toBeNull());
      const assetsMainnet = await result.current.getAssets();
      expect(assetsMainnet.length).toEqual(3);

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const assetsPolygon = await result.current.getAssets();
      expect(assetsPolygon.length).toEqual(1);
    });
  });

  describe('getSupportedAssets()', () => {
    it('returns all supported assets by Etherspot', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(() => useEtherspotAssets(), {
        wrapper,
      });

      // wait for assets to be fetched
      await waitFor(() => expect(result.current).not.toBeNull());

      const allSupportedAssets = await result.current.getSupportedAssets();
      expect(allSupportedAssets).not.toBeUndefined();
      expect(allSupportedAssets.tokens.length).toEqual(3);
    });

    it('returns all supported assets by Etherspot and by Chain ID', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(() => useEtherspotAssets(), {
        wrapper,
      });

      // wait for assets to be fetched
      await waitFor(() => expect(result.current).not.toBeNull());

      // chain ID 1
      const allSupportedAssetsMainnet =
        await result.current.getSupportedAssets(1);
      expect(allSupportedAssetsMainnet).not.toBeUndefined();
      expect(allSupportedAssetsMainnet.tokens.length).toEqual(2);

      // chain ID 137
      const allSupportedAssetsPolygon =
        await result.current.getSupportedAssets(137);
      expect(allSupportedAssetsPolygon).not.toBeUndefined();
      expect(allSupportedAssetsPolygon.tokens.length).toEqual(1);

      // chain ID 56
      const allSupportedAssetsBinance =
        await result.current.getSupportedAssets(56);
      expect(allSupportedAssetsBinance).not.toBeUndefined();
      expect(allSupportedAssetsBinance.tokens.length).toEqual(0);
    });
  });
});
