import { renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { EtherspotTransactionKit, useEtherspotNfts } from '../../src';

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
    getNftList: jest.fn(({ account, chainId }) => {
      const {
        defaultAccountAddress,
        otherAccountAddress,
      } = require('../../__mocks__/@etherspot/modular-sdk');

      const accountNfts = [
        {
          contractName: 'Collection Alpha',
          contractAddress: '0x2',
          items: [{ tokenId: 420 }],
        },
        {
          contractName: 'Collection Beta',
          contractAddress: '0x1',
          items: [{ tokenId: 6 }, { tokenId: 9 }],
        },
      ];

      if (chainId !== 1) {
        return { items: [] };
      }

      if (account === defaultAccountAddress) {
        return { items: accountNfts };
      }

      if (account === otherAccountAddress) {
        return {
          items: [{ ...accountNfts[0], contractName: 'Collection Gama' }],
        };
      }

      return { items: [] };
    }),
  })),
}));

describe('useEtherspotNfts()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('returns current account NFTs', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(({ chainId }) => useEtherspotNfts(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for nfts to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const accountNftsMainnet = await result.current.getAccountNfts();
    expect(accountNftsMainnet.length).toEqual(2);
    expect(accountNftsMainnet[0].contractName).toEqual('Collection Alpha');
    expect(accountNftsMainnet[0].items.length).toEqual(1);
    expect(accountNftsMainnet[0].items[0].tokenId).toEqual(420);

    expect(accountNftsMainnet[1].contractName).toEqual('Collection Beta');
    expect(accountNftsMainnet[1].items.length).toEqual(2);
    expect(accountNftsMainnet[1].items[0].tokenId).toEqual(6);
    expect(accountNftsMainnet[1].items[1].tokenId).toEqual(9);
  });

  it('returns other account NFTs', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(({ chainId }) => useEtherspotNfts(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for nfts to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const otherAccountNftsMainnet = await result.current.getAccountNfts(
      '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1'
    );
    expect(otherAccountNftsMainnet.length).toEqual(1);
    expect(otherAccountNftsMainnet[0].contractName).toEqual('Collection Gama');

    const accountNftsManualPolygon = await result.current.getAccountNfts(
      '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1',
      137
    );
    expect(accountNftsManualPolygon.length).toEqual(0);
  });

  it('returns account NFTs between rerenders', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(
      ({ chainId }) => useEtherspotNfts(chainId),
      {
        initialProps: { chainId: 1 },
        wrapper,
      }
    );

    // wait for nfts to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const otherAccountNftsMainnet = await result.current.getAccountNfts(
      '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1'
    );
    expect(otherAccountNftsMainnet.length).toEqual(1);
    expect(otherAccountNftsMainnet[0].contractName).toEqual('Collection Gama');

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const accountNftsPolygon = await result.current.getAccountNfts();
    expect(accountNftsPolygon.length).toEqual(0);

    const accountNftsManualMainnet = await result.current.getAccountNfts(
      '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1',
      1
    );
    expect(accountNftsManualMainnet.length).toEqual(1);
  });
});
