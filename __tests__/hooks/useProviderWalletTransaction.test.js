import { renderHook, render, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

import {
  useProviderWalletTransaction,
  EtherspotTransactionKit,
  ProviderWalletTransaction,
} from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'goerli'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

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

    const { result, rerender } = renderHook(() => useProviderWalletTransaction(), { wrapper });

    expect(result.current.transaction.value.toJSON()).toStrictEqual({"hex": "0x16c4abbebea0100000", "type": "BigNumber"});
    expect(result.current.transaction.to).toBe('0x0');
    expect(result.current.transaction.data).toBe('0xFFF');
    expect(result.current.transaction.chainId).toBe(69);

    showAnother = true;
    rerender();

    await waitFor(() => expect(result.current.transaction.value).toBe(undefined));
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
          transaction: { value, to, data, chainId }
        }
      }
    } = renderHook(() => useProviderWalletTransaction(), { wrapper });

    expect(value.toJSON()).toStrictEqual({"hex": "0x16c4abbebea0100000", "type": "BigNumber"});
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
          <ProviderWalletTransaction
            to={'0x12'}
            data={'0x0'}
            value={'0.123'}
          >
            <span>test</span>
          </ProviderWalletTransaction>
        </span>
        </div>
        <ProviderWalletTransaction
          to={'0x0'}
          data={'0x0'}
          value={undefined}
        >
          <span>test</span>
        </ProviderWalletTransaction>
        {children}
      </EtherspotTransactionKit>
    );

    expect(() => renderHook(() => useProviderWalletTransaction(), { wrapper }))
      .toThrow('Multiple <ProviderWalletTransaction /> not allowed');
  });

  it('throws an error if <ProviderWalletTransaction /> rendered without <EtherspotTransactionKit /> that includes <EtherspotContextProvider />', () => {
    expect(() => render(
      <ProviderWalletTransaction
        to={'0x12'}
        data={'0x0'}
        value={'0.123'}
      >
          <span>test</span>
      </ProviderWalletTransaction>
    ))
      .toThrow('No parent <EtherspotContextProvider />');
  });
})
