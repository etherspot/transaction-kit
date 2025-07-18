import { Buffer as ImportedBuffer } from 'buffer';

if (typeof window !== 'undefined')
  window.Buffer = window.Buffer ?? ImportedBuffer;

export * from './EtherspotProvider';
export * from './EtherspotUtils';
export * from './TransactionKit';
export * from './interfaces';
export * from './utils';
