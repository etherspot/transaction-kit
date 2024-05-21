import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { EtherspotTransactionKit, useEtherspotHistory } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

describe('useEtherspotHistory()', () => {
  it('getAccountTransactions() returns account history', async () => {
    const wrapper = ({ children }) => <EtherspotTransactionKit provider={provider}>{children}</EtherspotTransactionKit>;

    const { result, rerender } = renderHook(({ chainId }) => useEtherspotHistory(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for history to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const accountTransactionsMainnet = await result.current.getAccountTransactions();
    expect(accountTransactionsMainnet.length).toEqual(2);
    expect(accountTransactionsMainnet[0].hash).toEqual('0x1');
    expect(accountTransactionsMainnet[0].value).toEqual('100000000000000');
    expect(accountTransactionsMainnet[1].hash).toEqual('0x2');

    const otherAccountTransactionsMainnet = await result.current.getAccountTransactions(
      '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1'
    );
    expect(otherAccountTransactionsMainnet.length).toEqual(1);
    expect(otherAccountTransactionsMainnet[0].hash).toEqual('0x69');
    expect(otherAccountTransactionsMainnet[0].value).toEqual('0');

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const accountTransactionsPolygon = await result.current.getAccountTransactions();
    expect(accountTransactionsPolygon.length).toEqual(0);
  });
  it('getAccountTransaction() returns transaction by existing hash', async () => {
    const wrapper = ({ children }) => <EtherspotTransactionKit provider={provider}>{children}</EtherspotTransactionKit>;

    const { result, rerender } = renderHook(({ chainId }) => useEtherspotHistory(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for history to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const transactionMainnet1 = await result.current.getAccountTransaction('0x123');
    expect(transactionMainnet1).toEqual(undefined);

    const transactionMainnet2 = await result.current.getAccountTransaction('0x42');
    expect(transactionMainnet2).not.toEqual(undefined);
    expect(transactionMainnet2.hash).toEqual('0x42');
    expect(transactionMainnet2.value).toEqual('690000000000000');

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const transactionPolygon = await result.current.getAccountTransaction('0x42');
    expect(transactionPolygon).toEqual(undefined);
  });

  it('returns transaction status for a given hash', async () => {
    const transactionStatus = {
      connextscanUrl: 'https://connextscan.io/tx/0x123',
      status: 'completed',
      transactionHash: '0x123',
      transferId: 'abc123',
    };

    const wrapper = ({ children }) => <EtherspotTransactionKit provider={provider}>{children}</EtherspotTransactionKit>;

    const { result } = renderHook(({ chainId }) => useEtherspotHistory(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

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

    expect(transaction2).toEqual({})

    // missing props
    const transaction3 = await result.current
      .getAccountTransactionStatus(4, 137)
      .catch((e) => {
        console.error(e);
        return e;
      });

    expect(transaction3).toBeNull()

  });
});
