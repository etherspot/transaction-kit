import { Buffer as ImportedBuffer } from 'buffer';

if (typeof window !== 'undefined')
  window.Buffer = window.Buffer ?? ImportedBuffer;

export * from './TransactionKit/TransactionKit';
export * from './providers/EtherspotProvider';
