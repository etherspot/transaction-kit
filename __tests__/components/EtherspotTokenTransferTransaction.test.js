import { renderHook, render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { ethers } from 'ethers';

import { useEtherspotTransactions, EtherspotTransactionKit, EtherspotBatches, EtherspotBatch, EtherspotTokenTransferTransaction } from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

describe('EtherspotTokenTransferTransaction', () => {
  it('throws an error if <EtherspotTokenTransferTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() => render(
      <EtherspotTransactionKit provider={provider}>
        <EtherspotTokenTransferTransaction
          tokenAddress={'0x'}
          receiverAddress={'0x'}
          value={'0'}
        >
          <span>test</span>
        </EtherspotTokenTransferTransaction>
      </EtherspotTransactionKit>
    ))
      .toThrow('No parent <EtherspotBatch />');
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
                  value={ethers.utils.parseEther('123')}
                />
              </EtherspotBatch>
            </EtherspotBatches>
          </EtherspotTransactionKit>
        );
      })
    }).rejects.toThrow(
      'Failed to build transaction data, please check data/method formatting: invalid address'
      + ' (argument="address", value="0xtransfer", code=INVALID_ARGUMENT, version=address/5.7.0)'
      + ' (argument=\"to\", value="0xtransfer", code=INVALID_ARGUMENT, version=abi/5.7.0)'
    );
  });

  it('throws error if wrong value provided', () => {
    expect(() => render(
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
    ))
      .toThrow(
        'Failed to parse provided value, please make sure value is wei: invalid decimal value'
        + ' (argument="value", value="test", code=INVALID_ARGUMENT, version=bignumber/5.7.0)'
      );
  });

  it('builds transaction data successfully', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <EtherspotBatches>
          <EtherspotBatch>
            <EtherspotTokenTransferTransaction
              tokenAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              receiverAddress={'0x7F30B1960D5556929B03a0339814fE903c55a347'}
              value={ethers.utils.parseUnits('123', 10)}
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

    const { result } = renderHook(() => useEtherspotTransactions(), { wrapper });

    // wait for transaction to be built into state
    await waitFor(() => expect(result.current.batches[0].batches[0].transactions[0]).not.toBe(undefined));

    expect(result.current.batches[0].batches[0].transactions[0].to).toBe('0xe3818504c1b32bf1557b16c238b2e01fd3149c17');
    expect(result.current.batches[0].batches[0].transactions[0].data).toBe('0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a3470000000000000000000000000000000000000000000000000000011e61b68c00');
    expect(result.current.batches[0].batches[0].transactions[0].value).toBe(undefined);
    expect(result.current.batches[0].batches[0].transactions[1].data).toBe('0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a3470000000000000000000000000000000000000000000000000000011e61b68c00');
  });
})
