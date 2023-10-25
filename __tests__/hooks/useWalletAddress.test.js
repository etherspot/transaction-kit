import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { EtherspotTransactionKit, useWalletAddress } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'goerli'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

const etherspotPrimeAddress = '0x7F30B1960D5556929B03a0339814fE903c55a347';
const providerWalletAddress = provider.address;

describe('useWalletAddress()', () => {
  it('returns default type wallet address if no provided type', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useWalletAddress(), { wrapper });

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(etherspotPrimeAddress);
  });

  it('returns wallet address by type', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(({ providerType }) => useWalletAddress(providerType), {
      initialProps: { providerType: 'etherspot-prime' },
      wrapper,
    });

    await waitFor(() => expect(result.current).not.toBe(undefined));
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
      initialProps: { providerType: 'etherspot-prime' },
      wrapper,
    });

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(etherspotPrimeAddress);

    rerender({ providerType: 'whatever' });
    await waitFor(() => expect(result.current).toBe(undefined));
  });
})
