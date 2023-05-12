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

    const accountBalancesMainnet = await result.current.getAccountBalances();
    expect(accountBalancesMainnet.length).toEqual(2);
    expect(accountBalancesMainnet[0].token).toBeNull();
    expect(accountBalancesMainnet[0].balance.toString()).toEqual(ethers.utils.parseEther('0').toString());
    expect(accountBalancesMainnet[1].token).not.toBeNull();
    expect(accountBalancesMainnet[1].balance.toString()).toEqual(ethers.utils.parseEther('420').toString());

    const otherAccountBalancesMainnet = await result.current.getAccountBalances('0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1');
    expect(otherAccountBalancesMainnet.length).toEqual(2);
    expect(otherAccountBalancesMainnet[1].token).not.toBeNull();
    expect(otherAccountBalancesMainnet[1].balance.toString()).toEqual(ethers.utils.parseEther('69').toString());

    // rerender with different chain ID 137
    rerender({ chainId: 137 });

    const accountBalancesPolygon = await result.current.getAccountBalances();
    expect(accountBalancesPolygon.length).toEqual(1);
    expect(accountBalancesPolygon[0].balance.toString()).toEqual(ethers.utils.parseEther('0').toString());
  });
})
