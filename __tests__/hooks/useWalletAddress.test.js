import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';
import { Factory } from '@etherspot/prime-sdk';

// hooks
import { EtherspotTransactionKit, useWalletAddress } from '../../src';
import {
  defaultAccountAddress,
  otherFactoryDefaultAccountAddress,
} from '../../__mocks__/@etherspot/prime-sdk';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

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
    expect(result.current).toEqual(defaultAccountAddress);
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

    const { result, rerender } = renderHook(({ providerType }) => useWalletAddress(providerType), {
      initialProps: { providerType: 'etherspot-prime' },
      wrapper,
    });

    await waitFor(() => expect(result.current).not.toBe(undefined));
    expect(result.current).toEqual(defaultAccountAddress);

    rerender({ providerType: 'whatever' });
    await waitFor(() => expect(result.current).toBe(undefined));
  });

  it('returns different wallet address when account template provided', async () => {
    const createWrapper = ({ accountTemplate } = {}) => ({ children }) => (
      <EtherspotTransactionKit provider={provider} accountTemplate={accountTemplate}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result: resultNoAccountTemplate } = renderHook(() => useWalletAddress(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(resultNoAccountTemplate.current).not.toBe(undefined));
    expect(resultNoAccountTemplate.current).toEqual(defaultAccountAddress);

    const { result: resultWithAccountTemplate } = renderHook(() => useWalletAddress(), {
      wrapper: createWrapper({ accountTemplate: Factory.SIMPLE_ACCOUNT }),
    });

    await waitFor(() => expect(resultWithAccountTemplate.current).not.toBe(undefined));
    expect(resultWithAccountTemplate.current).toEqual(otherFactoryDefaultAccountAddress);
  });
})
