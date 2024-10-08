import * as EtherspotPrime from '@etherspot/prime-sdk';
import { ethers } from 'ethers';

export const defaultAccountAddress =
  '0x7F30B1960D5556929B03a0339814fE903c55a347';
export const otherFactoryDefaultAccountAddress =
  '0xe383724e3bDC4753746dEC781809f8CD82010914';
export const otherAccountAddress = '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1';

export class PrimeSdk {
  sdkChainId;
  userOps = [];
  nonce = ethers.BigNumber.from(1);
  factoryWallet;

  constructor(provider, config) {
    this.sdkChainId = config.chainId;
    this.factoryWallet = config.factoryWallet;
  }

  getCounterFactualAddress() {
    if (this.factoryWallet === Factory.ETHERSPOT) {
      return defaultAccountAddress;
    }
    return otherFactoryDefaultAccountAddress;
  }

  async clearUserOpsFromBatch() {
    this.userOps = [];
  }

  async addUserOpsToBatch(userOp) {
    this.userOps.push(userOp);
  }

  async estimate({ paymasterDetails: paymaster }) {
    let maxFeePerGas = ethers.utils.parseUnits('1', 'gwei');
    let maxPriorityFeePerGas = ethers.utils.parseUnits('1', 'gwei');
    let callGasLimit = ethers.BigNumber.from('50000');
    let signature = '0x004';

    if (paymaster?.url === 'someUrl') {
      maxFeePerGas = ethers.utils.parseUnits('2', 'gwei');
      maxPriorityFeePerGas = ethers.utils.parseUnits('3', 'gwei');
      callGasLimit = ethers.BigNumber.from('75000');
    }

    if (paymaster?.url === 'someUnstableUrl') {
      signature = '0x0';
    }

    let finalGasLimit = ethers.BigNumber.from(callGasLimit);

    if (this.sdkChainId === 420) {
      throw new Error('Transaction reverted: chain too high');
    }

    this.userOps.forEach((userOp) => {
      if (userOp.to === '0xDEADBEEF') {
        throw new Error('Transaction reverted: invalid address');
      }
      finalGasLimit = finalGasLimit.add(callGasLimit);
      if (userOp.data && userOp.data !== '0x0' && userOp.data !== '0xFFF') {
        finalGasLimit = finalGasLimit.add(callGasLimit);
      }
    });

    return {
      sender: defaultAccountAddress,
      nonce: this.nonce,
      initCode: '0x001',
      callData: '0x002',
      callGasLimit: finalGasLimit,
      verificationGasLimit: ethers.BigNumber.from('25000'),
      preVerificationGas: ethers.BigNumber.from('75000'),
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData: '0x003',
      signature,
    };
  }

  totalGasEstimated({
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
  }) {
    return callGasLimit.add(verificationGasLimit).add(preVerificationGas);
  }

  async send(userOp) {
    if (this.sdkChainId === 696969) {
      throw new Error('Transaction reverted: chain too hot');
    }

    if (userOp.signature === '0x0') {
      throw new Error('Transaction reverted: invalid signature');
    }

    /**
     * provide fake userOp hash by increasing nonce on each send
     * and add SDK chain ID to make it more unique per userOp
     */
    const userOpHash = this.nonce.add(this.sdkChainId).toHexString();
    this.nonce = this.nonce.add(1);

    return userOpHash;
  }
}

export class DataUtils {
  constructor() {}

  getQuotes({
    fromAddress,
    toAddress,
    fromChainId,
    toChainId,
    fromToken,
    fromAmount,
    slippage,
  }) {
    if (
      !fromAddress ||
      !toAddress ||
      !fromChainId ||
      !toChainId ||
      !fromToken ||
      !fromAmount ||
      !slippage
    ) {
      return 'getQuotes: missing required props';
    }

    if (
      fromAddress === '0x111' &&
      toAddress === '0x222' &&
      fromChainId === 1 &&
      toChainId === 56 &&
      fromToken == '0x123456' &&
      fromAmount === '0x10000000000' &&
      slippage === 1
    ) {
      return {
        transactions: [
          {
            data: '0x111222333',
            to: '0x123',
            value: '0x00',
          },
          {
            value: '0xb2eed2c27ce6',
            data: '0x444555666',
            to: '0x456',
            chainId: 1,
          },
        ],
      };
    }

    return { transactions: [] };
  }

  getSupportedAssets({ chainId, provider: bridgingProvider }) {
    const allSupportedAssets = [
      {
        address: '0x123',
        chainId: 1,
        name: 'USDC',
        symbol: 'USDC',
      },
      {
        address: '0x456',
        chainId: 1,
        name: 'USDC',
        symbol: 'USDC',
      },
      {
        address: '0x789',
        chainId: 137,
        name: 'USDC',
        symbol: 'USDC',
      },
    ];

    if (!chainId) {
      return { tokens: allSupportedAssets };
    }

    if (allSupportedAssets.some((asset) => asset.chainId === chainId)) {
      return {
        tokens: allSupportedAssets.filter((asset) => asset.chainId === chainId),
      };
    }

    return { tokens: [] };
  }

  getAccountBalances({ chainId, account }) {
    console.log('getAccountBalances', chainId, account);
    const tokenBalance = ethers.utils.parseEther('420');
    const nativeAssetBalance = ethers.utils.parseEther('0');

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
        items: [
          nativeAsset,
          { ...token, balance: ethers.utils.parseEther('69') },
        ],
      };
    }

    return { items: [] };
  }

  getTransactions({ account, chainId }) {
    const accountTransactions = [
      { hash: '0x1', value: '100000000000000' },
      { hash: '0x2', value: '420000000000000' },
    ];

    if (chainId !== 1) {
      return { transactions: [] };
    }

    if (account === defaultAccountAddress) {
      return { transactions: accountTransactions };
    }

    if (account === otherAccountAddress) {
      return { transactions: [{ hash: '0x69', value: '0' }] };
    }

    return { transactions: [] };
  }

  getTransactionStatus({ fromChainId, toChainId, transactionHash, provider }) {
    if (!fromChainId || !toChainId || !transactionHash) {
      return 'getTransactionStatus: missing required props';
    }

    if (fromChainId === 1 && toChainId === 137 && transactionHash === '0x123') {
      return {
        connextscanUrl: 'https://connextscan.io/tx/0x123',
        status: 'completed',
        transactionHash: '0x123',
        transferId: 'abc123',
      };
    }

    return {};
  }

  getTransaction({ hash, chainId }) {
    if (hash !== '0x42' || chainId !== 1) return;
    return { hash: '0x42', value: '690000000000000' };
  }

  getNftList({ account, chainId }) {
    const accountNfts = [
      {
        contractName: 'Collection Alpha',
        contractAddress: '0x2',
        items: [{ tokenId: 420 }],
      },
      {
        contractName: 'Collection Beta',
        contractAddress: '0x1',
        items: [{ tokenId: 6 }, { tokenId: 9 }],
      },
    ];

    if (chainId !== 1) {
      return { items: [] };
    }

    if (account === defaultAccountAddress) {
      return { items: accountNfts };
    }

    if (account === otherAccountAddress) {
      return {
        items: [{ ...accountNfts[0], contractName: 'Collection Gama' }],
      };
    }

    return { items: [] };
  }

  getTokenListTokens({ name, chainId }) {
    const token1 = {
      address: '0x1',
      chainId,
      name: 'tk1',
      symbol: 'TK1',
      decimals: 18,
      logoURI: '',
    };
    const token2 = {
      address: '0x2',
      chainId,
      name: 'tk2',
      symbol: 'TK2',
      decimals: 18,
      logoURI: '',
    };
    const token3 = {
      address: '0x3',
      chainId,
      name: 'tk3',
      symbol: 'TK3',
      decimals: 18,
      logoURI: '',
    };

    return chainId === 1 ? [token1, token2, token3] : [token1];
  }

  getExchangeOffers({ fromTokenAddress, toTokenAddress, fromChainId }) {
    if (
      fromChainId !== 1 ||
      fromTokenAddress !== '0x111' ||
      toTokenAddress !== '0x222'
    ) {
      return [];
    }

    const offer1 = {
      provider: 'abc-swap',
      receiveAmount: ethers.utils.parseEther('0.1'),
      transactions: ['0x1', '0x2'],
    };

    const offer2 = {
      provider: 'def-swap',
      receiveAmount: ethers.utils.parseEther('0.11'),
      transactions: ['0x1'],
    };

    return [offer1, offer2];
  }

  getAdvanceRoutesLiFi({
    fromAmount,
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
  }) {
    if (
      fromChainId !== 1 ||
      toChainId !== 137 ||
      fromTokenAddress !== '0x111' ||
      toTokenAddress !== '0x222'
    ) {
      return { items: [] };
    }

    const offer1 = {
      id: 'abc-bridge-offer-1',
      fromChainId,
      toChainId,
      fromAmount,
      toAmount: ethers.utils.parseEther('0.1'),
      steps: ['0x1', '0x2'],
    };

    const offer2 = {
      id: 'abc-bridge-offer-2',
      fromChainId,
      toChainId,
      fromAmount,
      toAmount: ethers.utils.parseEther('0.12'),
      steps: ['0x1', '0x2'],
    };

    return { items: [offer1, offer2] };
  }

  getStepTransaction({ route: { id } }) {
    if (id !== 'abc-bridge-offer-1') {
      return { items: [] };
    }

    const transactions = [
      { to: '0x111', data: '0x2', value: undefined },
      { to: '0x222', data: '0x3', value: '100000000000000' },
    ];

    return { items: transactions };
  }

  fetchExchangeRates({ chainId, tokens }) {
    if (chainId !== 1) {
      return { items: [] };
    }

    if (tokens.includes('some_wrongAddressFormat')) {
      return { items: [], errored: true, error: 'Wrong address provided!' };
    }

    const prices = tokens.map((token, index) => ({
      address: token,
      eth: 1 + index * 0.1,
      usd: 1800 * (1 + index * 0.1),
    }));

    return { items: prices };
  }
}

export const isWalletProvider = EtherspotPrime.isWalletProvider;

export const Factory = EtherspotPrime.Factory;

export const EtherspotBundler = jest.fn();

export default EtherspotPrime;
