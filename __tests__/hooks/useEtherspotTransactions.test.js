import { render, renderHook, waitFor } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { act } from 'react';
import { createWalletClient, http, parseEther, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import {
  EtherspotBatch,
  EtherspotBatches,
  EtherspotContractTransaction,
  EtherspotTransaction,
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
const TestSingleBatchComponent = () => (
  <EtherspotBatches>
    <EtherspotBatch chainId={1}>
      <EtherspotTransaction to={'0x12'} data={'0x0'} value={'0.123'} />
      <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
    </EtherspotBatch>
  </EtherspotBatches>
);

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

jest.mock('@etherspot/data-utils', () => ({
  DataUtils: jest.fn().mockImplementation(() => ({
    getAccountBalances: jest.fn(({ chainId, account }) => {
      const { parseEther } = require('viem');
      const {
        defaultAccountAddress,
        otherAccountAddress,
      } = require('../../__mocks__/@etherspot/modular-sdk');

      const tokenBalance = parseEther('420');
      const nativeAssetBalance = parseEther('0');

      const token = {
        token: '0x',
        balance: tokenBalance,
        superBalance: tokenBalance,
      };
      const nativeAsset = {
        token: null,
        balance: nativeAssetBalance,
        superBalance: nativeAssetBalance,
      };

      if (chainId !== 1) {
        return { items: [nativeAsset] };
      }

      if (account === defaultAccountAddress) {
        return { items: [nativeAsset, token] };
      }

      if (account === otherAccountAddress) {
        return {
          items: [nativeAsset, { ...token, balance: parseEther('69') }],
        };
      }

      return { items: [] };
    }),
  })),
}));

describe('useEtherspotTransactions()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('returns grouped batches', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <EtherspotBatches skip>
          <span>test</span>
        </EtherspotBatches>
        <EtherspotBatches paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}>
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x420'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const {
      result: { current },
    } = renderHook(() => useEtherspotTransactions(), { wrapper });

    expect(current.batches.length).toBe(5);
    expect(current.batches[0].batches.length).toBe(1);
    expect(current.batches[0].batches[0].chainId).toBe(123);
    expect(current.batches[0].batches[0].transactions.length).toBe(3);
    expect(current.batches[0].batches[0].transactions[1].to).toBe('0x0');
    expect(current.batches[0].batches[0].transactions[1].data).toBe('0xFFF');
    expect(
      toHex(current.batches[0].batches[0].transactions[1].value)
    ).toStrictEqual('0x16c4abbebea0100000');
    expect(current.batches[0].batches[0].transactions[2].to).toBe(
      '0xe3818504c1b32bf1557b16c238b2e01fd3149c17'
    );
    expect(current.batches[0].batches[0].transactions[2].data).toBe(
      '0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a347000000000000000000000000000000000000000000000006aaf7c8516d0c0000'
    );
    expect(current.batches[0].batches[0].transactions[2].value).toBe(undefined);
    expect(current.batches[1].skip).toBe(true);
    expect(current.batches[2].paymaster).toStrictEqual({
      url: 'someUrl',
      api_key: 'someApiKey',
    });
  });

  it('throws an error if <EtherspotBatches /> within <EtherspotBatches />', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatches>
                <span>test</span>
              </EtherspotBatches>
            </EtherspotBatches>
          </span>
        </div>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
        {children}
      </EtherspotTransactionKit>
    );

    expect(() =>
      renderHook(() => useEtherspotTransactions(), { wrapper })
    ).toThrow('<EtherspotBatches /> cannot be inside <EtherspotBatches />');
  });

  it('throws an error if <EtherspotBatch /> within <EtherspotBatch />', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatch>
                <EtherspotBatch>
                  <span>test</span>
                </EtherspotBatch>
              </EtherspotBatch>
            </EtherspotBatches>
          </span>
        </div>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
        {children}
      </EtherspotTransactionKit>
    );

    expect(() =>
      renderHook(() => useEtherspotTransactions(), { wrapper })
    ).toThrow('<EtherspotBatch /> cannot be inside <EtherspotBatch />');
  });

  it('throws an error if <EtherspotBatches /> rendered without <EtherspotTransactionKit />', () => {
    expect(() =>
      render(
        <EtherspotBatches>
          <EtherspotBatches>
            <span>test</span>
          </EtherspotBatches>
        </EtherspotBatches>
      )
    ).toThrow('No parent <EtherspotTransactionKit />');
  });

  it('throws an error if <EtherspotBatch /> rendered without <EtherspotBatches />', () => {
    expect(() =>
      render(
        <EtherspotBatch>
          <span>test</span>
        </EtherspotBatch>
      )
    ).toThrow('No parent <EtherspotBatches />');
  });

  it('throws an error if <EtherspotTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() =>
      render(
        <EtherspotTransaction to={'0x'}>
          <span>test</span>
        </EtherspotTransaction>
      )
    ).toThrow('No parent <EtherspotBatch />');
  });

  it('single grouped batches estimate returns cost and send returns userOp hash successfully', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate();
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(false);
    expect(BigNumber.isBigNumber(estimated[0].estimatedBatches[0].cost)).toBe(
      true
    );
    expect(estimated[0].estimatedBatches[0].cost.toString()).toBe(
      '350000000000000'
    );

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent = await sendPromise;
    expect(result.current.containsSendingError).toBe(false);
    expect(sent[0].sentBatches[0].userOpHash).toBe('0x7c');
  });

  it('estimates and sends single grouped batches without calling estimate', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent = await sendPromise;
    expect(result.current.containsSendingError).toBe(false);
    expect(sent[0].estimatedBatches[0].cost.toString()).toBe('350000000000000');
    expect(sent[0].sentBatches[0].userOpHash).toBe('0x7c');
  });

  it('estimates and sends multiple grouped batches with skipped and with no batches', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
              <EtherspotBatch chainId={124}>
                <EtherspotTransaction
                  to={'0x124'}
                  data={'0x0'}
                  value={'0.124'}
                />
              </EtherspotBatch>
            </EtherspotBatches>
          </span>
        </div>
        <EtherspotBatches skip>
          <span>test</span>
        </EtherspotBatches>
        <EtherspotBatches>
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x420'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate();
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(false);
    expect(estimated[0].estimatedBatches[0].cost.toString()).toBe(
      '350000000000000'
    );
    expect(estimated[0].estimatedBatches[1].cost.toString()).toBe(
      '200000000000000'
    );
    expect(estimated[1].estimatedBatches.length).toBe(0); // has skip prop
    expect(estimated[2].estimatedBatches[0].cost.toString()).toBe(
      '250000000000000'
    );

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent = await sendPromise;
    expect(result.current.containsSendingError).toBe(false);
    expect(sent[0].sentBatches[0].userOpHash).toBe('0x7c');
    expect(sent[0].sentBatches[1].userOpHash).toBe('0x7d');
    expect(sent[1].sentBatches.length).toBe(0); // has skip prop
    expect(sent[2].sentBatches[0].userOpHash).toBe('0x46');
  });

  it('estimates and sends multiple grouped batches with paymaster', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <EtherspotBatches paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}>
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x420'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate();
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(false);
    expect(estimated[0].estimatedBatches[0].cost.toString()).toBe(
      '350000000000000'
    );
    expect(estimated[1].estimatedBatches[0].cost.toString()).toBe(
      '650000000000000'
    );

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent = await sendPromise;
    expect(result.current.containsSendingError).toBe(false);
    expect(sent[0].sentBatches[0].userOpHash).toBe('0x7c');
    expect(sent[1].sentBatches[0].userOpHash).toBe('0x46');
  });

  it('estimates and sends multiple grouped batches with matching chain IDs', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x124'}
                  data={'0x0'}
                  value={'0.124'}
                />
              </EtherspotBatch>
            </EtherspotBatches>
          </span>
        </div>
        <EtherspotBatches paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}>
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x420'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <EtherspotBatches paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}>
          <EtherspotBatch chainId={123}>
            <EtherspotTransaction to={'0x420'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate();
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(false);
    expect(estimated[0].estimatedBatches[0].cost.toString()).toBe(
      '350000000000000'
    );
    expect(estimated[0].estimatedBatches[1].cost.toString()).toBe(
      '200000000000000'
    );
    expect(estimated[1].estimatedBatches[0].cost.toString()).toBe(
      '650000000000000'
    );
    expect(estimated[2].estimatedBatches[0].cost.toString()).toBe(
      '650000000000000'
    );

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent = await sendPromise;
    expect(result.current.containsSendingError).toBe(false);
    expect(sent[0].sentBatches[0].userOpHash).toBe('0x7c');
    expect(sent[0].sentBatches[1].userOpHash).toBe('0x7e');
    expect(sent[1].sentBatches[0].userOpHash).toBe('0x46');
    expect(sent[2].sentBatches[0].userOpHash).toBe('0x7d');
  });

  it('estimates and calls onEstimated for each batch group', async () => {
    const onEstimated1 = jest.fn((estimated) => estimated);
    const onEstimated2 = jest.fn((estimated) => estimated);

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches onEstimated={onEstimated1}>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
              <EtherspotBatch chainId={124}>
                <EtherspotTransaction
                  to={'0x124'}
                  data={'0x0'}
                  value={'0.124'}
                />
              </EtherspotBatch>
            </EtherspotBatches>
          </span>
        </div>
        <EtherspotBatches
          paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}
          onEstimated={onEstimated2}
        >
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x420'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate();
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(false);
    expect(onEstimated1).toBeCalledTimes(1);
    expect(onEstimated2).toBeCalledTimes(1);
    expect(onEstimated1.mock.calls[0][0]).toStrictEqual(
      estimated[0].estimatedBatches
    );
    expect(onEstimated2.mock.calls[0][0]).toStrictEqual(
      estimated[1].estimatedBatches
    );
  });

  it('sends and calls onSent for each batch group', async () => {
    const onSent1 = jest.fn((sent) => sent);
    const onSent2 = jest.fn((sent) => sent);

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches onSent={onSent1}>
              <EtherspotBatch chainId={123}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
              <EtherspotBatch chainId={124}>
                <EtherspotTransaction
                  to={'0x124'}
                  data={'0x0'}
                  value={'0.124'}
                />
              </EtherspotBatch>
            </EtherspotBatches>
          </span>
        </div>
        <EtherspotBatches
          paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}
          onSent={onSent2}
        >
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x420'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent = await sendPromise;

    expect(onSent1).toBeCalledTimes(1);
    expect(onSent2).toBeCalledTimes(1);
    expect(onSent1.mock.calls[0][0]).toStrictEqual(sent[0].sentBatches);
    expect(onSent2.mock.calls[0][0]).toStrictEqual(sent[1].sentBatches);
  });

  it('estimates and returns error messages for each batch group', async () => {
    const onEstimated1 = jest.fn((estimated) => estimated);
    const onEstimated2 = jest.fn((estimated) => estimated);

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches onEstimated={onEstimated1}>
              <EtherspotBatch chainId={420}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <EtherspotBatches
          paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}
          onEstimated={onEstimated2}
        >
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction
              to={'0xDEADBEEF'}
              data={'0x69420'}
              value={'69'}
            />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate();
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(true);
    expect(estimated[0].estimatedBatches[0].errorMessage).toBe(
      'Transaction reverted: chain too high'
    );
    expect(estimated[1].estimatedBatches[0].errorMessage).toBe(
      'Transaction reverted: invalid address'
    );
    expect(onEstimated1.mock.calls[0][0]).toStrictEqual(
      estimated[0].estimatedBatches
    );
    expect(onEstimated2.mock.calls[0][0]).toStrictEqual(
      estimated[1].estimatedBatches
    );
  });

  it('estimates successfully and returns error messages on send for each batch group', async () => {
    const onSent1 = jest.fn((sent) => sent);
    const onSent2 = jest.fn((sent) => sent);

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches onSent={onSent1}>
              <EtherspotBatch chainId={696969}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <EtherspotBatches
          paymaster={{ url: 'someUnstableUrl', api_key: 'someApiKey' }}
          onSent={onSent2}
        >
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x123'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate();
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(false);
    expect(estimated[0].estimatedBatches[0].cost.toString()).toBe(
      '350000000000000'
    );
    expect(estimated[1].estimatedBatches[0].cost.toString()).toBe(
      '250000000000000'
    );

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send();
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent = await sendPromise;

    expect(result.current.containsSendingError).toBe(true);
    expect(sent[0].sentBatches[0].errorMessage).toBe(
      'Transaction reverted: chain too hot'
    );
    expect(sent[1].sentBatches[0].errorMessage).toBe(
      'Transaction reverted: invalid signature'
    );
    expect(onSent1.mock.calls[0][0]).toStrictEqual(sent[0].sentBatches);
    expect(onSent2.mock.calls[0][0]).toStrictEqual(sent[1].sentBatches);
  });

  it('estimates valid and returns error messages for invalid batch group by ID', async () => {
    const onEstimated1 = jest.fn((estimated) => estimated);
    const onEstimated2 = jest.fn((estimated) => estimated);
    const onEstimated3 = jest.fn((estimated) => estimated);

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches onEstimated={onEstimated1} id="test-id-1">
              <EtherspotBatch chainId={420}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <EtherspotBatches
          paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}
          onEstimated={onEstimated2}
          id="test-id-2"
        >
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x123'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <EtherspotBatches onEstimated={onEstimated3} id="test-id-3">
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <EtherspotBatches paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}>
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x123'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isEstimating).toBe(false);

    let estimatePromise;
    act(() => {
      estimatePromise = result.current.estimate(['test-id-1']);
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated1 = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(true);
    expect(estimated1.length).toBe(1);
    expect(estimated1[0].estimatedBatches[0].errorMessage).toBe(
      'Transaction reverted: chain too high'
    );
    expect(onEstimated1.mock.calls[0][0]).toStrictEqual(
      estimated1[0].estimatedBatches
    );

    act(() => {
      estimatePromise = result.current.estimate(['test-id-2', 'test-id-3']);
    });

    await waitFor(() => expect(result.current.isEstimating).toBe(true));
    await waitFor(() => expect(result.current.isEstimating).toBe(false));

    const estimated2 = await estimatePromise;
    expect(result.current.containsEstimatingError).toBe(false);
    expect(estimated2.length).toBe(2);
    expect(estimated2[0].estimatedBatches[0].cost.toString()).toBe(
      '650000000000000'
    );
    expect(estimated2[1].estimatedBatches[0].cost.toString()).toBe(
      '200000000000000'
    );
    expect(onEstimated2.mock.calls[0][0]).toStrictEqual(
      estimated2[0].estimatedBatches
    );
    expect(onEstimated3.mock.calls[0][0]).toStrictEqual(
      estimated2[1].estimatedBatches
    );
  });

  it('sends valid and returns error messages for invalid batch group by ID', async () => {
    const onSent1 = jest.fn((estimated) => estimated);
    const onSent2 = jest.fn((estimated) => estimated);
    const onSent3 = jest.fn((estimated) => estimated);

    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
            <EtherspotBatches onSent={onSent1} id="test-id-1">
              <EtherspotBatch chainId={696969}>
                <EtherspotTransaction
                  to={'0x12'}
                  data={'0x0'}
                  value={'0.123'}
                />
                <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
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
          </span>
        </div>
        <EtherspotBatches
          paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}
          onSent={onSent2}
          id="test-id-2"
        >
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x123'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <EtherspotBatches onSent={onSent3} id="test-id-3">
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x0'} data={'0xFFF'} value={'420'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <EtherspotBatches paymaster={{ url: 'someUrl', api_key: 'someApiKey' }}>
          <EtherspotBatch chainId={69}>
            <EtherspotTransaction to={'0x123'} data={'0x69420'} value={'69'} />
          </EtherspotBatch>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(() => useEtherspotTransactions(), {
      wrapper,
    });

    expect(result.current.isSending).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.send(['test-id-1']);
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent1 = await sendPromise;
    expect(sent1.length).toBe(1);
    expect(result.current.containsSendingError).toBe(true);
    expect(sent1[0].sentBatches[0].errorMessage).toBe(
      'Transaction reverted: chain too hot'
    );
    expect(onSent1.mock.calls[0][0]).toStrictEqual(sent1[0].sentBatches);

    act(() => {
      sendPromise = result.current.send(['test-id-2', 'test-id-3']);
    });

    await waitFor(() => expect(result.current.isSending).toBe(true));
    await waitFor(() => expect(result.current.isSending).toBe(false));

    const sent2 = await sendPromise;
    expect(sent2.length).toBe(2);
    expect(result.current.containsSendingError).toBe(false);
    expect(sent2[0].sentBatches[0].userOpHash).toBe('0x46');
    expect(sent2[1].sentBatches[0].userOpHash).toBe('0x47');
    expect(onSent2.mock.calls[0][0]).toStrictEqual(sent2[0].sentBatches);
    expect(onSent3.mock.calls[0][0]).toStrictEqual(sent2[1].sentBatches);
  });
});
