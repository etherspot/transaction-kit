import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { EtherspotTransactionKit, useWalletAddress } from '../../src';

const provider = new ethers.Wallet.createRandom();

const etherspotAddress = '0x7F30B1960D5556929B03a0339814fE903c55a347';
const etherspotPrimeAddress = '0x07ff85757f5209534EB601E1CA60d72807ECE0bC';
const providerWalletAddress = provider.address;

describe('useWalletAddress()', () => {
  it('returns wallet address by type', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(({ providerType }) => useWalletAddress(providerType), {
      initialProps: { providerType: 'etherspot' },
      wrapper,
    });

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(etherspotAddress);

    rerender({ providerType: 'etherspot-prime' });
    await waitFor(() => expect(result.current).not.toBe(etherspotAddress));
    expect(result.current).toEqual(etherspotPrimeAddress);

    rerender({ providerType: 'provider' });
    await waitFor(() => expect(result.current).not.toBe(etherspotPrimeAddress));
    expect(result.current).toEqual(providerWalletAddress);
  });

  it('returns undefined wallet address if not valid type', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(({ providerType }) => useWalletAddress(providerType), {
      initialProps: { providerType: 'etherspot' },
      wrapper,
    });

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(etherspotAddress);

    rerender({ providerType: 'whatever' });
    expect(result.current).toEqual(undefined);
  });
})
