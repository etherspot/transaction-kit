import { WalletProviderLike } from '@etherspot/modular-sdk';
import { TransactionKit } from '@etherspot/transaction-kit';
import { useEffect } from 'react';
import { createWalletClient, custom, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

const App = () => {
  const account = privateKeyToAccount(
    `0x${process.env.REACT_APP_DEMO_WALLET_PK}` as `0x${string}`
  );

  const client = createWalletClient({
    account,
    chain: polygon,
    transport: custom(window.ethereum!),
  });

  const kit = TransactionKit({
    provider: client as WalletProviderLike,
    chainId: 137,
    bundlerApiKey: process.env.REACT_APP_ETHERSPOT_BUNDLER_API_KEY || undefined,
    dataApiKey: process.env.REACT_APP_ETHERSPOT_DATA_API_KEY || undefined,
  });

  const transactionDetails = () =>
    kit
      .transaction({
        chainId: 137,
        to: '0x9F5D1446e1EbA9C6535432Ee07E25074E2f151e6',
        value: parseEther('0.001'),
        data: '0x',
      })
      .name({ transactionName: 'txs-1' });

  useEffect(() => {
    const estimate = async () => {
      const estimatingTxs = await transactionDetails().estimate();

      console.log('Estimating', estimatingTxs);
    };

    const getWallet = async () => {
      const walletAddress = await kit.getWalletAddress();
      console.log('Wallet address', walletAddress);
    };

    const send = async () => {
      const sendingTxs = await transactionDetails().send();

      console.log('Sending', sendingTxs);
    };

    estimate();
    getWallet();
    send();
  }, []);

  return (
    <div>
      <p>Check the logs!</p>
    </div>
  );
};

export default App;
