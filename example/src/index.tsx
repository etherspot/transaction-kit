import React from 'react';
import ReactDOM from 'react-dom/client';
import { EtherspotUi } from '@etherspot/transacion-kit';
import { ethers } from 'ethers';

// components
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const providerWallet = new ethers.Wallet(process.env.REACT_APP_DEMO_WALLET_PK as string);

root.render(
  <React.StrictMode>
    <EtherspotUi provider={providerWallet} chainId={+(process.env.REACT_APP_CHAIN_ID as string)}>
      <App />
    </EtherspotUi>
  </React.StrictMode>
);
