import { renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { defaultAccountAddress } from '../../__mocks__/@etherspot/modular-sdk';
import { EtherspotTransactionKit, useWalletAddress } from '../../src';

const randomWallet = privateKeyToAccount(
  `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')}`
);
const provider = createWalletClient({
  account: randomWallet,
  chain: sepolia,
  transport: http('http://localhost:8545'),
});

const providerWalletAddress = provider.address;

describe('useWalletAddress()', () => {
  it('returns default type wallet address', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useWalletAddress(), { wrapper });

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(defaultAccountAddress);
  });

  it('returns wallet address by type', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(
      ({ providerType }) => useWalletAddress(providerType),
      {
        initialProps: { providerType: 'etherspot' },
        wrapper,
      }
    );

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(defaultAccountAddress);

    rerender({ providerType: 'provider' });
    await waitFor(() => expect(result.current).not.toBe(defaultAccountAddress));
    expect(result.current).toEqual(providerWalletAddress);
  });

  it('returns undefined wallet address if not valid type', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(
      ({ providerType }) => useWalletAddress(providerType),
      {
        initialProps: { providerType: 'etherspot' },
        wrapper,
      }
    );

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(defaultAccountAddress);

    rerender({ providerType: 'whatever' });
    await waitFor(() => expect(result.current).toBe(undefined));
  });
});
