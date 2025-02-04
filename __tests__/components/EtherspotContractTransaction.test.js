import { render, renderHook } from '@testing-library/react';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import {
  EtherspotBatch,
  EtherspotBatches,
  EtherspotContractTransaction,
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

const abi = {
  inputs: [
    { internalType: 'address', name: 'to', type: 'address' },
    { internalType: 'uint256', name: 'value', type: 'uint256' },
  ],
  name: 'transfer',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
};

describe('EtherspotContractTransaction', () => {
  it('throws an error if <EtherspotContractTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() =>
      render(
        <EtherspotContractTransaction
          contractAddress={'0x'}
          params={[]}
          abi={'function test()'}
          methodName={'test'}
        >
          <span>test</span>
        </EtherspotContractTransaction>
      )
    ).toThrow('No parent <EtherspotBatch />');
  });

  it('throws error if wrong ABI provided', () => {
    expect(() =>
      render(
        <EtherspotTransactionKit provider={provider}>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotContractTransaction
                abi={['wrong']}
                contractAddress={'0x'}
                methodName={'test'}
                params={[0]}
              />
            </EtherspotBatch>
          </EtherspotBatches>
        </EtherspotTransactionKit>
      )
    ).toThrow();
  });

  it('throws error if wrong method name provided', () => {
    expect(() =>
      render(
        <EtherspotTransactionKit provider={provider}>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotContractTransaction
                abi={[abi]}
                contractAddress={'0x'}
                methodName={'transferFrom'}
                params={[0]}
              />
            </EtherspotBatch>
          </EtherspotBatches>
        </EtherspotTransactionKit>
      )
    ).toThrow();
  });

  it('throws error if wrong params provided', () => {
    expect(() =>
      render(
        <EtherspotTransactionKit provider={provider}>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotContractTransaction
                abi={[abi]}
                contractAddress={'0x'}
                methodName={'transfer'}
                params={['test']}
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
            <EtherspotContractTransaction
              abi={[abi]}
              contractAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              methodName={'transfer'}
              params={[
                '0x7F30B1960D5556929B03a0339814fE903c55a347',
                parseEther('123'),
              ]}
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
      '0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a347000000000000000000000000000000000000000000000006aaf7c8516d0c0000'
    );
    expect(current.batches[0].batches[0].transactions[0].value).toBe(undefined);
  });
});
