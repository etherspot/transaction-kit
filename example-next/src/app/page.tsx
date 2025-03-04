'use client';

import { polygon } from 'viem/chains';

// components
import { WalletProviderLike } from '@etherspot/modular-sdk';
import { EtherspotTransactionKit } from '@etherspot/transaction-kit';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import UI from './components/UI/UI';

export default function Home() {
  const account = privateKeyToAccount(
    process.env.REACT_PRIVATE_KEY as `0x${string}`
  );

  const client = createWalletClient({
    account,
    chain: polygon,
    transport: http(),
  });
  return (
    <EtherspotTransactionKit
      provider={client as WalletProviderLike}
      chainId={137}
      dataApiKey={process.env.REACT_DATA_API_KEY}
      bundlerApiKey={process.env.REACT_BUNDLER_API_KEY}
    >
      <UI />
    </EtherspotTransactionKit>
  );
}
