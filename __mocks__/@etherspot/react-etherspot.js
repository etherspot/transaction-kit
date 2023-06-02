import { AccountTypes } from 'etherspot';
import ReactEtherspot, { useEtherspot as useEtherspotActual } from '@etherspot/react-etherspot';
import { ethers } from 'ethers';

const defaultAccountAddress = '0x7F30B1960D5556929B03a0339814fE903c55a347';
const otherAccountAddress = '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1';

export const useEtherspot = () => ({
  ...useEtherspotActual(),
  getSdkForChainId: (sdkChainId) => ({
    state: {
      account: {
        type: AccountTypes.Contract,
        address: defaultAccountAddress,
      },
    },
    getAccountBalances: ({ chainId, account }) => {
      const tokenBalance = ethers.utils.parseEther('420');
      const nativeAssetBalance = ethers.utils.parseEther('0');

      const token = { token: '0x', balance: tokenBalance, superBalance: tokenBalance };
      const nativeAsset = { token: null, balance: nativeAssetBalance, superBalance: nativeAssetBalance };

      if (chainId !== 1) {
        return { items: [nativeAsset] };
      }

      if (account === defaultAccountAddress) {
        return { items: [nativeAsset, token] };
      }

      if (account === otherAccountAddress) {
        return { items: [nativeAsset, { ...token, balance: ethers.utils.parseEther('69') }] };
      }

      return { items: [] };
    },
    getTransactions: ({ account }) => {
      const accountTransactions = [
        { hash: '0x1', value: '100000000000000' },
        { hash: '0x2', value: '420000000000000' },
      ];

      if (sdkChainId !== 1) {
        return { items: [] };
      }

      if (account === defaultAccountAddress) {
        return { items: accountTransactions };
      }

      if (account === otherAccountAddress) {
        return { items: [{ hash: '0x69', value: '0' }] };
      }

      return { items: [] };
    },
    getTransaction: ({ hash }) => {
      if (hash !== '0x42' || sdkChainId !== 1) return;
      return { hash: '0x42', value: '690000000000000' };
    },
    getNftList: ({ account }) => {
      const accountNfts = [
        { contractName: 'Collection Alpha', contractAddress: '0x2', items: [{ tokenId: 420 }] },
        { contractName: 'Collection Beta', contractAddress: '0x1', items: [{ tokenId: 6 }, { tokenId: 9 }] },
      ];

      if (sdkChainId !== 1) {
        return { items: [] };
      }

      if (account === defaultAccountAddress) {
        return { items: accountNfts };
      }

      if (account === otherAccountAddress) {
        return { items: [{ ...accountNfts[0], contractName: 'Collection Gama' }] };
      }

      return { items: [] };
    },
    getTokenListTokens: () => {
      const token1 = { address: '0x1', chainId: sdkChainId, name: 'tk1', symbol: 'TK1', decimals: 18, logoURI: '' };
      const token2 = { address: '0x2', chainId: sdkChainId, name: 'tk2', symbol: 'TK2', decimals: 18, logoURI: '' };
      const token3 = { address: '0x3', chainId: sdkChainId, name: 'tk3', symbol: 'TK3', decimals: 18, logoURI: '' };

      return sdkChainId === 1
        ? [token1, token2, token3]
        : [token1];
    },
    getExchangeOffers: ({
      fromTokenAddress,
      toTokenAddress,
    }) => {
      if (sdkChainId !== 1 || fromTokenAddress !== '0x111' || toTokenAddress !== '0x222') {
        return [];
      }

      const offer1 = {
        provider: 'abc-swap',
        receiveAmount: ethers.utils.parseEther('0.1'),
        transactions: ['0x1', '0x2'],
      }

      const offer2 = {
        provider: 'def-swap',
        receiveAmount: ethers.utils.parseEther('0.11'),
        transactions: ['0x1'],
      }

      return [offer1, offer2];
    },
    getAdvanceRoutesLiFi: ({
      fromAmount,
      fromChainId,
      toChainId,
      fromTokenAddress,
      toTokenAddress,
    }) => {
      if (fromChainId !== 1
        || toChainId !== 137
        || fromTokenAddress !== '0x111'
        || toTokenAddress !== '0x222') {
        return { items: [] };
      }

      const offer1 = {
        id: 'abc-bridge-offer-1',
        fromChainId,
        toChainId,
        fromAmount,
        toAmount: ethers.utils.parseEther('0.1'),
        steps: ['0x1', '0x2'],
      }

      const offer2 = {
        id: 'abc-bridge-offer-2',
        fromChainId,
        toChainId,
        fromAmount,
        toAmount: ethers.utils.parseEther('0.12'),
        steps: ['0x1', '0x2'],
      }

      return { items: [offer1, offer2] };
    },
    getStepTransaction: ({ route: { id } }) => {
      if (id !== 'abc-bridge-offer-1') {
        return { items: [] };
      }

      const transactions = [
        { to: '0x111', data: '0x2', value: undefined },
        { to: '0x222', data: '0x3', value: '100000000000000' },
      ];

      return { items: transactions };
    },
    fetchExchangeRates: ({ chainId, tokens }) => {
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

      return { items: prices }
    },
  }),
});

export default ReactEtherspot;
