import { renderHook, render } from '@testing-library/react';
import { ethers } from 'ethers';

import { useEtherspotUi, EtherspotUi, EtherspotBatches, EtherspotBatch, ContractTransaction } from '../../src';

describe('ContractTransaction', () => {
  it('throws an error if any children within <ContractTransaction />', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
        <div>
          test
          <span>
          <EtherspotBatches>
            <EtherspotBatch>
              <ContractTransaction
                contractAddress={'0x'}
                params={[]}
                abi={'function test()'}
                methodName={'test'}
              >
                <span>test</span>
              </ContractTransaction>
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
      .toThrow('No children components allowed within <ContractTransaction />');
  });

  it('throws an error if <ContractTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() => render(
      <ContractTransaction
        contractAddress={'0x'}
        params={[]}
        abi={'function test()'}
        methodName={'test'}
      >
        <span>test</span>
      </ContractTransaction>
    ))
      .toThrow('No parent <EtherspotBatch />');
  });

  it('throws error if wrong ABI provided', () => {
    expect(() => render(
      <EtherspotUi provider={null}>
        <EtherspotBatches>
          <EtherspotBatch>
            <ContractTransaction
              abi={['wrong']}
              contractAddress={'0x'}
              methodName={'test'}
              params={[0]}
            />
          </EtherspotBatch>
        </EtherspotBatches>
      </EtherspotUi>
    ))
      .toThrow(
        'Failed to build contract interface from provided ABI: unsupported fragment'
        + ' (argument="value", value="wrong", code=INVALID_ARGUMENT, version=abi/5.7.0)'
      );
  });

  it('throws error if wrong method name provided', () => {
    expect(() => render(
      <EtherspotUi provider={null}>
        <EtherspotBatches>
          <EtherspotBatch>
            <ContractTransaction
              abi={['function transfer(address, uint)']}
              contractAddress={'0x'}
              methodName={'transferFrom'}
              params={[0]}
            />
          </EtherspotBatch>
        </EtherspotBatches>
      </EtherspotUi>
    ))
      .toThrow(
        'Failed to build transaction data: no matching function'
        + ' (argument="name", value="transferFrom", code=INVALID_ARGUMENT, version=abi/5.7.0)'
      );
  });

  it('throws error if wrong params provided', () => {
    expect(() => render(
      <EtherspotUi provider={null}>
        <EtherspotBatches>
          <EtherspotBatch>
            <ContractTransaction
              abi={['function transfer(uint)']}
              contractAddress={'0x'}
              methodName={'transfer'}
              params={['test']}
            />
          </EtherspotBatch>
        </EtherspotBatches>
      </EtherspotUi>
    ))
      .toThrow(
        'Failed to build transaction data: invalid BigNumber string'
        + ' (argument="value", value="test", code=INVALID_ARGUMENT, version=bignumber/5.7.0)'
      );
  });

  it('builds transaction data successfully', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
        <EtherspotBatches>
          <EtherspotBatch>
            <ContractTransaction
              abi={['function transfer(address, uint)']}
              contractAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              methodName={'transfer'}
              params={['0x7F30B1960D5556929B03a0339814fE903c55a347', ethers.utils.parseEther('123')]}
            />
          </EtherspotBatch>
        </EtherspotBatches>
        {children}
      </EtherspotUi>
    );

    const { result: { current } } = renderHook(() => useEtherspotUi(), { wrapper });

    expect(current.batches[0].batches[0].transactions[0].to).toBe('0xe3818504c1b32bf1557b16c238b2e01fd3149c17');
    expect(current.batches[0].batches[0].transactions[0].data).toBe('0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a347000000000000000000000000000000000000000000000006aaf7c8516d0c0000');
    expect(current.batches[0].batches[0].transactions[0].value).toBe(undefined);
  });

})
