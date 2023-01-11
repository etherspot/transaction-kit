import { renderHook, render } from '@testing-library/react';

// hooks
import { useEtherspotUi, EtherspotUi, EtherspotBatches, EtherspotBatch } from '../src';

describe('useEtherspotUi()', () => {
  it('returns grouped batches', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
        <div>
          test
          <span>
          <EtherspotBatches>
            <EtherspotBatch>
              <span>test</span>
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
      .toThrow('<Batches /> cannot be inside <Batches />');
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
})
