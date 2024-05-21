import { renderHook, waitFor } from '@testing-library/react';
import { BigNumber, ethers } from 'ethers';

// hooks
import { EtherspotTransactionKit, useEtherspotSwaps } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

describe('useEtherspotSwaps()', () => {
  describe('getOffers()', () => {
    it('returns offers for same chain swaps', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>{children}</EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotSwaps(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const offersMainnet = await result.current.getOffers(ethers.utils.parseEther('1'), '0x111', '0x222');
      expect(offersMainnet).not.toBe(undefined);
      expect(offersMainnet.offers.length).toEqual(2);
      expect(offersMainnet.offers[0].provider).toEqual('abc-swap');
      expect(ethers.utils.formatEther(offersMainnet.offers[0].receiveAmount)).toEqual('0.1');
      expect(offersMainnet.offers[0].transactions.length).toEqual(2);
      expect(ethers.utils.formatEther(offersMainnet.offers[1].receiveAmount)).toEqual('0.11');

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const offersPolygon = await result.current.getOffers(ethers.utils.parseEther('1'), '0x111', '0x222');
      expect(offersPolygon).not.toBe(undefined);
      expect(offersPolygon.offers?.length).toEqual(0);
    });

    it('returns offers for cross chain swaps', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>{children}</EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(({ chainId }) => useEtherspotSwaps(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for hook to load
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

      const offersPolygonToMainnet = await result.current.getOffers(ethers.utils.parseEther('1'), '0x111', '0x222', 1);
      expect(offersPolygonToMainnet).not.toBe(undefined);
      expect(offersPolygonToMainnet.offers?.length).toEqual(0);
    });
  });
  describe('prepareCrossChainOfferTransactions()', () => {
    it('returns parsed transactions for cross chain offer', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>{children}</EtherspotTransactionKit>
      );

      const { result } = renderHook(({ chainId }) => useEtherspotSwaps(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for hook to load
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
          name: 'Token ABC',
        },
        toChainId: 137,
        toAmount: ethers.utils.parseEther('0.1').toString(),
        toAmountUSD: '180',
        toToken: {
          address: '0x222',
          symbol: 'DEF',
          decimals: 18,
          chainId: 137,
          name: 'Token DEF',
        },
        steps: ['0x1', '0x2'],
      };

      const parsedCrossChainOfferTransactions = await result.current.prepareCrossChainOfferTransactions(offer);
      expect(parsedCrossChainOfferTransactions).not.toBe(undefined);
      expect(parsedCrossChainOfferTransactions.length).toEqual(2);
      expect(parsedCrossChainOfferTransactions[0].to).toEqual('0x111');
      expect(parsedCrossChainOfferTransactions[0].data).toEqual('0x2');
      expect(parsedCrossChainOfferTransactions[0].value).toEqual(undefined);
      expect(parsedCrossChainOfferTransactions[1].value).toEqual('100000000000000');
    });
  });
  describe('getQuotes()', () => {
    it('returns quotes cross chain', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>{children}</EtherspotTransactionKit>
      );

      const { result } = renderHook(({ chainId }) => useEtherspotSwaps(chainId), {
        initialProps: { chainId: 1 },
        wrapper,
      });

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const quotesResult =
      {
        transactions: [
          {
            data: "0x111222333",
            to: "0x123",
            value: "0x00"
          },
          {
            value: "0xb2eed2c27ce6",
            data: "0x444555666",
            to: "0x456",
            chainId: 1
          }
        ]
      }

      // all props are correct and quotes exist
      const quotes1 = await result.current.getQuotes('0x111', '0x222', 56, '0x123456', '0x1000000', 1);
      expect(quotes1.transactions.length).toEqual(2);
      expect(quotes1).toEqual(quotesResult)

      // all props are correct but no quotes
      const quote2 = await result.current.getQuotes('0x999', '0x888', 56, '0x123456', '0x1000000', 1);
      expect(quote2.transactions.length).toEqual(0);

      // not all props
      const quote3 = await result.current.getQuotes('0x111', '0x222');
      expect(quote3).toBeNull();
    });
  });
});
