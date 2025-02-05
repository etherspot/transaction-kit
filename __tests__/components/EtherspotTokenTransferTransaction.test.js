import { render, renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { createWalletClient, http, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import {
  EtherspotBatch,
  EtherspotBatches,
  EtherspotTokenTransferTransaction,
  EtherspotTransactionKit,
  useEtherspotTransactions,
} from '../../src';

const randomWallet = privateKeyToAccount(
  `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')}`
);
const provider = createWalletClient({
  account: randomWallet,
  chain: sepolia,
  transport: http('http://localhost:8545'),
});

describe('EtherspotTokenTransferTransaction', () => {
  it('throws an error if <EtherspotTokenTransferTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() =>
      render(
        <EtherspotTransactionKit provider={provider}>
          <EtherspotTokenTransferTransaction
            tokenAddress={'0x'}
            receiverAddress={'0x'}
            value={'0'}
          >
            <span>test</span>
          </EtherspotTokenTransferTransaction>
        </EtherspotTransactionKit>
      )
    ).toThrow('No parent <EtherspotBatch />');
  });

  it('throws error if wrong receiver address provided', async () => {
    await expect(async () => {
      await act(() => {
        render(
          <EtherspotTransactionKit provider={provider}>
            <EtherspotBatches>
              <EtherspotBatch>
                <EtherspotTokenTransferTransaction
                  tokenAddress={'0x'}
                  receiverAddress={'0xtransfer'}
                  value={parseEther('123')}
                />
              </EtherspotBatch>
            </EtherspotBatches>
          </EtherspotTransactionKit>
        );
      });
    }).rejects.toThrow();
  });

  it('throws error if wrong value provided', () => {
    expect(() =>
      render(
        <EtherspotTransactionKit provider={provider}>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotTokenTransferTransaction
                tokenAddress={'0x'}
                receiverAddress={'0x7F30B1960D5556929B03a0339814fE903c55a347'}
                value={'test'}
              />
            </EtherspotBatch>
          </EtherspotBatches>
        </EtherspotTransactionKit>
      )
    ).toThrow();
  });

  it('builds transaction data successfully', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <EtherspotBatches>
          <EtherspotBatch>
            <EtherspotTokenTransferTransaction
              tokenAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              receiverAddress={'0x7F30B1960D5556929B03a0339814fE903c55a347'}
              value={parseUnits('123', 10)}
            />
            <EtherspotTokenTransferTransaction
              tokenAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              receiverAddress={'0x7F30B1960D5556929B03a0339814fE903c55a347'}
              value={'123'}
              tokenDecimals={10}
            />
          </EtherspotBatch>
        </EtherspotBatches>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    // wait for transaction to be built into state
    await waitFor(() =>
      expect(result.current.batches[0].batches[0].transactions[0]).not.toBe(
        undefined
      )
    );

    expect(result.current.batches[0].batches[0].transactions[0].to).toBe(
      '0xe3818504c1b32bf1557b16c238b2e01fd3149c17'
    );
    expect(result.current.batches[0].batches[0].transactions[0].data).toBe(
      '0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a3470000000000000000000000000000000000000000000000000000011e61b68c00'
    );
    expect(result.current.batches[0].batches[0].transactions[0].value).toBe(
      undefined
    );
    expect(result.current.batches[0].batches[0].transactions[1].data).toBe(
      '0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a3470000000000000000000000000000000000000000000000000000011e61b68c00'
    );
  });
});
