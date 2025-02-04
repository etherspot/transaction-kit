import { render, renderHook, waitFor } from '@testing-library/react';
import { createWalletClient, http, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import {
  EtherspotTransactionKit,
  ProviderWalletTransaction,
  useProviderWalletTransaction,
} from '../../src';

const randomWallet = privateKeyToAccount(
  `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')}`
);
const provider = createWalletClient({
  account: randomWallet,
  chain: sepolia,
  transport: http('http://localhost:8545'),
});

describe('useProviderWalletTransaction()', () => {
  it('returns correct transaction on dynamically rendered components', async () => {
    let showAnother = false;

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            {!showAnother && (
              <ProviderWalletTransaction
                chainId={69}
                to={'0x0'}
                data={'0xFFF'}
                value={'420'}
              />
            )}
            {showAnother && (
              <ProviderWalletTransaction
                chainId={420}
                to={'0x123'}
                data={'0x456'}
                value={undefined}
              />
            )}
          </span>
        </div>
        {children}
      </EtherspotTransactionKit>
    );

    const { result, rerender } = renderHook(
      () => useProviderWalletTransaction(),
      { wrapper }
    );

    expect(toHex(result.current.transaction.value)).toEqual(
      '0x16c4abbebea0100000'
    );
    expect(result.current.transaction.to).toBe('0x0');
    expect(result.current.transaction.data).toBe('0xFFF');
    expect(result.current.transaction.chainId).toBe(69);

    showAnother = true;
    rerender();

    await waitFor(() =>
      expect(result.current.transaction.value).toBe(undefined)
    );
    expect(result.current.transaction.to).toBe('0x123');
    expect(result.current.transaction.data).toBe('0x456');
    expect(result.current.transaction.chainId).toBe(420);
  });

  it('returns correct transaction', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <ProviderWalletTransaction
              chainId={69}
              to={'0x0'}
              data={'0xFFF'}
              value={'420'}
            />
          </span>
        </div>
        {children}
      </EtherspotTransactionKit>
    );

    const {
      result: {
        current: {
          transaction: { value, to, data, chainId },
        },
      },
    } = renderHook(() => useProviderWalletTransaction(), { wrapper });

    expect(toHex(value)).toStrictEqual('0x16c4abbebea0100000');
    expect(to).toBe('0x0');
    expect(data).toBe('0xFFF');
    expect(chainId).toBe(69);
  });

  it('throws an error if multiple <ProviderWalletTransaction /> rendered', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <ProviderWalletTransaction to={'0x12'} data={'0x0'} value={'0.123'}>
              <span>test</span>
            </ProviderWalletTransaction>
          </span>
        </div>
        <ProviderWalletTransaction to={'0x0'} data={'0x0'} value={undefined}>
          <span>test</span>
        </ProviderWalletTransaction>
        {children}
      </EtherspotTransactionKit>
    );

    expect(() =>
      renderHook(() => useProviderWalletTransaction(), { wrapper })
    ).toThrow('Multiple <ProviderWalletTransaction /> not allowed');
  });

  it('throws an error if <ProviderWalletTransaction /> rendered without <EtherspotTransactionKit /> that includes <EtherspotContextProvider />', () => {
    expect(() =>
      render(
        <ProviderWalletTransaction to={'0x12'} data={'0x0'} value={'0.123'}>
          <span>test</span>
        </ProviderWalletTransaction>
      )
    ).toThrow('No parent <EtherspotContextProvider />');
  });
});
