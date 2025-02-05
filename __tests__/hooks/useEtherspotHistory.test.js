import { renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { EtherspotTransactionKit, useEtherspotHistory } from '../../src';

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
    getTransactions: jest.fn(({ account, chainId }) => {
      const {
        defaultAccountAddress,
        otherAccountAddress,
      } = require('../../__mocks__/@etherspot/modular-sdk');

      const accountTransactions = [
        { hash: '0x1', value: '100000000000000' },
        { hash: '0x2', value: '420000000000000' },
      ];

      if (chainId !== 1) {
        return { transactions: [] };
      }

      if (account === defaultAccountAddress) {
        return { transactions: accountTransactions };
      }

      if (account === otherAccountAddress) {
        return { transactions: [{ hash: '0x69', value: '0' }] };
      }

      return { transactions: [] };
    }),
    getTransactionStatus: jest.fn(
      ({ fromChainId, toChainId, transactionHash, provider }) => {
        if (!fromChainId || !toChainId || !transactionHash) {
          return 'getTransactionStatus: missing required props';
        }

        if (
          fromChainId === 1 &&
          toChainId === 137 &&
          transactionHash === '0x123'
        ) {
          return {
            connextscanUrl: 'https://connextscan.io/tx/0x123',
            status: 'completed',
            transactionHash: '0x123',
            transferId: 'abc123',
          };
        }

        return {};
      }
    ),
    getTransaction: jest.fn(({ hash, chainId }) => {
      if (hash !== '0x42' || chainId !== 1) return;
      return { hash: '0x42', value: '690000000000000' };
    }),
  })),
}));

describe('useEtherspotHistory()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('getAccountTransactions() returns account history', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(
      ({ chainId }) => useEtherspotHistory(chainId),
      {
        initialProps: { chainId: 1 },
        wrapper,
      }
    );

    // wait for history to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const accountTransactionsMainnet =
      await result.current.getAccountTransactions();
    expect(accountTransactionsMainnet.length).toEqual(2);
    expect(accountTransactionsMainnet[0].hash).toEqual('0x1');
    expect(accountTransactionsMainnet[0].value).toEqual('100000000000000');
    expect(accountTransactionsMainnet[1].hash).toEqual('0x2');

    const otherAccountTransactionsMainnet =
      await result.current.getAccountTransactions(
        '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1'
      );
    expect(otherAccountTransactionsMainnet.length).toEqual(1);
    expect(otherAccountTransactionsMainnet[0].hash).toEqual('0x69');
    expect(otherAccountTransactionsMainnet[0].value).toEqual('0');

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const accountTransactionsPolygon =
      await result.current.getAccountTransactions();
    expect(accountTransactionsPolygon.length).toEqual(0);
  });
  it('getAccountTransaction() returns transaction by existing hash', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(
      ({ chainId }) => useEtherspotHistory(chainId),
      {
        initialProps: { chainId: 1 },
        wrapper,
      }
    );

    // wait for history to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const transactionMainnet1 =
      await result.current.getAccountTransaction('0x123');
    expect(transactionMainnet1).toEqual(undefined);

    const transactionMainnet2 =
      await result.current.getAccountTransaction('0x42');
    expect(transactionMainnet2).not.toEqual(undefined);
    expect(transactionMainnet2.hash).toEqual('0x42');
    expect(transactionMainnet2.value).toEqual('690000000000000');

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const transactionPolygon =
      await result.current.getAccountTransaction('0x42');
    expect(transactionPolygon).toEqual(undefined);
  });

  it('returns transaction status for a given hash', async () => {
    const transactionStatus = {
      connextscanUrl: 'https://connextscan.io/tx/0x123',
      status: 'completed',
      transactionHash: '0x123',
      transferId: 'abc123',
    };

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(
      ({ chainId }) => useEtherspotHistory(chainId),
      {
        initialProps: { chainId: 1 },
        wrapper,
      }
    );

    // wait for history to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    // all correct props
    const transaction1 = await result.current
      .getAccountTransactionStatus(1, 137, '0x123')
      .catch((e) => {
        console.error(e);
        return e;
      });

    expect(transaction1).toEqual(transactionStatus);

    // transaction not found or does not exist
    const transaction2 = await result.current
      .getAccountTransactionStatus(4, 137, '0x123')
      .catch((e) => {
        console.error(e);
        return e;
      });

    expect(transaction2).toEqual({});

    // missing props
    const transaction3 = await result.current
      .getAccountTransactionStatus(4, 137)
      .catch((e) => {
        console.error(e);
        return e;
      });

    expect(transaction3).toBe('getTransactionStatus: missing required props');
  });
});
