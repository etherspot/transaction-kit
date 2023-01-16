import { renderHook, render } from '@testing-library/react';

// hooks
import { useEtherspotUi, EtherspotUi, EtherspotBatches, EtherspotBatch, EtherspotTransaction } from '../src';

describe('useEtherspotUi()', () => {
  it('returns grouped batches', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
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
        {children}
      </EtherspotUi>
    );

    const { result: { current } } = renderHook(() => useEtherspotUi(), { wrapper });

    expect(current.batches.length).toBe(3);
    expect(current.batches[0].batches.length).toBe(1);
    expect(current.batches[0].batches[0].chainId).toBe(123);
    expect(current.batches[0].batches[0].gasTokenAddress).toBe('testGasTokenAddress');
    expect(current.batches[0].batches[0].transactions.length).toBe(2);
    expect(current.batches[0].batches[0].transactions[1].to).toBe('0x0');
    expect(current.batches[0].batches[0].transactions[1].data).toBe('0xFFF');
    expect(current.batches[0].batches[0].transactions[1].value).toBe('420');
    expect(current.batches[1].skip).toBe(true);
  });

  it('throws an error if <EtherspotBatches /> within <EtherspotBatches />', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
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
      </EtherspotUi>
    );

    expect(() => renderHook(() => useEtherspotUi(), {  wrapper }))
      .toThrow('<EtherspotBatches /> cannot be inside <EtherspotBatches />');
  });

  it('throws an error if <EtherspotBatches /> within <EtherspotBatch />', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
        <div>
          test
          <span>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotBatches>
                <span>test</span>
              </EtherspotBatches>
            </EtherspotBatch>
          </EtherspotBatches>
        </span>
        </div>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
        {children}
      </EtherspotUi>
    );

    expect(() => renderHook(() => useEtherspotUi(), {  wrapper }))
      .toThrow('<EtherspotBatches /> cannot be inside <EtherspotBatch />');
  });

  it('throws an error if <EtherspotBatch /> within <EtherspotBatch />', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
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
      </EtherspotUi>
    );

    expect(() => renderHook(() => useEtherspotUi(), {  wrapper }))
      .toThrow('<EtherspotBatch /> cannot be inside <EtherspotBatch />');
  });

  it('throws an error if any children within <EtherspotTransaction />', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
        <div>
          test
          <span>
          <EtherspotBatches>
            <EtherspotBatch>
              <EtherspotTransaction to={'0x'}>
                <span>test</span>
              </EtherspotTransaction>
              <EtherspotTransaction to={'0x'}>
                <span>test</span>
              </EtherspotTransaction>
            </EtherspotBatch>
          </EtherspotBatches>
        </span>
        </div>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
        {children}
      </EtherspotUi>
    );

    expect(() => renderHook(() => useEtherspotUi(), {  wrapper }))
      .toThrow('No children components allowed within <EtherspotTransaction />');
  });

  it('throws an error if <EtherspotBatches /> rendered without <EtherspotUi />', () => {
    expect(() => render(
      <EtherspotBatches>
        <EtherspotBatches>
          <span>test</span>
        </EtherspotBatches>
      </EtherspotBatches>
    ))
      .toThrow('No parent <EtherspotUi />');
  });

  it('throws an error if <EtherspotBatch /> rendered without <EtherspotUi />', () => {
    expect(() => render(
      <EtherspotBatch>
          <span>test</span>
      </EtherspotBatch>
    ))
      .toThrow('No parent <EtherspotUi />');
  });

  it('throws an error if <EtherspotTransaction /> rendered without <EtherspotUi />', () => {
    expect(() => render(
      <EtherspotTransaction to={'0x'}>
          <span>test</span>
      </EtherspotTransaction>
    ))
      .toThrow('No parent <EtherspotUi />');
  });
})
