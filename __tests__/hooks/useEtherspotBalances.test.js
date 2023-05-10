import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { useEtherspotBalances, EtherspotTransactionKit } from '../../src';

describe('useEtherspotBalances()', () => {
  it('returns balances', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={null}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(({ chainId }) => useEtherspotBalances(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for balances to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.length).toEqual(2);
    expect(result.current[0].token).toBeNull();
    expect(result.current[0].balance.toString()).toEqual(ethers.utils.parseEther('0').toString());
    expect(result.current[1].token).not.toBeNull();
    expect(result.current[1].balance.toString()).toEqual(ethers.utils.parseEther('420').toString());

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    // wait for balances to be fetched for chain ID 137
    await waitFor(() => expect(result.current.length).not.toEqual(2));
    expect(result.current.length).toEqual(1);
    expect(result.current[0].balance.toString()).toEqual(ethers.utils.parseEther('0').toString());
  });
})
