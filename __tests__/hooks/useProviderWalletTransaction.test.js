import { renderHook, render } from '@testing-library/react';
import { ethers } from 'ethers';

import {
  useProviderWalletTransaction,
  EtherspotTransactionKit,
  ProviderWalletTransaction,
} from '../../src';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'goerli'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

describe('useProviderWalletTransaction()', () => {
  // it('returns correct transaction on dynamically rendered components', () => {
  //   // TODO: add test
  // });

  // it('returns correct transaction', () => {
  //   const wrapper = ({ children }) => (
  //     <EtherspotTransactionKit provider={wallet}>
  //       <div>
  //         test
  //         <span>
  //           <ProviderWalletTransaction
  //             to={'0x0'}
  //             data={'0xFFF'}
  //             value={'420'}
  //           />
  //         </span>
  //       </div>
  //       {children}
  //     </EtherspotTransactionKit>
  //   );
  //
  //   const { result: { current } } = renderHook(() => useProviderWalletTransaction(), { wrapper });
  //
  //   expect(current.batches.length).toBe(4);
  //   expect(current.batches[0].batches.length).toBe(1);
  //   expect(current.batches[0].batches[0].chainId).toBe(123);
  //   expect(current.batches[0].batches[0].gasTokenAddress).toBe('testGasTokenAddress');
  //   expect(current.batches[0].batches[0].transactions.length).toBe(3);
  //   expect(current.batches[0].batches[0].transactions[1].to).toBe('0x0');
  //   expect(current.batches[0].batches[0].transactions[1].data).toBe('0xFFF');
  //   expect(current.batches[0].batches[0].transactions[1].value.toJSON()).toStrictEqual({"hex": "0x16c4abbebea0100000", "type": "BigNumber"});
  //   expect(current.batches[0].batches[0].transactions[2].to).toBe('0xe3818504c1b32bf1557b16c238b2e01fd3149c17');
  //   expect(current.batches[0].batches[0].transactions[2].data).toBe('0xa9059cbb0000000000000000000000007f30b1960d5556929b03a0339814fe903c55a347000000000000000000000000000000000000000000000006aaf7c8516d0c0000');
  //   expect(current.batches[0].batches[0].transactions[2].value).toBe(undefined);
  //   expect(current.batches[1].skip).toBe(true);
  // });

  it('throws an error if multiple <ProviderWalletTransaction /> rendered', () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        <div>
          test
          <span>
          <ProviderWalletTransaction
            to={'0x12'}
            data={'0x0'}
            value={'0.123'}
          >
            <span>test</span>
          </ProviderWalletTransaction>
        </span>
        </div>
        <ProviderWalletTransaction
          to={'0x12'}
          data={'0x0'}
          value={'0.123'}
        >
          <span>test</span>
        </ProviderWalletTransaction>
        {children}
      </EtherspotTransactionKit>
    );

    expect(() => renderHook(() => useProviderWalletTransaction(), {  wrapper }))
      .toThrow('Multiple <ProviderWalletTransaction /> not allowed');
  });

  it('throws an error if <ProviderWalletTransaction /> rendered without <EtherspotTransactionKit />', () => {
    expect(() => render(
      <ProviderWalletTransaction
        to={'0x12'}
        data={'0x0'}
        value={'0.123'}
      >
          <span>test</span>
      </ProviderWalletTransaction>
    ))
      .toThrow('No parent <EtherspotTransactionKit />');
  });
})
