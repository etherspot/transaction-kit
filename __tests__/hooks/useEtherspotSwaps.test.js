import { renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, formatEther, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { EtherspotTransactionKit, useEtherspotSwaps } from '../../src';

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
    getExchangeOffers: jest.fn(
      ({ fromTokenAddress, toTokenAddress, fromChainId }) => {
        const { parseEther } = require('viem');

        if (
          fromChainId !== 1 ||
          fromTokenAddress !== '0x111' ||
          toTokenAddress !== '0x222'
        ) {
          return [];
        }

        const offer1 = {
          provider: 'abc-swap',
          receiveAmount: parseEther('0.1'),
          transactions: ['0x1', '0x2'],
        };

        const offer2 = {
          provider: 'def-swap',
          receiveAmount: parseEther('0.11'),
          transactions: ['0x1'],
        };

        return [offer1, offer2];
      }
    ),
    getAdvanceRoutesLiFi: jest.fn(
      ({
        fromAmount,
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
      }) => {
        const { parseEther } = require('viem');

        if (
          fromChainId !== 1 ||
          toChainId !== 137 ||
          fromTokenAddress !== '0x111' ||
          toTokenAddress !== '0x222'
        ) {
          return { items: [] };
        }

        const offer1 = {
          id: 'abc-bridge-offer-1',
          fromChainId,
          toChainId,
          fromAmount,
          toAmount: parseEther('0.1'),
          steps: ['0x1', '0x2'],
        };

        const offer2 = {
          id: 'abc-bridge-offer-2',
          fromChainId,
          toChainId,
          fromAmount,
          toAmount: parseEther('0.12'),
          steps: ['0x1', '0x2'],
        };

        return { items: [offer1, offer2] };
      }
    ),
    getQuotes: jest.fn(
      ({
        fromAddress,
        toAddress,
        fromChainId,
        toChainId,
        fromToken,
        fromAmount,
        slippage,
      }) => {
        if (
          !fromAddress ||
          !toAddress ||
          !fromChainId ||
          !toChainId ||
          !fromToken ||
          !fromAmount ||
          !slippage
        ) {
          return [];
        }

        if (
          fromAddress === '0x111' &&
          toAddress === '0x222' &&
          fromChainId === 1 &&
          toChainId === 56 &&
          fromToken == '0x123456' &&
          fromAmount === '0x10000000000' &&
          slippage === 1
        ) {
          return {
            transactions: [
              {
                data: '0x111222333',
                to: '0x123',
                value: '0x00',
              },
              {
                value: '0xb2eed2c27ce6',
                data: '0x444555666',
                to: '0x456',
                chainId: 1,
              },
            ],
          };
        }

        return { transactions: [] };
      }
    ),
    getStepTransaction: jest.fn(({ route: { id } }) => {
      if (id !== 'abc-bridge-offer-1') {
        return { items: [] };
      }

      const transactions = [
        { to: '0x111', data: '0x2', value: undefined },
        { to: '0x222', data: '0x3', value: '100000000000000' },
      ];

      return { items: transactions };
    }),
  })),
}));

describe('useEtherspotSwaps()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOffers()', () => {
    it('returns offers for same chain swaps', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(
        ({ chainId }) => useEtherspotSwaps(chainId),
        {
          initialProps: { chainId: 1 },
          wrapper,
        }
      );

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const offersMainnet = await result.current.getOffers(
        parseEther('1'),
        '0x111',
        '0x222'
      );
      expect(offersMainnet).not.toBe(undefined);
      expect(offersMainnet.offers.length).toEqual(2);
      expect(offersMainnet.offers[0].provider).toEqual('abc-swap');
      expect(formatEther(offersMainnet.offers[0].receiveAmount)).toEqual('0.1');
      expect(offersMainnet.offers[0].transactions.length).toEqual(2);
      expect(formatEther(offersMainnet.offers[1].receiveAmount)).toEqual(
        '0.11'
      );

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const offersPolygon = await result.current.getOffers(
        parseEther('1'),
        '0x111',
        '0x222'
      );
      expect(offersPolygon).not.toBe(undefined);
      expect(offersPolygon.offers?.length).toEqual(0);
    });

    it('returns offers for cross chain swaps', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result, rerender } = renderHook(
        ({ chainId }) => useEtherspotSwaps(chainId),
        {
          initialProps: { chainId: 1 },
          wrapper,
        }
      );

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const offersMainnetToPolygon = await result.current.getOffers(
        parseEther('1'),
        '0x111',
        '0x222',
        137
      );
      expect(offersMainnetToPolygon).not.toBe(undefined);
      expect(offersMainnetToPolygon.offers.length).toEqual(2);
      expect(offersMainnetToPolygon.offers[0].id).toEqual('abc-bridge-offer-1');
      expect(Number(offersMainnetToPolygon.offers[0].fromChainId)).toEqual(1);
      expect(Number(offersMainnetToPolygon.offers[0].toChainId)).toEqual(137);
      expect(formatEther(offersMainnetToPolygon.offers[0].fromAmount)).toEqual(
        '1'
      );
      expect(formatEther(offersMainnetToPolygon.offers[0].toAmount)).toEqual(
        '0.1'
      );
      expect(offersMainnetToPolygon.offers[0].steps.length).toEqual(2);
      expect(formatEther(offersMainnetToPolygon.offers[1].toAmount)).toEqual(
        '0.12'
      );

      // rerender with different chain ID 137
      rerender({ chainId: 137 });

      const offersPolygonToMainnet = await result.current.getOffers(
        parseEther('1'),
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
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(
        ({ chainId }) => useEtherspotSwaps(chainId),
        {
          initialProps: { chainId: 1 },
          wrapper,
        }
      );

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const offer = {
        id: 'abc-bridge-offer-1',
        fromChainId: 1,
        fromAmount: parseEther('1').toString(),
        fromAmountUSD: '1800',
        fromToken: {
          address: '0x111',
          symbol: 'ABC',
          decimals: 18,
          chainId: 1,
          name: 'Token ABC',
        },
        toChainId: 137,
        toAmount: parseEther('0.1').toString(),
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

      const parsedCrossChainOfferTransactions =
        await result.current.prepareCrossChainOfferTransactions(offer);
      expect(parsedCrossChainOfferTransactions).not.toBe(undefined);
      expect(parsedCrossChainOfferTransactions.length).toEqual(2);
      expect(parsedCrossChainOfferTransactions[0].to).toEqual('0x111');
      expect(parsedCrossChainOfferTransactions[0].data).toEqual('0x2');
      expect(parsedCrossChainOfferTransactions[0].value).toEqual(undefined);
      expect(parsedCrossChainOfferTransactions[1].value).toEqual(
        '100000000000000'
      );
    });
  });
  describe('getQuotes()', () => {
    it('returns quotes cross chain', async () => {
      const wrapper = ({ children }) => (
        <EtherspotTransactionKit provider={provider}>
          {children}
        </EtherspotTransactionKit>
      );

      const { result } = renderHook(
        ({ chainId }) => useEtherspotSwaps(chainId),
        {
          initialProps: { chainId: 1 },
          wrapper,
        }
      );

      // wait for hook to load
      await waitFor(() => expect(result.current).not.toBeNull());

      const quotesResult = [
        {
          data: '0x111222333',
          to: '0x123',
          value: '0x00',
        },
        {
          value: '0xb2eed2c27ce6',
          data: '0x444555666',
          to: '0x456',
          chainId: 1,
        },
      ];

      // all props are correct and quotes exist
      const quotes1 = await result.current.getQuotes(
        '0x222',
        56,
        '0x123456',
        '0x10000000000',
        1,
        '0x111'
      );
      expect(quotes1.length).toEqual(2);
      expect(quotes1).toEqual(quotesResult);

      // all props are correct but no quotes
      const quote2 = await result.current.getQuotes(
        '0x999',
        56,
        '0x123456',
        '0x10000000000',
        1,
        '0x888'
      );
      expect(quote2.length).toEqual(0);

      // not all props
      const quote3 = await result.current.getQuotes('0x222', 56);
      expect(quote3).not.toBeDefined();
    });
  });
});
