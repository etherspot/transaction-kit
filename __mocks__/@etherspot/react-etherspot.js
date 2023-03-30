import { AccountTypes } from 'etherspot';
import ReactEtherspot, { useEtherspot as useEtherspotActual } from '@etherspot/react-etherspot';
import { ethers } from 'ethers';

export const useEtherspot = () => ({
  ...useEtherspotActual(),
  getSdkForChainId: () => ({
    state: {
      account: {
        type: AccountTypes.Contract,
        address: '0x7F30B1960D5556929B03a0339814fE903c55a347',
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
  }),
});

export default ReactEtherspot;
