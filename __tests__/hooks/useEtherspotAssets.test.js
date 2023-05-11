import { renderHook, waitFor } from '@testing-library/react';

// hooks
import { EtherspotTransactionKit, useEtherspotAssets } from '../../src';

describe('useEtherspotAssets()', () => {
  it('returns assets', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={null}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(({ chainId }) => useEtherspotAssets(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for assets to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());
    const assetsMainnet = await result.current.getAssets();
    expect(assetsMainnet.length).toEqual(3);

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const assetsPolygon = await result.current.getAssets();
    expect(assetsPolygon.length).toEqual(1);
  });
})
