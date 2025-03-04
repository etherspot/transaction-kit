'useClient';

import useWalletAddress from '@etherspot/transaction-kit/src/hooks/useWalletAddress';

const UI = () => {
  const address = useWalletAddress();
  console.log('address', address);

  return <p>{address}</p>;
};

export default UI;
