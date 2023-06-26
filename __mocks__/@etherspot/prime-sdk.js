import * as EtherspotPrime from '@etherspot/prime-sdk';

export class PrimeSdk {
  constructor () {}

  getCounterFactualAddress() {
    return '0x07ff85757f5209534EB601E1CA60d72807ECE0bC';
  }
}

export const isWalletProvider = EtherspotPrime.isWalletProvider;

export default EtherspotPrime;
