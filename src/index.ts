import { Buffer as ImportedBuffer } from 'buffer';

if (typeof window !== 'undefined') window.Buffer = window.Buffer ?? ImportedBuffer;

import { useEtherspot } from '@etherspot/react-etherspot';

export { default as EtherspotApprovalTransaction } from './components/EtherspotApprovalTransaction';
export { default as EtherspotBatch } from './components/EtherspotBatch';
export { default as EtherspotBatches } from './components/EtherspotBatches';
export { default as EtherspotContractTransaction } from './components/EtherspotContractTransaction';
export { default as EtherspotTokenTransferTransaction } from './components/EtherspotTokenTransferTransaction';
export { default as EtherspotTransaction } from './components/EtherspotTransaction';
export { default as EtherspotTransactionKit } from './components/EtherspotTransactionKit';
export { default as ProviderWalletTransaction } from './components/ProviderWalletTransaction';
export { default as useEtherspotAddresses } from './hooks/useEtherspotAddresses';
export { default as useEtherspotBalances } from './hooks/useEtherspotBalances';
export { default as useEtherspotAssets } from './hooks/useEtherspotAssets';
export { default as useEtherspotHistory } from './hooks/useEtherspotHistory';
export { default as useEtherspotTransactions } from './hooks/useEtherspotTransactions';
export { default as useEtherspotNfts } from './hooks/useEtherspotNfts';
export { default as useEtherspotUtils } from './hooks/useEtherspotUtils';
export { default as useProviderWalletTransaction } from './hooks/useProviderWalletTransaction';
export { default as useEtherspotPrices } from './hooks/useEtherspotPrices';
export { default as useEtherspotSwaps } from './hooks/useEtherspotSwaps';
export * from './types/EtherspotTransactionKit';
export { useEtherspot };


