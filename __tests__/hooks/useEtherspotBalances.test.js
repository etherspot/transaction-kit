import { renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { EtherspotTransactionKit, useEtherspotBalances } from '../../src';

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
    getAccountBalances: jest.fn(({ chainId, account }) => {
      const { parseEther } = require('viem');
      const {
        defaultAccountAddress,
        otherAccountAddress,
      } = require('../../__mocks__/@etherspot/modular-sdk');

      const tokenBalance = parseEther('420');
      const nativeAssetBalance = parseEther('0');

      const token = {
        token: '0x',
        balance: tokenBalance,
        superBalance: tokenBalance,
      };
      const nativeAsset = {
        token: null,
        balance: nativeAssetBalance,
        superBalance: nativeAssetBalance,
      };

      if (chainId !== 1) {
        return { items: [nativeAsset] };
      }

      if (account === defaultAccountAddress) {
        return { items: [nativeAsset, token] };
      }

      if (account === otherAccountAddress) {
        return {
          items: [nativeAsset, { ...token, balance: parseEther('69') }],
        };
      }

      return { items: [] };
    }),
  })),
}));

describe('useEtherspotBalances()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns balances', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(
      ({ chainId }) => useEtherspotBalances(chainId),
      {
        initialProps: { chainId: 1 },
        wrapper,
      }
    );

    // wait for balances to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const accountBalancesMainnet = await result.current.getAccountBalances();
    expect(accountBalancesMainnet.length).toEqual(2);
    expect(accountBalancesMainnet[0].token).toBeNull();
    expect(accountBalancesMainnet[0].balance.toString()).toEqual(
      parseEther('0').toString()
    );
    expect(accountBalancesMainnet[1].token).not.toBeNull();
    expect(accountBalancesMainnet[1].balance.toString()).toEqual(
      parseEther('420').toString()
    );

    const otherAccountBalancesMainnet = await result.current.getAccountBalances(
      '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1'
    );
    expect(otherAccountBalancesMainnet.length).toEqual(2);
    expect(otherAccountBalancesMainnet[1].token).not.toBeNull();
    expect(otherAccountBalancesMainnet[1].balance.toString()).toEqual(
      parseEther('69').toString()
    );

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const accountBalancesPolygon = await result.current.getAccountBalances();
    expect(accountBalancesPolygon.length).toEqual(1);
    expect(accountBalancesPolygon[0].balance.toString()).toEqual(
      parseEther('0').toString()
    );

    const accountBalancesManualMainnet =
      await result.current.getAccountBalances(
        '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1',
        1
      );
    expect(accountBalancesManualMainnet.length).toEqual(2);
    expect(accountBalancesManualMainnet[1].token).not.toBeNull();
    expect(accountBalancesManualMainnet[1].balance.toString()).toEqual(
      parseEther('69').toString()
    );
  });
});
