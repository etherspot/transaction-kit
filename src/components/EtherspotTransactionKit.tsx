import React from 'react';
import { WalletProviderLike, Factory } from '@etherspot/prime-sdk';
import { WalletProviderLike as WalletProviderLikeModular, Factory as ModularFactory } from '@etherspot/modular-sdk';

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
  modular?: boolean;
}

const EtherspotTransactionKit = ({
  children,
  provider,
  chainId = 1,
  accountTemplate,
  dataApiKey,
  bundlerApiKey,
  modular = true,
}: EtherspotTransactionKitProps) => {
  let accountTemp;

  if (accountTemplate) {
    switch (accountTemplate) {
      case 'zeroDev':
        if (!modular) {
          accountTemp = Factory.ZERO_DEV;
        } else {
          console.warn('You cannot use a ZeroDev Account template with the modular functionality.');
        }
        break;
      case 'simpleAccount':
        if (!modular) {
          accountTemp = Factory.SIMPLE_ACCOUNT;
        } else {
          console.warn('You cannot use a Simple Account template with the modular functionality.');
        }
        break;
      case 'etherspot':
        accountTemp = modular ? ModularFactory.ETHERSPOT : Factory.ETHERSPOT;
        break;
      default:
        console.warn('This account template cannot be used:', accountTemplate);
    }
  } else {
    accountTemp = modular ? ModularFactory.ETHERSPOT : Factory.ETHERSPOT;
  }
  
  return (
  <EtherspotContextProvider
    provider={provider}
    chainId={+chainId} // cast to make it less failproof when passed as string, i.e. from env file
    accountTemplate={accountTemp}
    dataApiKey={dataApiKey}
    bundlerApiKey={bundlerApiKey}
    isModular={modular}
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
