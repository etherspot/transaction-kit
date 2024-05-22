import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { useEtherspotNfts, EtherspotTransactionKit } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

describe('useEtherspotNfts()', () => {
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

    const otherAccountNftsMainnet = await result.current.getAccountNfts('0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1');
    expect(otherAccountNftsMainnet.length).toEqual(1);
    expect(otherAccountNftsMainnet[0].contractName).toEqual('Collection Gama');

    const accountNftsManualPolygon = await result.current.getAccountNfts('0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1', 137);
    expect(accountNftsManualPolygon.length).toEqual(0);
  });

  it('returns account NFTs between rerenders', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(({ chainId }) => useEtherspotNfts(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for nfts to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const otherAccountNftsMainnet = await result.current.getAccountNfts('0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1');
    expect(otherAccountNftsMainnet.length).toEqual(1);
    expect(otherAccountNftsMainnet[0].contractName).toEqual('Collection Gama');

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const accountNftsPolygon = await result.current.getAccountNfts();
    expect(accountNftsPolygon.length).toEqual(0);

    const accountNftsManualMainnet = await result.current.getAccountNfts('0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1', 1);
    expect(accountNftsManualMainnet.length).toEqual(1);
  });
})
