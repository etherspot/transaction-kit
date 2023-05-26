import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { useEtherspotSwaps, EtherspotTransactionKit } from '../../src';

describe('useEtherspotSwaps()', () => {
  describe('getOffers()', () => {
    it('returns offers for same chain swaps', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={null}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotSwaps(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for history to be fetched for chain ID 1
      await waitFor(() => expect(result.current).not.toBeNull());

      const offersMainnet = await result.current.getOffers(
        ethers.utils.parseEther('1'),
        '0x111',
        '0x222',
      );
      expect(offersMainnet).not.toBe(undefined);
      expect(offersMainnet.offers.length).toEqual(2);
      expect(offersMainnet.offers[0].provider).toEqual('abc-swap');
      expect(ethers.utils.formatEther(offersMainnet.offers[0].receiveAmount)).toEqual('0.1');
      expect(offersMainnet.offers[0].transactions.length).toEqual(2);
      expect(ethers.utils.formatEther(offersMainnet.offers[1].receiveAmount)).toEqual('0.11');

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const offersPolygon = await result.current.getOffers(
        ethers.utils.parseEther('1'),
        '0x111',
        '0x222',
      );
      expect(offersPolygon).not.toBe(undefined);
      expect(offersPolygon.offers?.length).toEqual(0);
    });

    it('returns offers for cross chain swaps', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={null}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotSwaps(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for history to be fetched for chain ID 1
      await waitFor(() => expect(result.current).not.toBeNull());

      const offersMainnetToPolygon = await result.current.getOffers(
        ethers.utils.parseEther('1'),
        '0x111',
        '0x222',
        137
      );
      expect(offersMainnetToPolygon).not.toBe(undefined);
      expect(offersMainnetToPolygon.offers.length).toEqual(2);
      expect(offersMainnetToPolygon.offers[0].id).toEqual('abc-bridge-offer-1');
      expect(offersMainnetToPolygon.offers[0].fromChainId).toEqual(1);
      expect(offersMainnetToPolygon.offers[0].toChainId).toEqual(137);
      expect(ethers.utils.formatEther(offersMainnetToPolygon.offers[0].fromAmount)).toEqual('1.0');
      expect(ethers.utils.formatEther(offersMainnetToPolygon.offers[0].toAmount)).toEqual('0.1');
      expect(offersMainnetToPolygon.offers[0].steps.length).toEqual(2);
      expect(ethers.utils.formatEther(offersMainnetToPolygon.offers[1].toAmount)).toEqual('0.12');

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const offersPolygonToMainnet = await result.current.getOffers(
        ethers.utils.parseEther('1'),
        '0x111',
        '0x222',
        1
      );
      expect(offersPolygonToMainnet).not.toBe(undefined);
      expect(offersPolygonToMainnet.offers?.length).toEqual(0);
    });
  });
  describe('prepareCrossChainOfferTransactions()', () => {
    it('returns parsed transactions for cross chain offer', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={null}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(({ chainId }) => useEtherspotSwaps(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for history to be fetched for chain ID 1
      await waitFor(() => expect(result.current).not.toBeNull());

      const offer = {
        id: 'abc-bridge-offer-1',
        fromChainId: 1,
        fromAmount: ethers.utils.parseEther('1').toString(),
        fromAmountUSD: '1800',
        fromToken: {
          address: '0x111',
          symbol: 'ABC',
          decimals: 18,
          chainId: 1,
          name: 'Token ABC'
        },
        toChainId: 137,
        toAmount: ethers.utils.parseEther('0.1').toString(),
        toAmountUSD: '180',
        toToken: {
          address: '0x222',
          symbol: 'DEF',
          decimals: 18,
          chainId: 137,
          name: 'Token DEF'
        },
        steps: ['0x1', '0x2'],
      }

      const parsedCrossChainOfferTransactions = await result.current.prepareCrossChainOfferTransactions(offer);
      expect(parsedCrossChainOfferTransactions).not.toBe(undefined);
      expect(parsedCrossChainOfferTransactions.length).toEqual(2);
      expect(parsedCrossChainOfferTransactions[0].to).toEqual('0x111');
      expect(parsedCrossChainOfferTransactions[0].data).toEqual('0x2');
      expect(parsedCrossChainOfferTransactions[0].value).toEqual(undefined);
      expect(parsedCrossChainOfferTransactions[1].value).toEqual('100000000000000');
    });
  });
})
