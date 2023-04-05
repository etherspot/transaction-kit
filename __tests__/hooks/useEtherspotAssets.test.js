import { renderHook, waitFor } from '@testing-library/react';

// hooks
import { EtherspotUi, useEtherspotAssets } from '../../src';

describe('useEtherspotAssets()', () => {
  it('returns assets', async () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
        {children}
      </EtherspotUi>
    );

    const { result, rerender } = renderHook(({ chainId }) => useEtherspotAssets(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for assets to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.length).toEqual(3);

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    // wait for assets to be fetched for chain ID 137
    await waitFor(() => expect(result.current.length).not.toEqual(3));
    expect(result.current.length).toEqual(1);
  });
})
