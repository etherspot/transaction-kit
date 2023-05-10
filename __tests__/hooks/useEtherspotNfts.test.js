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
    expect(result.current.length).toEqual(2);
    expect(result.current[0].contractName).toEqual('Collection Alpha');
    expect(result.current[0].items.length).toEqual(1);
    expect(result.current[0].items[0].tokenId).toEqual(420);

    expect(result.current[1].contractName).toEqual('Collection Beta');
    expect(result.current[1].items.length).toEqual(2);
    expect(result.current[1].items[0].tokenId).toEqual(6);
    expect(result.current[1].items[1].tokenId).toEqual(9);

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    // wait for nfts to be fetched for chain ID 137
    await waitFor(() => expect(result.current.length).not.toEqual(2));
    expect(result.current.length).toEqual(0);
  });
})
