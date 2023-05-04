import { renderHook, render } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { useEtherspotTransactions, EtherspotTransactionKit, EtherspotBatches, EtherspotBatch, EtherspotContractTransaction, EtherspotTransaction } from '../../src';

const TestSingleBatchComponent = () => (
  <EtherspotBatches>
    <EtherspotBatch chainId={1} gasTokenAddress={'testGasTokenAddress'}>
      <EtherspotTransaction
        to={'0x12'}
        data={'0x0'}
        value={'0.123'}
      />
      <EtherspotTransaction
        to={'0x0'}
        data={'0xFFF'}
        value={'420'}
      />
    </EtherspotBatch>
  </EtherspotBatches>
);

describe('useEtherspotTransactions()', () => {
  it('returns grouped batches', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={null}>
        <div>
          test
          <span>
          <EtherspotBatches>
            <EtherspotBatch chainId={123} gasTokenAddress={'testGasTokenAddress'}>
              <EtherspotTransaction
                to={'0x12'}
                data={'0x0'}
                value={'0.123'}
              />
              <EtherspotTransaction
                to={'0x0'}
                data={'0xFFF'}
                value={'420'}
              />
            <EtherspotContractTransaction
              abi={['function transfer(address, uint)']}
              contractAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              methodName={'transfer'}
              params={['0x7F30B1960D5556929B03a0339814fE903c55a347', ethers.utils.parseEther('123')]}
            />
            </EtherspotBatch>
          </EtherspotBatches>
        </span>
        </div>
        <EtherspotBatches skip>
          <span>test</span>
        </EtherspotBatches>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
        <TestSingleBatchComponent />
        {children}
      </EtherspotTransactionKit>
    );

    const { result: { current } } = renderHook(() => useEtherspotTransactions(), { wrapper });

    expect(current.batches.length).toBe(4);
    expect(current.batches[0].batches.length).toBe(1);
    expect(current.batches[0].batches[0].chainId).toBe(123);
    expect(current.batches[0].batches[0].gasTokenAddress).toBe('testGasTokenAddress');
    expect(current.batches[0].batches[0].transactions.length).toBe(3);
    expect(current.batches[0].batches[0].transactions[1].to).toBe('0x0');
    expect(current.batches[0].batches[0].transactions[1].data).toBe('0xFFF');
    expect(current.batches[0].batches[0].transactions[1].value.toJSON()).toStrictEqual({"hex": "0x16c4abbebea0100000", "type": "BigNumber"});
    expect(current.batches[0].batches[0].transactions[2].to).toBe('0xe3818504c1b32bf1557b16c238b2e01fd3149c17');
    expect(current.batches[0].batches[0].transactions[2].data).toBe('0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a347000000000000000000000000000000000000000000000006aaf7c8516d0c0000');
    expect(current.batches[0].batches[0].transactions[2].value).toBe(undefined);
    expect(current.batches[1].skip).toBe(true);
  });

  it('throws an error if <EtherspotBatches /> within <EtherspotBatches />', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={null}>
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

    expect(() => renderHook(() => useEtherspotTransactions(), {  wrapper }))
      .toThrow('<EtherspotBatches /> cannot be inside <EtherspotBatches />');
  });

  it('throws an error if <EtherspotBatch /> within <EtherspotBatch />', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={null}>
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

    expect(() => renderHook(() => useEtherspotTransactions(), {  wrapper }))
      .toThrow('<EtherspotBatch /> cannot be inside <EtherspotBatch />');
  });

  it('throws an error if <EtherspotBatches /> rendered without <EtherspotTransactionKit />', () => {
    expect(() => render(
      <EtherspotBatches>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
      </EtherspotBatches>
    ))
      .toThrow('No parent <EtherspotTransactionKit />');
  });

  it('throws an error if <EtherspotBatch /> rendered without <EtherspotBatches />', () => {
    expect(() => render(
      <EtherspotBatch>
          <span>test</span>
      </EtherspotBatch>
    ))
      .toThrow('No parent <EtherspotBatches />');
  });

  it('throws an error if <EtherspotTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() => render(
      <EtherspotTransaction to={'0x'}>
          <span>test</span>
      </EtherspotTransaction>
    ))
      .toThrow('No parent <EtherspotBatch />');
  });
})
