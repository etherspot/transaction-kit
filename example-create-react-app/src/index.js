import {
  EtherspotTransactionKit,
  useWalletAddress,
} from '@etherspot/transaction-kit';
import { createRoot } from 'react-dom/client';

export function UI() {
  const address = useWalletAddress();
  console.log('address', address);

  return <p>{address}</p>;
}

const account = privateKeyToAccount(process.env.REACT_PRIVATE_KEY);

const client = createWalletClient({
  account,
  chain: polygon,
  transport: http(),
});

const root = createRoot(document.getElementById('root'));
root.render(
  <EtherspotTransactionKit
    provider={client}
    chainId={137}
    dataApiKey={process.env.REACT_DATA_API_KEY}
    bundlerApiKey={process.env.REACT_BUNDLER_API_KEY}
  >
    <UI />
  </EtherspotTransactionKit>
);
