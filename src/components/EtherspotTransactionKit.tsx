import React from 'react';
import { WalletProviderLike } from '@etherspot/prime-sdk';
import { WalletProviderLike as WalletProviderLikeModular} from '@etherspot/modular-sdk';

// types
import { AccountTemplate } from '../types/EtherspotTransactionKit';

// providers
import EtherspotTransactionKitContextProvider from '../providers/EtherspotTransactionKitContextProvider';
import ProviderWalletContextProvider from '../providers/ProviderWalletContextProvider';
import EtherspotContextProvider from '../providers/EtherspotContextProvider';
interface EtherspotTransactionKitProps extends React.PropsWithChildren {
  provider: WalletProviderLike | WalletProviderLikeModular;
  chainId?: number;
  accountTemplate?: AccountTemplate;
  dataApiKey?: string;
  bundlerApiKey?: string;
}

const EtherspotTransactionKit = ({
  children,
  provider,
  chainId = 1,
  accountTemplate,
  dataApiKey,
  bundlerApiKey,
}: EtherspotTransactionKitProps) => {
  let accountTemp: AccountTemplate;

  switch (accountTemplate) {
    case 'etherspotModular':
      accountTemp = 'etherspotModular';
      break;
    case 'etherspot':
      accountTemp = 'etherspot';
      break;
    case 'simpleAccount':
      accountTemp = 'simpleAccount';
      break;
    case 'zeroDev':
      accountTemp = 'zeroDev';
      break;
    default:
      accountTemp = 'etherspotModular';
      break;
  }

  return (
  <EtherspotContextProvider
    provider={provider}
    chainId={+chainId} // cast to make it less failproof when passed as string, i.e. from env file
    accountTemplate={accountTemp}
    dataApiKey={dataApiKey}
    bundlerApiKey={bundlerApiKey}
    isModular={accountTemp === 'etherspotModular'}
  >
    <EtherspotTransactionKitContextProvider>
      <ProviderWalletContextProvider>
        {children}
      </ProviderWalletContextProvider>
    </EtherspotTransactionKitContextProvider>
  </EtherspotContextProvider>
  )
};

export default EtherspotTransactionKit;
