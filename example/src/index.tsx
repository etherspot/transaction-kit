import { EtherspotTransactionKit } from '@etherspot/transaction-kit';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createWalletClient, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

// components
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const account = privateKeyToAccount(
  `0x${process.env.REACT_APP_DEMO_WALLET_PK}` as `0x${string}`
);

const client = createWalletClient({
  account,
  chain: polygon,
  transport: custom(window.ethereum!),
});

root.render(
  <React.StrictMode>
    <EtherspotTransactionKit
      provider={client}
      chainId={+(process.env.REACT_APP_CHAIN_ID as string)}
    >
      <App />
    </EtherspotTransactionKit>
  </React.StrictMode>
);
