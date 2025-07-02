import { Buffer as ImportedBuffer } from 'buffer';

if (typeof window !== 'undefined')
  window.Buffer = window.Buffer ?? ImportedBuffer;

export * from './TransactionKit/EtherspotProvider';
export * from './TransactionKit/EtherspotUtils';
export * from './TransactionKit/TransactionKit';
export * from './types/TransactionKitTypes';
