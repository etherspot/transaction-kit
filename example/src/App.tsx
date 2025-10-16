import { WalletProviderLike } from '@etherspot/modular-sdk';
import {
  IBatch,
  INamedTransaction,
  TransactionKit,
  WalletMode,
} from '@etherspot/transaction-kit';
import { useState } from 'react';
import { createWalletClient, custom, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism } from 'viem/chains';

// Utility function for JSON serialization with BigInt support
function bigIntReplacer(key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

// Account setup
const account = privateKeyToAccount(
  `0x${process.env.REACT_APP_DEMO_WALLET_PK}` as `0x${string}`
);

const client = createWalletClient({
  account,
  chain: optimism,
  transport: custom(window.ethereum!),
});

// TransactionKit configuration
const BUNDLER_API_KEY =
  process.env.REACT_APP_ETHERSPOT_BUNDLER_API_KEY || undefined;

// Initialize kit with modular mode by default
let kit = TransactionKit({
  provider: client as WalletProviderLike,
  chainId: 10,
  bundlerApiKey: BUNDLER_API_KEY,
  walletMode: 'modular',
});

const App = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState<any>(kit.getState());
  const [walletMode, setWalletMode] = useState<WalletMode>('modular');

  // Input state for interactive scenarios
  const [txName, setTxName] = useState<string>('testTx');
  const [txAmount, setTxAmount] = useState<string>('0.001');
  const [txTo, setTxTo] = useState<string>(
    '0x000000000000000000000000000000000000dead'
  );
  const [txChainId, setTxChainId] = useState<string>('137');
  const [batchName, setBatchName] = useState<string>('testBatch');
  const [updateTxName, setUpdateTxName] = useState<string>('tx1');
  const [updateTxTo, setUpdateTxTo] = useState<string>(
    '0x000000000000000000000000000000000000beef'
  );
  const [updateTxAmount, setUpdateTxAmount] = useState<string>('0.002');
  const [removeTxName, setRemoveTxName] = useState<string>('tx1');
  const [removeBatchName, setRemoveBatchName] = useState<string>('batch1');
  const [userOpHash, setUserOpHash] = useState<string>(
    '0x4ca7ee652d57678f26e887c149ab0735f41de37bcad58c9f6d3ed5824f15b74d'
  );
  const [txHashChainId, setTxHashChainId] = useState<string>('10');

  // State for which input sections are expanded
  const [expandedSections, setExpandedSections] = useState<{
    createTx: boolean;
    updateTx: boolean;
    removeTx: boolean;
    addToBatch: boolean;
    removeBatch: boolean;
    estimateSingle: boolean;
    estimateBatches: boolean;
    sendSingle: boolean;
    sendBatches: boolean;
    getTxHash: boolean;
  }>({
    createTx: false,
    updateTx: false,
    removeTx: false,
    addToBatch: false,
    removeBatch: false,
    estimateSingle: false,
    estimateBatches: false,
    sendSingle: false,
    sendBatches: false,
    getTxHash: false,
  });

  // Input state for execution scenarios
  const [estimateTxName, setEstimateTxName] = useState<string>('tx1');
  const [sendTxName, setSendTxName] = useState<string>('tx1');
  const [estimateBatchNames, setEstimateBatchNames] =
    useState<string>('batch1,batch2');
  const [sendBatchNames, setSendBatchNames] = useState<string>('batch1,batch2');

  // Helper functions for expanding/collapsing sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Action functions for confirm buttons
  const confirmCreateTransaction = async () => {
    try {
      const chainId = parseInt(txChainId);
      const value = parseEther(txAmount);

      kit.transaction({
        chainId,
        to: txTo,
        value: value.toString(),
      });
      kit.name({ transactionName: txName }) as INamedTransaction;
      logAndUpdateState(
        `✅ Single transaction created and named as ${txName}.`
      );
      logAndUpdateState(`📝 Amount: ${txAmount} ETH (native transfer)`);
      logAndUpdateState(`📍 To: ${txTo}`);
      logAndUpdateState(`🔗 Chain ID: ${chainId}`);
      toggleSection('createTx');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmUpdateTransaction = async () => {
    try {
      const chainId = parseInt(txChainId);
      const value = parseEther(updateTxAmount);

      const named = kit.name({
        transactionName: updateTxName,
      }) as INamedTransaction;
      named.transaction({
        chainId,
        to: updateTxTo,
        value: value.toString(),
      });
      named.update();
      logAndUpdateState(`✅ Transaction ${updateTxName} updated.`);
      logAndUpdateState(`📝 New amount: ${updateTxAmount} ETH`);
      logAndUpdateState(`📍 New to: ${updateTxTo}`);
      toggleSection('updateTx');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmRemoveTransaction = async () => {
    try {
      const named = kit.name({
        transactionName: removeTxName,
      }) as INamedTransaction;
      named.remove();
      logAndUpdateState(`✅ Transaction ${removeTxName} removed.`);
      toggleSection('removeTx');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmAddToBatch = async () => {
    try {
      const chainId = parseInt(txChainId);
      const value = parseEther(txAmount);

      kit.transaction({
        chainId,
        to: txTo,
        value: value.toString(),
      });
      const named = kit.name({
        transactionName: txName,
      }) as INamedTransaction;
      named.addToBatch({ batchName });
      logAndUpdateState(`✅ Transaction ${txName} added to ${batchName}.`);
      logAndUpdateState(`📝 Amount: ${txAmount} ETH`);
      logAndUpdateState(`📍 To: ${txTo}`);
      toggleSection('addToBatch');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmRemoveBatch = async () => {
    try {
      const batch = kit.batch({ batchName: removeBatchName }) as IBatch;
      batch.remove();
      logAndUpdateState(`✅ Batch ${removeBatchName} removed.`);
      toggleSection('removeBatch');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmEstimateSingle = async () => {
    try {
      const named = kit.name({
        transactionName: estimateTxName,
      }) as INamedTransaction;
      const result = await named.estimate();
      logAndUpdateState(
        `✅ Estimate single ${estimateTxName}: ${JSON.stringify(result, bigIntReplacer)}`
      );
      toggleSection('estimateSingle');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmEstimateBatches = async () => {
    try {
      const batchNames = estimateBatchNames
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name);
      const result = await kit.estimateBatches({
        onlyBatchNames: batchNames.length > 0 ? batchNames : undefined,
      });
      logAndUpdateState(
        `✅ Estimate batches: ${JSON.stringify(result, bigIntReplacer)}`
      );
      toggleSection('estimateBatches');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmSendSingle = async () => {
    try {
      const named = kit.name({
        transactionName: sendTxName,
      }) as INamedTransaction;
      const result = await named.send();
      if (result.isSentSuccessfully) {
        logAndUpdateState(
          `✅ Send single ${sendTxName}: ${JSON.stringify(result, bigIntReplacer)} (${sendTxName} removed from state)`
        );
      } else {
        logAndUpdateState(
          `❌ Send single ${sendTxName} failed: ${JSON.stringify(result, bigIntReplacer)}`
        );
      }
      toggleSection('sendSingle');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmSendBatches = async () => {
    try {
      const batchNames = sendBatchNames
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name);
      const result = await kit.sendBatches({
        onlyBatchNames: batchNames.length > 0 ? batchNames : undefined,
      });
      let msg = `✅ Send batches: ${JSON.stringify(result, bigIntReplacer)}`;
      // Check which batches were removed
      if (result && result.batches) {
        const removedBatches = Object.entries(result.batches)
          .filter(([_, batchResult]) => batchResult.isSentSuccessfully)
          .map(([batchName]) => batchName);
        if (removedBatches.length > 0) {
          msg += ` (Batches removed from state: ${removedBatches.join(', ')})`;
        }
      }
      logAndUpdateState(msg);
      toggleSection('sendBatches');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  const confirmGetTransactionHash = async () => {
    try {
      const chainId = parseInt(txHashChainId);
      const result = await kit.getTransactionHash(userOpHash, chainId);
      if (result) {
        logAndUpdateState(`✅ Transaction Hash: ${result}`);
      } else {
        logAndUpdateState(`⚠️ No transaction hash found within timeout period`);
      }
      toggleSection('getTxHash');
    } catch (e) {
      logAndUpdateState(`❌ Error: ${(e as Error).message}`);
    }
  };

  // Wallet mode switching function
  const switchWalletMode = (mode: WalletMode) => {
    try {
      kit.reset();

      if (mode === 'delegatedEoa') {
        kit = TransactionKit({
          chainId: 10,
          bundlerApiKey: BUNDLER_API_KEY,
          walletMode: 'delegatedEoa',
          privateKey:
            `0x${process.env.REACT_APP_DEMO_WALLET_PK}` as `0x${string}`,
        });
      } else {
        kit = TransactionKit({
          provider: client as WalletProviderLike,
          chainId: 10,
          bundlerApiKey: BUNDLER_API_KEY,
          walletMode: 'modular',
        });
      }

      setWalletMode(mode);
      setCurrentState(kit.getState());
      logAndUpdateState(`✅ Switched to ${mode} wallet mode`);
    } catch (e) {
      logAndUpdateState(`❌ Error switching mode: ${(e as Error).message}`);
    }
  };

  // ============================================================================
  // EIP-7702 Smart Wallet Management (DelegatedEoa Mode Only)
  // ============================================================================
  const eip7702Scenarios = [
    {
      label: '🔍 Check Smart Wallet Status',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const isDelegateSmartAccountToEoa =
            await kit.isDelegateSmartAccountToEoa();
          logAndUpdateState(
            `✅ Status: ${isDelegateSmartAccountToEoa ? 'Smart Wallet (EIP-7702 active)' : 'Regular EOA (needs authorization)'}`
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '⚡ Install Smart Wallet (Execute)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          logAndUpdateState(`⚡ Installing smart wallet with execution...`);
          const result = await kit.delegateSmartAccountToEoa({
            isExecuting: true,
          });

          if (result.isAlreadyInstalled) {
            logAndUpdateState(
              `✅ Already installed - EOA: ${result.eoaAddress}`
            );
            if (result.userOpHash) {
              logAndUpdateState(`📝 UserOp Hash: ${result.userOpHash}`);
            }
          } else if (result.userOpHash) {
            logAndUpdateState(
              `✅ Installed successfully! UserOp Hash: ${result.userOpHash}`
            );
            logAndUpdateState(`🎉 Smart wallet is now active on-chain!`);
          } else {
            logAndUpdateState(
              `⚠️ Authorization signed but transaction failed - EOA: ${result.eoaAddress}`
            );
            logAndUpdateState(
              `📝 This might be due to network/bundler EIP-7702 support issues`
            );
            logAndUpdateState(
              `💡 Try using "sign only" option and include authorization in a manual transaction`
            );
          }
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '✍️ Install Smart Wallet (Sign Only)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          logAndUpdateState(`✍️ Signing authorization only...`);
          const result = await kit.delegateSmartAccountToEoa({
            isExecuting: false,
          });

          if (result.isAlreadyInstalled) {
            logAndUpdateState(
              `✅ Already installed - EOA: ${result.eoaAddress}`
            );
          } else {
            logAndUpdateState(
              `✅ Authorization signed - EOA: ${result.eoaAddress}`
            );
            logAndUpdateState(`📍 Delegate: ${result.delegateAddress}`);
            logAndUpdateState(
              `📝 Authorization: ${JSON.stringify(result.authorization, bigIntReplacer)}`
            );
            logAndUpdateState(
              `⚠️ Note: Include this authorization in a transaction to activate the delegation`
            );
          }
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🗑️ Uninstall Smart Wallet (Execute)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          logAndUpdateState(`🗑️ Uninstalling smart wallet with execution...`);
          const result = await kit.undelegateSmartAccountToEoa?.({
            isExecuting: true,
          });

          if (!result) {
            logAndUpdateState(
              `❌ undelegateSmartAccountToEoa method not available`
            );
            return;
          }

          if (!result.authorization) {
            logAndUpdateState(
              `✅ No uninstall needed - EOA is not a smart wallet: ${result.eoaAddress}`
            );
          } else if (result.userOpHash) {
            logAndUpdateState(
              `✅ Uninstalled successfully! UserOp Hash: ${result.userOpHash}`
            );
            logAndUpdateState(`🎉 Smart wallet delegation revoked on-chain!`);
          } else {
            logAndUpdateState(
              `⚠️ Authorization signed but transaction failed - EOA: ${result.eoaAddress}`
            );
            logAndUpdateState(
              `📝 This might be due to network/bundler EIP-7702 support issues`
            );
            logAndUpdateState(
              `💡 Try using "sign only" option and include authorization in a manual transaction`
            );
          }
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '✍️ Uninstall Smart Wallet (Sign Only)',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          logAndUpdateState(`✍️ Signing uninstall authorization only...`);
          const result = await kit.undelegateSmartAccountToEoa?.({
            isExecuting: false,
          });

          if (!result) {
            logAndUpdateState(
              `❌ undelegateSmartAccountToEoa method not available`
            );
            return;
          }

          if (!result.authorization) {
            logAndUpdateState(
              `✅ No uninstall needed - EOA is not a smart wallet: ${result.eoaAddress}`
            );
          } else {
            logAndUpdateState(
              `✅ Uninstall authorization signed - EOA: ${result.eoaAddress}`
            );
            logAndUpdateState(
              `📝 Authorization: ${JSON.stringify(result.authorization, bigIntReplacer)}`
            );
            logAndUpdateState(
              `⚠️ Note: Include this authorization in a transaction to revoke the delegation`
            );
          }
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
  ];

  // ============================================================================
  // Transaction Management (All Modes) - Now with expandable inputs
  // ============================================================================
  const transactionScenarios = [
    {
      label: '➕ Create Single Transaction',
      isExpandable: true,
      expanded: expandedSections.createTx,
      onToggle: () => toggleSection('createTx'),
      onConfirm: confirmCreateTransaction,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
    {
      label: '✏️ Update Transaction',
      isExpandable: true,
      expanded: expandedSections.updateTx,
      onToggle: () => toggleSection('updateTx'),
      onConfirm: confirmUpdateTransaction,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
    {
      label: '🗑️ Remove Transaction',
      isExpandable: true,
      expanded: expandedSections.removeTx,
      onToggle: () => toggleSection('removeTx'),
      onConfirm: confirmRemoveTransaction,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
  ];

  // ============================================================================
  // Batch Management (All Modes) - Now with expandable inputs
  // ============================================================================
  const batchScenarios = [
    {
      label: '📦 Add Transaction to Batch',
      isExpandable: true,
      expanded: expandedSections.addToBatch,
      onToggle: () => toggleSection('addToBatch'),
      onConfirm: confirmAddToBatch,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
    {
      label: '➕ Add Another to Batch',
      isExpandable: false,
      expanded: false,
      onToggle: () => {},
      onConfirm: () => {},
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const chainId = parseInt(txChainId);
          const value = parseEther(txAmount);
          const anotherTxName = `${txName}_2`;

          kit.transaction({
            chainId,
            to: txTo,
            value: value.toString(),
          });
          const named = kit.name({
            transactionName: anotherTxName,
          }) as INamedTransaction;
          named.addToBatch({ batchName });
          logAndUpdateState(
            `✅ Transaction ${anotherTxName} added to ${batchName}.`
          );
          logAndUpdateState(`📝 Amount: ${txAmount} ETH`);
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🗑️ Remove Batch',
      isExpandable: true,
      expanded: expandedSections.removeBatch,
      onToggle: () => toggleSection('removeBatch'),
      onConfirm: confirmRemoveBatch,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
  ];

  // ============================================================================
  // Estimation & Execution (All Modes) - Now with expandable inputs
  // ============================================================================
  const executionScenarios = [
    {
      label: '💰 Estimate Single Transaction',
      isExpandable: true,
      expanded: expandedSections.estimateSingle,
      onToggle: () => toggleSection('estimateSingle'),
      onConfirm: confirmEstimateSingle,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
    {
      label: '📊 Estimate Batches',
      isExpandable: true,
      expanded: expandedSections.estimateBatches,
      onToggle: () => toggleSection('estimateBatches'),
      onConfirm: confirmEstimateBatches,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
    {
      label: '📤 Send Single Transaction',
      isExpandable: true,
      expanded: expandedSections.sendSingle,
      onToggle: () => toggleSection('sendSingle'),
      onConfirm: confirmSendSingle,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
    {
      label: '🚀 Send Batches',
      isExpandable: true,
      expanded: expandedSections.sendBatches,
      onToggle: () => toggleSection('sendBatches'),
      onConfirm: confirmSendBatches,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
  ];

  // ============================================================================
  // Error Handling & Edge Cases (All Modes)
  // ============================================================================
  const errorScenarios = [
    {
      label: '❌ Remove Nonexistent Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'doesnotexist',
          }) as INamedTransaction;
          named.remove();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Remove Nonexistent Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const batch = kit.batch({ batchName: 'doesnotexist' }) as IBatch;
          batch.remove();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔧 Remove Transaction from Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'tx2',
          }) as INamedTransaction;
          named.remove();
          logAndUpdateState('✅ Transaction tx2 removed from batch1.');
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔧 Create and Remove Standalone Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000f00d',
            value: '5000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx4',
          }) as INamedTransaction;
          logAndUpdateState('✅ Standalone transaction tx4 created.');
          named.remove();
          logAndUpdateState('✅ Standalone transaction tx4 removed.');
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔧 Remove Last Transaction in Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Ensure tx3 is in batch1
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000babe',
            value: '4000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx3',
          }) as INamedTransaction;
          named.addToBatch({ batchName: 'batch1' });
          // Remove tx3 (should delete batch1 if it's the last one)
          named.remove();
          logAndUpdateState(
            '✅ Last transaction tx3 removed from batch1 (batch1 should be deleted).'
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔍 Check State After Removing Transaction from Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Add tx5 to batch2
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000c0de',
            value: '6000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx5',
          }) as INamedTransaction;
          named.addToBatch({ batchName: 'batch2' });
          // Add tx6 to batch2
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000c0fe',
            value: '7000000000000000000',
          });
          const named2 = kit.name({
            transactionName: 'tx6',
          }) as INamedTransaction;
          named2.addToBatch({ batchName: 'batch2' });
          // Remove tx5 from batch2
          named.remove();
          logAndUpdateState(
            '✅ Transaction tx5 removed from batch2. Batch2 should still exist with tx6.'
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '✏️ Update Transaction in Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Ensure tx3 is in batch1
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000babe',
            value: '4000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx3',
          }) as INamedTransaction;
          named.addToBatch({ batchName: 'batch1' });
          // Now update tx3 in batch1
          named.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000feed',
            value: '8880000000000000000',
          });
          named.update();
          logAndUpdateState(
            '✅ Transaction tx3 in batch1 updated (to and value changed).'
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔧 Add Same Transaction to Multiple Batches',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000aabb',
            value: '1000000000000000000',
          });
          const named = kit.name({
            transactionName: 'tx7',
          }) as INamedTransaction;
          named.addToBatch({ batchName: 'batchA' });
          // Try to add to another batch
          named.addToBatch({ batchName: 'batchB' });
          logAndUpdateState(
            '✅ Transaction tx7 added to batchA and batchB (check if allowed or if batchName is overwritten).'
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Update Nonexistent Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const named = kit.name({
            transactionName: 'doesnotexist2',
          }) as INamedTransaction;
          named.update();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Update After Remove',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000cafe',
            value: '123',
          });
          const named = kit.name({
            transactionName: 'tx8',
          }) as INamedTransaction;
          named.remove();
          named.update();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Remove Already Removed Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Remove batchC if exists
          try {
            (kit.batch({ batchName: 'batchC' }) as IBatch).remove();
          } catch {}
          // Try to remove again
          (kit.batch({ batchName: 'batchC' }) as IBatch).remove();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Add Transaction with Invalid Address',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({ chainId: 137, to: 'not-an-address', value: '1' });
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Add Transaction with Negative Value',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000dead',
            value: '-1',
          });
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Estimate with No Transaction Selected',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          await (kit as unknown as INamedTransaction).estimate();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Send with No Transaction Selected',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          await (kit as unknown as INamedTransaction).send();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔍 Estimate Empty Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Create empty batchD by adding and removing a tx
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000dede',
            value: '1',
          });
          const named = kit.name({
            transactionName: 'tx9',
          }) as INamedTransaction;
          named.addToBatch({ batchName: 'batchD' });
          named.remove();
          const result = await kit.estimateBatches({
            onlyBatchNames: ['batchD'],
          });
          logAndUpdateState(
            `✅ Estimate empty batchD: ${JSON.stringify(result, bigIntReplacer)}`
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🚀 Send Empty Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.sendBatches({ onlyBatchNames: ['batchD'] });
          logAndUpdateState(
            `✅ Send empty batchD: ${JSON.stringify(result, bigIntReplacer)}`
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔧 Remove Transaction from Batch then Remove Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Add tx10 to batchE
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000eeee',
            value: '1',
          });
          const named = kit.name({
            transactionName: 'tx10',
          }) as INamedTransaction;
          named.addToBatch({ batchName: 'batchE' });
          named.remove();
          // Now remove batchE
          (kit.batch({ batchName: 'batchE' }) as IBatch).remove();
          logAndUpdateState(
            '✅ Removed tx10 from batchE, then removed batchE.'
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔍 Add Transaction, Name, No Update',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000f0f0',
            value: '1',
          });
          kit.name({ transactionName: 'tx11' }) as INamedTransaction;
          logAndUpdateState(
            '✅ Added tx11 and named, but did not call update.'
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔧 Add to Batch, Update, Remove',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000f1f1',
            value: '1',
          });
          const named = kit.name({
            transactionName: 'tx12',
          }) as INamedTransaction;
          named.addToBatch({ batchName: 'batchF' });
          named.transaction({
            chainId: 137,
            to: '0x000000000000000000000000000000000000f2f2',
            value: '2',
          });
          named.update();
          named.remove();
          logAndUpdateState(
            '✅ Added tx12 to batchF, updated, then removed. BatchF should be empty or deleted.'
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Remove with Nothing Selected',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          (kit as unknown as INamedTransaction).remove();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Send after Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.batch({ batchName: 'batch1' }) as IBatch;
          await (kit as unknown as INamedTransaction).send();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ AddToBatch without Naming Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          (kit as unknown as INamedTransaction).addToBatch({
            batchName: 'batchG',
          });
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Update without Naming Transaction',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          (kit as unknown as INamedTransaction).update();
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Batch with Empty Name',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.batch({ batchName: '   ' });
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Name with Empty Name',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.name({ transactionName: '   ' });
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Transaction with Invalid ChainId',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            to: '0x000000000000000000000000000000000000dead',
            value: '1',
            chainId: -1,
          });
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '❌ Transaction with Missing To',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.transaction({
            chainId: 1,
            to: '0x0000000000000000000000000000000000000000',
            value: '1',
          });
          logAndUpdateState('❌ Should not see this.');
        } catch (e) {
          logAndUpdateState(`✅ Expected error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔍 EstimateBatches with Nonexistent Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.estimateBatches({
            onlyBatchNames: ['doesnotexistbatch'],
          });
          logAndUpdateState(
            `✅ EstimateBatches with nonexistent batch: ${JSON.stringify(result, bigIntReplacer)}`
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔍 SendBatches with Nonexistent Batch',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const result = await kit.sendBatches({
            onlyBatchNames: ['doesnotexistbatch'],
          });
          let msg = `SendBatches with nonexistent batch: ${JSON.stringify(result, bigIntReplacer)}`;
          if (
            result &&
            result.batches &&
            result.batches['doesnotexistbatch'] &&
            result.batches['doesnotexistbatch'].isSentSuccessfully
          ) {
            msg += ' (Batch doesnotexistbatch removed from state)';
          }
          logAndUpdateState(`✅ ${msg}`);
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
  ];

  // ============================================================================
  // Utility Functions (All Modes)
  // ============================================================================
  const utilityScenarios = [
    {
      label: '💼 Get Wallet Address',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const address = await kit.getWalletAddress();
          logAndUpdateState(`✅ Wallet Address: ${address}`);
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔄 Get Current State',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          const state = kit.getState();
          logAndUpdateState(
            `✅ Current State: ${JSON.stringify(state, bigIntReplacer, 2)}`
          );
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🐞 Toggle Debug Mode',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          // Note: debugMode is a private property, so we can't access it directly
          // For now, we'll just toggle it on/off without checking current state
          kit.setDebugMode(true); // Enable debug mode
          logAndUpdateState(`✅ Debug mode: enabled`);
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔄 Reset Kit',
      action: async (logAndUpdateState: (msg: string) => void) => {
        try {
          kit.reset();
          logAndUpdateState('✅ Kit reset successfully');
        } catch (e) {
          logAndUpdateState(`❌ Error: ${(e as Error).message}`);
        }
      },
    },
    {
      label: '🔍 Get Transaction Hash',
      isExpandable: true,
      expanded: expandedSections.getTxHash,
      onToggle: () => toggleSection('getTxHash'),
      onConfirm: confirmGetTransactionHash,
      action: undefined as
        | ((logAndUpdateState: (msg: string) => void) => Promise<void>)
        | undefined,
    },
  ];

  // Log a message and update the current state
  const logAndUpdateState = (msg: string) => {
    setLogs((prev) => [
      msg,
      'State: ' + JSON.stringify(kit.getState(), bigIntReplacer, 2),
      ...prev,
    ]);
    setCurrentState(kit.getState());
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400 }}>
      <h1 style={{ marginBottom: 8 }}>🔧 Transaction Kit Test UI</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Test all wallet modes and methods
      </p>

      {/* Wallet Mode Switcher */}
      <div
        style={{
          background: '#f5f5f5',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>
          🔀 Wallet Mode Switcher
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            style={{
              padding: '12px 24px',
              background: walletMode === 'modular' ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={() => switchWalletMode('modular')}
          >
            📦 Modular Mode
          </button>
          <button
            style={{
              padding: '12px 24px',
              background: walletMode === 'delegatedEoa' ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={() => switchWalletMode('delegatedEoa')}
          >
            🚀 DelegatedEoa Mode (EIP-7702)
          </button>
          <span
            style={{
              marginLeft: 16,
              padding: '8px 16px',
              background: walletMode === 'modular' ? '#E8F5E9' : '#E3F2FD',
              color: walletMode === 'modular' ? '#2E7D32' : '#1565C0',
              borderRadius: 4,
              fontWeight: 'bold',
            }}
          >
            Current: {walletMode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* EIP-7702 Smart Wallet Management (DelegatedEoa Mode Only) */}
      {walletMode === 'delegatedEoa' && (
        <div
          style={{
            background: '#E3F2FD',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>
            ⚡ EIP-7702 Smart Wallet Management (DelegatedEoa Mode Only)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {eip7702Scenarios.map((scenario, i) => (
              <button
                key={`eip7702-${i}`}
                style={{
                  padding: '10px 16px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={() => scenario.action(logAndUpdateState)}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Management */}
      <div
        style={{
          background: '#E8F5E9',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>
          📝 Transaction Management (All Modes)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {transactionScenarios.map((scenario, i) => (
            <div key={`transaction-${i}`}>
              <button
                style={{
                  padding: '10px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  marginBottom: scenario.expanded ? 8 : 0,
                }}
                onClick={
                  scenario.isExpandable
                    ? scenario.onToggle
                    : () => {
                        if (
                          scenario.action &&
                          typeof scenario.action === 'function'
                        ) {
                          scenario.action(logAndUpdateState);
                        }
                      }
                }
              >
                {scenario.label}{' '}
                {scenario.isExpandable && (scenario.expanded ? '▼' : '▶')}
              </button>

              {/* Expandable input section */}
              {scenario.isExpandable && scenario.expanded && (
                <div
                  style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #c8e6c9',
                    marginTop: 8,
                  }}
                >
                  {scenario.label.includes('Create') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Transaction Name:
                        </label>
                        <input
                          type="text"
                          value={txName}
                          onChange={(e) => setTxName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., testTx"
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Amount (ETH) ⚠️ Native Transfer:
                        </label>
                        <input
                          type="text"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., 0.001"
                        />
                        <small style={{ color: '#6c757d', fontSize: 10 }}>
                          ⚠️ This creates a native ETH transfer using
                          parseEther()
                        </small>
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          To Address:
                        </label>
                        <input
                          type="text"
                          value={txTo}
                          onChange={(e) => setTxTo(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="0x..."
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Chain ID:
                        </label>
                        <input
                          type="number"
                          value={txChainId}
                          onChange={(e) => setTxChainId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="137"
                        />
                      </div>
                    </div>
                  )}

                  {scenario.label.includes('Update') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Transaction Name to Update:
                        </label>
                        <input
                          type="text"
                          value={updateTxName}
                          onChange={(e) => setUpdateTxName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., tx1"
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          New To Address:
                        </label>
                        <input
                          type="text"
                          value={updateTxTo}
                          onChange={(e) => setUpdateTxTo(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="0x..."
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          New Amount (ETH):
                        </label>
                        <input
                          type="text"
                          value={updateTxAmount}
                          onChange={(e) => setUpdateTxAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., 0.002"
                        />
                      </div>
                    </div>
                  )}

                  {scenario.label.includes('Remove') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Transaction Name to Remove:
                        </label>
                        <input
                          type="text"
                          value={removeTxName}
                          onChange={(e) => setRemoveTxName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., tx1"
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={scenario.onConfirm}
                      style={{
                        padding: '8px 16px',
                        background: '#2E7D32',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      ✅ Confirm
                    </button>
                    <button
                      onClick={scenario.onToggle}
                      style={{
                        padding: '8px 16px',
                        background: '#757575',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Batch Management */}
      <div
        style={{
          background: '#FFF3E0',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>
          📦 Batch Management (All Modes)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {batchScenarios.map((scenario, i) => (
            <div key={`batch-${i}`}>
              <button
                style={{
                  padding: '10px 16px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  marginBottom: scenario.expanded ? 8 : 0,
                }}
                onClick={
                  scenario.isExpandable
                    ? scenario.onToggle
                    : () => {
                        if (
                          scenario.action &&
                          typeof scenario.action === 'function'
                        ) {
                          scenario.action(logAndUpdateState);
                        }
                      }
                }
              >
                {scenario.label}{' '}
                {scenario.isExpandable && (scenario.expanded ? '▼' : '▶')}
              </button>

              {/* Expandable input section */}
              {scenario.isExpandable && scenario.expanded && (
                <div
                  style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #ffcc80',
                    marginTop: 8,
                  }}
                >
                  {scenario.label.includes('Add Transaction to Batch') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Transaction Name:
                        </label>
                        <input
                          type="text"
                          value={txName}
                          onChange={(e) => setTxName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., testTx"
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Amount (ETH) ⚠️ Native Transfer:
                        </label>
                        <input
                          type="text"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., 0.001"
                        />
                        <small style={{ color: '#6c757d', fontSize: 10 }}>
                          ⚠️ This creates a native ETH transfer using
                          parseEther()
                        </small>
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          To Address:
                        </label>
                        <input
                          type="text"
                          value={txTo}
                          onChange={(e) => setTxTo(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="0x..."
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Chain ID:
                        </label>
                        <input
                          type="number"
                          value={txChainId}
                          onChange={(e) => setTxChainId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="137"
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Batch Name:
                        </label>
                        <input
                          type="text"
                          value={batchName}
                          onChange={(e) => setBatchName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., testBatch"
                        />
                      </div>
                    </div>
                  )}

                  {scenario.label.includes('Remove Batch') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Batch Name to Remove:
                        </label>
                        <input
                          type="text"
                          value={removeBatchName}
                          onChange={(e) => setRemoveBatchName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., batch1"
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={scenario.onConfirm}
                      style={{
                        padding: '8px 16px',
                        background: '#E65100',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      ✅ Confirm
                    </button>
                    <button
                      onClick={scenario.onToggle}
                      style={{
                        padding: '8px 16px',
                        background: '#757575',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Estimation & Execution */}
      <div
        style={{
          background: '#F3E5F5',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>
          💰 Estimation & Execution (All Modes)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {executionScenarios.map((scenario, i) => (
            <div key={`execution-${i}`}>
              <button
                style={{
                  padding: '10px 16px',
                  background: '#9C27B0',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                  marginBottom: scenario.expanded ? 8 : 0,
                }}
                onClick={
                  scenario.isExpandable
                    ? scenario.onToggle
                    : () => {
                        if (
                          scenario.action &&
                          typeof scenario.action === 'function'
                        ) {
                          scenario.action(logAndUpdateState);
                        }
                      }
                }
              >
                {scenario.label}{' '}
                {scenario.isExpandable && (scenario.expanded ? '▼' : '▶')}
              </button>

              {/* Expandable input section */}
              {scenario.isExpandable && scenario.expanded && (
                <div
                  style={{
                    background: 'white',
                    padding: 16,
                    borderRadius: 6,
                    border: '1px solid #ce93d8',
                    marginTop: 8,
                  }}
                >
                  {scenario.label.includes('Estimate Single') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Transaction Name to Estimate:
                        </label>
                        <input
                          type="text"
                          value={estimateTxName}
                          onChange={(e) => setEstimateTxName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., tx1"
                        />
                        <small style={{ color: '#6c757d', fontSize: 10 }}>
                          💡 This will estimate the gas cost for the specified
                          transaction
                        </small>
                      </div>
                    </div>
                  )}

                  {scenario.label.includes('Estimate Batches') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Batch Names to Estimate (comma-separated):
                        </label>
                        <input
                          type="text"
                          value={estimateBatchNames}
                          onChange={(e) =>
                            setEstimateBatchNames(e.target.value)
                          }
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., batch1,batch2 (leave empty for all batches)"
                        />
                        <small style={{ color: '#6c757d', fontSize: 10 }}>
                          💡 Leave empty to estimate all batches, or specify
                          specific batch names
                        </small>
                      </div>
                    </div>
                  )}

                  {scenario.label.includes('Send Single') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Transaction Name to Send:
                        </label>
                        <input
                          type="text"
                          value={sendTxName}
                          onChange={(e) => setSendTxName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., tx1"
                        />
                        <small style={{ color: '#6c757d', fontSize: 10 }}>
                          ⚠️ This will execute the transaction and remove it
                          from state if successful
                        </small>
                      </div>
                    </div>
                  )}

                  {scenario.label.includes('Send Batches') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          Batch Names to Send (comma-separated):
                        </label>
                        <input
                          type="text"
                          value={sendBatchNames}
                          onChange={(e) => setSendBatchNames(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ced4da',
                            borderRadius: 4,
                          }}
                          placeholder="e.g., batch1,batch2 (leave empty for all batches)"
                        />
                        <small style={{ color: '#6c757d', fontSize: 10 }}>
                          ⚠️ This will execute the batches and remove them from
                          state if successful
                        </small>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button
                      onClick={scenario.onConfirm}
                      style={{
                        padding: '8px 16px',
                        background: '#6A1B9A',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}
                    >
                      ✅ Confirm
                    </button>
                    <button
                      onClick={scenario.onToggle}
                      style={{
                        padding: '8px 16px',
                        background: '#757575',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Handling & Edge Cases */}
      <div
        style={{
          background: '#FFEBEE',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>
          ⚠️ Error Handling & Edge Cases (All Modes)
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {errorScenarios.map((scenario, i) => (
            <button
              key={`error-${i}`}
              style={{
                padding: '10px 16px',
                background: '#F44336',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
              onClick={() => scenario.action(logAndUpdateState)}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      {/* Utility Functions */}
      <div
        style={{
          background: '#E0F2F1',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>
          🛠️ Utility Functions (All Modes)
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {utilityScenarios.map((scenario, i) => (
            <div key={`utility-${i}`}>
              <button
                style={{
                  padding: '10px 16px',
                  background: '#00897B',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={() => {
                  if (scenario.isExpandable) {
                    scenario.onToggle?.();
                  } else {
                    scenario.action?.(logAndUpdateState);
                  }
                }}
              >
                {scenario.label}{' '}
                {scenario.isExpandable && (scenario.expanded ? '▼' : '▶')}
              </button>

              {scenario.isExpandable && scenario.expanded && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 4,
                    border: '1px solid #ddd',
                  }}
                >
                  {scenario.label === '🔍 Get Transaction Hash' && (
                    <>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: 4,
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        User Operation Hash:
                      </label>
                      <input
                        type="text"
                        value={userOpHash}
                        onChange={(e) => setUserOpHash(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 4,
                          marginBottom: 8,
                          fontSize: 12,
                        }}
                        placeholder="0x..."
                      />
                      <label
                        style={{
                          display: 'block',
                          marginBottom: 4,
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      >
                        Chain ID:
                      </label>
                      <input
                        type="number"
                        value={txHashChainId}
                        onChange={(e) => setTxHashChainId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: 4,
                          marginBottom: 8,
                          fontSize: 12,
                        }}
                        placeholder="10"
                      />
                      <button
                        onClick={() => scenario.onConfirm?.()}
                        style={{
                          padding: '6px 12px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        Get Transaction Hash
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          <button
            style={{
              padding: '10px 16px',
              background: '#607D8B',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
            }}
            onClick={() => {
              kit.reset();
              setLogs([]);
              setCurrentState(kit.getState());
              logAndUpdateState('🔄 All state reset and logs cleared');
            }}
          >
            🔄 Reset All & Clear Logs
          </button>
        </div>
      </div>

      {/* Logs */}
      <div style={{ marginBottom: 24 }}>
        <h3>📋 Logs</h3>
        <div
          style={{
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: 16,
            minHeight: 300,
            maxHeight: 500,
            overflow: 'auto',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: 13,
            borderRadius: 4,
            lineHeight: 1.6,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#888' }}>
              No logs yet. Click a button to test functionality.
            </div>
          ) : (
            logs.map((l, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 8,
                  paddingBottom: 8,
                  borderBottom: i < logs.length - 1 ? '1px solid #333' : 'none',
                }}
              >
                {l}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Current State */}
      <div>
        <h3>📊 Current State</h3>
        <pre
          style={{
            background: '#0d1117',
            color: '#58a6ff',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 12,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          }}
        >
          {JSON.stringify(currentState, bigIntReplacer, 2)}
        </pre>
      </div>
    </div>
  );
};

export default App;
