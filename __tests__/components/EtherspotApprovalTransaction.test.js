import { render, renderHook } from '@testing-library/react';
import { createWalletClient, http, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import {
  EtherspotApprovalTransaction,
  EtherspotBatch,
  EtherspotBatches,
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

describe('EtherspotApprovalTransaction', () => {
  it('throws an error if <EtherspotApprovalTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() =>
      render(
        <EtherspotApprovalTransaction
          tokenAddress={'0x'}
          receiverAddress={'0x'}
          value={'0'}
        >
          <span>test</span>
        </EtherspotApprovalTransaction>
      )
    ).toThrow('No parent <EtherspotBatch />');
  });

  it('throws error if wrong receiver address provided', () => {
    expect(() =>
      render(
        <EtherspotTransactionKit provider={provider}>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotApprovalTransaction
                tokenAddress={'0x'}
                receiverAddress={'0xtransfer'}
                value={parseEther('123')}
              />
            </EtherspotBatch>
          </EtherspotBatches>
        </EtherspotTransactionKit>
      )
    ).toThrow();
  });

  it('throws error if wrong value provided', () => {
    expect(() =>
      render(
        <EtherspotTransactionKit provider={provider}>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotApprovalTransaction
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

  it('builds transaction data successfully', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <EtherspotBatches>
          <EtherspotBatch>
            <EtherspotApprovalTransaction
              tokenAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              receiverAddress={'0x7F30B1960D5556929B03a0339814fE903c55a347'}
              value={parseUnits('123', 10)}
            />
            <EtherspotApprovalTransaction
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

    const {
      result: { current },
    } = renderHook(() => useEtherspotTransactions(), { wrapper });

    expect(current.batches[0].batches[0].transactions[0].to).toBe(
      '0xe3818504c1b32bf1557b16c238b2e01fd3149c17'
    );
    expect(current.batches[0].batches[0].transactions[0].data).toBe(
      '0x095ea7b30000000000000000000000007f30b1960d5556929b03a0339814fe903c55a3470000000000000000000000000000000000000000000000000000011e61b68c00'
    );
    expect(current.batches[0].batches[0].transactions[0].value).toBe(undefined);
    expect(current.batches[0].batches[0].transactions[1].data).toBe(
      '0x095ea7b30000000000000000000000007f30b1960d5556929b03a0339814fe903c55a3470000000000000000000000000000000000000000000000000000011e61b68c00'
    );
  });
});
