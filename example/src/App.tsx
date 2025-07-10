import { WalletProviderLike } from '@etherspot/modular-sdk';
import {
  BatchState,
  NamedTransactionState,
  TransactionKit,
} from '@etherspot/transaction-kit';
import { useState } from 'react';
import { createWalletClient, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

const account = privateKeyToAccount(
  `0x9767f27f4e0a6d1d502a2e3bd5dc698723e0346846ee3ed1572e0be994cc2ff3` as `0x${string}`
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

const App = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState<any>(kit.getState());

  const scenarios = [
    {
      label: 'Create Single Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000dead',
            value: '1000000000000000000',
          });
          kit.name({ transactionName: 'tx1' }) as NamedTransactionState;
          logAndUpdateState('Single transaction created and named as tx1.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Update Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'tx1',
          }) as NamedTransactionState;
          named.transaction({
            to: '0x000000000000000000000000000000000000beef',
            value: '2000000000000000000',
          });
          named.update();
          logAndUpdateState('Transaction tx1 updated.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'tx1',
          }) as NamedTransactionState;
          named.remove();
          logAndUpdateState('Transaction tx1 removed.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Add to Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000cafe',
            value: '3000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx2',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batch1' });
          logAndUpdateState('Transaction tx2 added to batch1.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Add Another to Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000babe',
            value: '4000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx3',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batch1' });
          logAndUpdateState('Transaction tx3 added to batch1.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const batch = kit.batch({ batchName: 'batch1' }) as BatchState;
          batch.remove();
          logAndUpdateState('Batch batch1 removed.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Estimate Single Transaction (Error if none)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'tx1',
          }) as NamedTransactionState;
          const result = await named.estimate();
          logAndUpdateState('Estimate single tx1: ' + JSON.stringify(result));
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Estimate Batches',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.estimateBatches();
          logAndUpdateState('Estimate batches: ' + JSON.stringify(result));
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Send Single Transaction (Error if none)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'tx1',
          }) as NamedTransactionState;
          const result = await named.send();
          if (result.isSuccess) {
            logAndUpdateState(
              'Send single tx1: ' +
                JSON.stringify(result) +
                ' (tx1 removed from state)'
            );
          } else {
            logAndUpdateState(
              'Send single tx1 failed: ' + JSON.stringify(result)
            );
          }
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Send Batches',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.sendBatches();
          let msg = 'Send batches: ' + JSON.stringify(result);
          // Check which batches were removed
          if (result && result.batches) {
            const removedBatches = Object.entries(result.batches)
              .filter(([_, batchResult]) => batchResult.isSuccess)
              .map(([batchName]) => batchName);
            if (removedBatches.length > 0) {
              msg +=
                ' (Batches removed from state: ' +
                removedBatches.join(', ') +
                ')';
            }
          }
          logAndUpdateState(msg);
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Nonexistent Transaction (Error)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'doesnotexist',
          }) as NamedTransactionState;
          named.remove();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Nonexistent Batch (Error)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const batch = kit.batch({ batchName: 'doesnotexist' }) as BatchState;
          batch.remove();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Transaction in Batch (tx2 from batch1)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'tx2',
          }) as NamedTransactionState;
          named.remove();
          logAndUpdateState('Transaction tx2 removed from batch1.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Create and Remove Standalone Transaction (tx4)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000f00d',
            value: '5000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx4',
          }) as NamedTransactionState;
          logAndUpdateState('Standalone transaction tx4 created.');
          named.remove();
          logAndUpdateState('Standalone transaction tx4 removed.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Last Transaction in Batch (tx3 from batch1)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Ensure tx3 is in batch1
          kit.transaction({
            to: '0x000000000000000000000000000000000000babe',
            value: '4000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx3',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batch1' });
          // Remove tx3 (should delete batch1 if it's the last one)
          named.remove();
          logAndUpdateState(
            'Last transaction tx3 removed from batch1 (batch1 should be deleted).'
          );
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Check State After Removing Transaction from Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Add tx5 to batch2
          kit.transaction({
            to: '0x000000000000000000000000000000000000c0de',
            value: '6000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx5',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batch2' });
          // Add tx6 to batch2
          kit.transaction({
            to: '0x000000000000000000000000000000000000c0fe',
            value: '7000000000000000000',
          });
          const named2 = kit.name({
            transactionName: 'tx6',
          }) as NamedTransactionState;
          named2.addToBatch({ batchName: 'batch2' });
          // Remove tx5 from batch2
          named.remove();
          logAndUpdateState(
            'Transaction tx5 removed from batch2. Batch2 should still exist with tx6.'
          );
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Update Transaction in Batch (tx3 in batch1)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Ensure tx3 is in batch1
          kit.transaction({
            to: '0x000000000000000000000000000000000000babe',
            value: '4000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx3',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batch1' });
          // Now update tx3 in batch1
          named.transaction({
            to: '0x000000000000000000000000000000000000feed',
            value: '8880000000000000000',
          });
          named.update();
          logAndUpdateState(
            'Transaction tx3 in batch1 updated (to and value changed).'
          );
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Add Same Transaction to Multiple Batches (tx7)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000aabb',
            value: '1000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx7',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batchA' });
          // Try to add to another batch
          named.addToBatch({ batchName: 'batchB' });
          logAndUpdateState(
            'Transaction tx7 added to batchA and batchB (check if allowed or if batchName is overwritten).'
          );
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Update Nonexistent Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'doesnotexist2',
          }) as NamedTransactionState;
          named.update();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Update After Remove',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000cafe',
            value: '123',
          });
          const named = kit.name({
            transactionName: 'tx8',
          }) as NamedTransactionState;
          named.remove();
          named.update();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Already Removed Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Remove batchC if exists
          try {
            (kit.batch({ batchName: 'batchC' }) as BatchState).remove();
          } catch {}
          // Try to remove again
          (kit.batch({ batchName: 'batchC' }) as BatchState).remove();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Add Transaction with Invalid Address',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({ to: 'not-an-address', value: '1' });
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Add Transaction with Negative Value',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000dead',
            value: '-1',
          });
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Estimate with No Transaction Selected',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Try to call estimate on kit as NamedTransactionState (should throw)
          await (kit as unknown as NamedTransactionState).estimate();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Send with No Transaction Selected',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Try to call send on kit as NamedTransactionState (should throw)
          await (kit as unknown as NamedTransactionState).send();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Estimate Empty Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Create empty batchD by adding and removing a tx
          kit.transaction({
            to: '0x000000000000000000000000000000000000dede',
            value: '1',
          });
          const named = kit.name({
            transactionName: 'tx9',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batchD' });
          named.remove();
          const result = await kit.estimateBatches({
            onlyBatchNames: ['batchD'],
          });
          logAndUpdateState('Estimate empty batchD: ' + JSON.stringify(result));
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Send Empty Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.sendBatches({ onlyBatchNames: ['batchD'] });
          logAndUpdateState('Send empty batchD: ' + JSON.stringify(result));
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove Transaction from Batch then Remove Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Add tx10 to batchE
          kit.transaction({
            to: '0x000000000000000000000000000000000000eeee',
            value: '1',
          });
          const named = kit.name({
            transactionName: 'tx10',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batchE' });
          named.remove();
          // Now remove batchE
          (kit.batch({ batchName: 'batchE' }) as BatchState).remove();
          logAndUpdateState('Removed tx10 from batchE, then removed batchE.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Add Transaction, Name, No Update, Check State',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000f0f0',
            value: '1',
          });
          kit.name({ transactionName: 'tx11' }) as NamedTransactionState;
          logAndUpdateState('Added tx11 and named, but did not call update.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Add to Batch, Update, Remove, Check Batch State',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000f1f1',
            value: '1',
          });
          const named = kit.name({
            transactionName: 'tx12',
          }) as NamedTransactionState;
          named.addToBatch({ batchName: 'batchF' });
          named.transaction({
            to: '0x000000000000000000000000000000000000f2f2',
            value: '2',
          });
          named.update();
          named.remove();
          logAndUpdateState(
            'Added tx12 to batchF, updated, then removed. BatchF should be empty or deleted.'
          );
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Remove with Nothing Selected',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Try to call remove on kit as NamedTransactionState (should throw)
          (kit as unknown as NamedTransactionState).remove();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Send after Batch (should throw)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.batch({ batchName: 'batch1' }) as BatchState;
          await (kit as unknown as NamedTransactionState).send();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'AddToBatch without Naming Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Try to call addToBatch on kit as NamedTransactionState (should throw)
          (kit as unknown as NamedTransactionState).addToBatch({
            batchName: 'batchG',
          });
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Update without Naming Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Try to call update on kit as NamedTransactionState (should throw)
          (kit as unknown as NamedTransactionState).update();
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Batch with Empty Name',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.batch({ batchName: '   ' });
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Name with Empty Name',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.name({ transactionName: '   ' });
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Transaction with Invalid ChainId',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000dead',
            value: '1',
            chainId: -1,
          });
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'Transaction with Missing To',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({ value: '1' } as any);
          logAndUpdateState('Should not see this.');
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'EstimateBatches with Nonexistent Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.estimateBatches({
            onlyBatchNames: ['doesnotexistbatch'],
          });
          logAndUpdateState(
            'EstimateBatches with nonexistent batch: ' + JSON.stringify(result)
          );
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
    {
      label: 'SendBatches with Nonexistent Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.sendBatches({
            onlyBatchNames: ['doesnotexistbatch'],
          });
          let msg =
            'SendBatches with nonexistent batch: ' + JSON.stringify(result);
          if (
            result &&
            result.batches &&
            result.batches['doesnotexistbatch'] &&
            result.batches['doesnotexistbatch'].isSuccess
          ) {
            msg += ' (Batch doesnotexistbatch removed from state)';
          }
          logAndUpdateState(msg);
        } catch (e) {
          logAndUpdateState('Error: ' + (e as Error).message);
        }
      },
    },
  ];

  // Log a message and update the current state
  const logAndUpdateState = (msg: string) => {
    setLogs((prev) => [
      msg,
      'State: ' + JSON.stringify(kit.getState(), null, 2),
      ...prev,
    ]);
    setCurrentState(kit.getState());
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Transaction Kit Test UI</h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {scenarios.map((scenario, i) => (
          <button
            key={i}
            className="bg-red-500 m-4"
            onClick={() => scenario.action(logAndUpdateState)}
          >
            {scenario.label}
          </button>
        ))}
      </div>
      <div
        style={{
          background: '#222',
          color: '#fff',
          padding: 12,
          minHeight: 200,
          fontFamily: 'monospace',
          fontSize: 14,
        }}
      >
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>Current State</h3>
        <pre style={{ background: '#111', color: '#0f0', padding: 12 }}>
          {JSON.stringify(currentState, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default App;
