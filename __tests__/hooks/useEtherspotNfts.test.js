import { renderHook, waitFor } from '@testing-library/react';

// hooks
import { useEtherspotNfts, EtherspotTransactionKit } from '../../src';

describe('useEtherspotNfts()', () => {
  it('returns NFTs', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={null}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(({ chainId }) => useEtherspotNfts(chainId), {
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

    const otherAccountNftsMainnet = await result.current.getAccountNfts('0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1');
    expect(otherAccountNftsMainnet.length).toEqual(1);
    expect(otherAccountNftsMainnet[0].contractName).toEqual('Collection Gama');

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const accountNftsPolygon = await result.current.getAccountNfts();
    expect(accountNftsPolygon.length).toEqual(0);
  });
})
