import { renderHook, render } from '@testing-library/react';
import { ethers } from 'ethers';

import { useEtherspotUi, EtherspotUi, EtherspotBatches, EtherspotBatch, EtherspotTokenTransferTransaction } from '../../src';

describe('EtherspotTokenTransferTransaction', () => {
  it('throws an error if <EtherspotTokenTransferTransaction /> rendered without <EtherspotBatch />', () => {
    expect(() => render(
      <EtherspotUi provider={null}>
        <EtherspotTokenTransferTransaction
          contractAddress={'0x'}
          receiverAddress={'0x'}
          value={'0'}
        >
          <span>test</span>
        </EtherspotTokenTransferTransaction>
      </EtherspotUi>
    ))
      .toThrow('No parent <EtherspotBatch />');
  });

  it('throws error if wrong receiver address provided', () => {
    expect(() => render(
      <EtherspotUi provider={null}>
        <EtherspotBatches>
          <EtherspotBatch>
            <EtherspotTokenTransferTransaction
              contractAddress={'0x'}
              receiverAddress={'0xtransfer'}
              value={ethers.utils.parseEther('123')}
            />
          </EtherspotBatch>
        </EtherspotBatches>
      </EtherspotUi>
    ))
      .toThrow(
        'Failed to build transaction data, please check data/method formatting: invalid address'
        + ' (argument="address", value="0xtransfer", code=INVALID_ARGUMENT, version=address/5.7.0)'
        + ' (argument=null, value="0xtransfer", code=INVALID_ARGUMENT, version=abi/5.7.0)'
      );
  });

  it('throws error if wrong value provided', () => {
    expect(() => render(
      <EtherspotUi provider={null}>
        <EtherspotBatches>
          <EtherspotBatch>
            <EtherspotTokenTransferTransaction
              contractAddress={'0x'}
              receiverAddress={'0x7F30B1960D5556929B03a0339814fE903c55a347'}
              value={'test'}
            />
          </EtherspotBatch>
        </EtherspotBatches>
      </EtherspotUi>
    ))
      .toThrow(
        'Failed to parse provided value, please make sure value is wei: invalid decimal value'
        + ' (argument="value", value="test", code=INVALID_ARGUMENT, version=bignumber/5.7.0)'
      );
  });

  it('builds transaction data successfully', () => {
    const wrapper = ({ children }) => (
      <EtherspotUi provider={null}>
        <EtherspotBatches>
          <EtherspotBatch>
            <EtherspotTokenTransferTransaction
              contractAddress={'0xe3818504c1b32bf1557b16c238b2e01fd3149c17'}
              receiverAddress={'0x7F30B1960D5556929B03a0339814fE903c55a347'}
              value={ethers.utils.parseEther('123')}
            />
          </EtherspotBatch>
        </EtherspotBatches>
        {children}
      </EtherspotUi>
    );

    const { result: { current } } = renderHook(() => useEtherspotUi(), { wrapper });

    expect(current.batches[0].batches[0].transactions[0].to).toBe('0xe3818504c1b32bf1557b16c238b2e01fd3149c17');
    expect(current.batches[0].batches[0].transactions[0].data).toBe('0x095ea7b30000000000000000000000007f30b1960d5556929b03a0339814fe903c55a347000000000000000000000000000000000000000000000006aaf7c8516d0c0000');
    expect(current.batches[0].batches[0].transactions[0].value).toBe(undefined);
  });

})
