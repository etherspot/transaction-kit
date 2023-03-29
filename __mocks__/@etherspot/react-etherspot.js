import { AccountTypes } from 'etherspot';
import ReactEtherspot, { useEtherspot as useEtherspotActual } from '@etherspot/react-etherspot';

export const useEtherspot = () => ({
  ...useEtherspotActual(),
  getSdkForChainId: () => ({
    state: {
      account: {
        type: AccountTypes.Contract,
        address: '0x7F30B1960D5556929B03a0339814fE903c55a347',
      },
    },
  }),
});

export default ReactEtherspot;
