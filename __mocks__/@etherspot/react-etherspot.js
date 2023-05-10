import { AccountTypes } from 'etherspot';
import ReactEtherspot, { useEtherspot as useEtherspotActual } from '@etherspot/react-etherspot';
import { ethers } from 'ethers';

const accountAddress = '0x7F30B1960D5556929B03a0339814fE903c55a347';

export const useEtherspot = () => ({
  ...useEtherspotActual(),
  getSdkForChainId: (sdkChainId) => ({
    state: {
      account: {
        type: AccountTypes.Contract,
        address: accountAddress,
      },
    },
    getAccountBalances: ({ chainId }) => {
      const tokenBalance = ethers.utils.parseEther('420');
      const nativeAssetBalance = ethers.utils.parseEther('0');

      const token = { token: '0x', balance: tokenBalance, superBalance: tokenBalance };
      const nativeAsset = { token: null, balance: nativeAssetBalance, superBalance: nativeAssetBalance };

      const items = chainId === 1
        ? [nativeAsset, token]
        : [nativeAsset];

      return { items };
    },
    getTransactions: ({ account }) => {
      const accountTransactions = [
        { hash: '0x1', value: '100000000000000' },
        { hash: '0x2', value: '420000000000000' },
      ];

      const items = accountAddress === account && sdkChainId === 1
        ? accountTransactions
        : [];

      return { items };
    },
    getTransaction: ({ hash }) => {
      if (hash !== '0x42' || sdkChainId !== 1) return;
      return { hash: '0x42', value: '690000000000000' };
    },
    getTokenListTokens: () => {
      const token1 = { address: '0x1', chainId: sdkChainId, name: 'tk1', symbol: 'TK1', decimals: 18, logoURI: '' };
      const token2 = { address: '0x2', chainId: sdkChainId, name: 'tk2', symbol: 'TK2', decimals: 18, logoURI: '' };
      const token3 = { address: '0x3', chainId: sdkChainId, name: 'tk3', symbol: 'TK3', decimals: 18, logoURI: '' };

      return sdkChainId === 1
        ? [token1, token2, token3]
        : [token1];
    },
  }),
});

export default ReactEtherspot;
