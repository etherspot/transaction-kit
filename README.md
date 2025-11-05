# 🚀 TransactionKit

> **The framework-agnostic Etherspot Transaction Kit that makes blockchain transactions feel like a walk in the park! 🌳**

Ever felt like blockchain transactions were more complex than explaining quantum physics to a cat? Well, fret no more! TransactionKit is here to turn your transaction woes into smooth sailing. Choose between Etherspot's Modular SDK for traditional smart accounts or cutting-edge EIP-7702 delegated EOAs - this library brings you a delightful, method-chained API that makes sending transactions as easy as ordering coffee. ☕

## ✨ What Makes TransactionKit Special?

- **🔗 Method Chainable**: Fluent API that reads like poetry
- **🌳 Tree Shakeable**: Only bundle what you actually use - your users will thank you
- **🎯 Framework Agnostic**: Works with React, Vue, vanilla JS, or whatever floats your boat
- **⚡ TypeScript First**: Full type safety with beautiful IntelliSense
- **🛡️ Error Handling**: Graceful error handling that won't make you pull your hair out
- **📦 Batch Support**: Send multiple transactions in one go - efficiency is key!
- **🔧 Debug Mode**: When things go sideways, we've got your back with detailed logging
- **🔐 EIP-7702 Support**: Native support for delegated EOA (Externally Owned Account) functionality
- **🏗️ Multiple Wallet Modes**: Choose between modular smart accounts or delegated EOA accounts (EIP-7702)
- **🌐 Multi-Chain**: Enhanced batch operations with intelligent chain-based grouping
- **⚙️ Flexible Bundler Configuration**: Custom bundler URLs with flexible API key formats

## 🎯 Target Environments

TransactionKit is designed to work across the entire JavaScript ecosystem:

- **🌐 Browsers**: Modern browsers with Web3 wallet support
- **📱 React Native**: Mobile apps that need blockchain functionality
- **🖥️ Node.js**: Server-side transaction processing
- **⚛️ React**: Web applications (with our React hooks coming soon!)
- **🎨 Vue**: Vue.js applications
- **🔄 Angular**: Angular applications
- **🛠️ Vanilla JS**: When you want to keep it simple

## 📦 Installation

```bash
# Using npm
npm install @etherspot/transaction-kit

# Using yarn
yarn add @etherspot/transaction-kit

# Using pnpm (because we're modern like that)
pnpm add @etherspot/transaction-kit
```

## 🚀 Quick Start

### Quick Start with Modular Mode

### Basic Transaction Sending

Here's how to send a simple transaction with the modular smart account - it's easier than making toast! 🍞

```typescript
import { TransactionKit } from '@etherspot/transaction-kit';
import { createWalletClient, custom } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

// Set up your wallet provider (this is just an example)
const account = privateKeyToAccount('0x...your-private-key...');
const client = createWalletClient({
  account,
  chain: polygon,
  transport: custom(window.ethereum!),
});

// Initialize TransactionKit
const kit = TransactionKit({
  provider: client,
  chainId: 137, // Polygon mainnet
  bundlerApiKey: 'your-bundler-api-key', // Optional but recommended
  walletMode: 'modular', // Optional: this is the default
});

// Send a transaction - it's that simple!
const sendTransaction = async () => {
  try {
    // Create and name your transaction
    const transaction = kit
      .transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Recipient address
        value: '1000000000000000000', // 1 ETH in wei
        chainId: 137, // Polygon
      })
      .name({ transactionName: 'my-first-tx' });

    // Estimate the transaction cost
    const estimate = await transaction.estimate();
    console.log('Transaction cost:', estimate.cost);

    // Send the transaction
    const result = await transaction.send();

    if (result.isSentSuccessfully) {
      console.log('🎉 Transaction sent successfully!');
      console.log('Transaction hash:', result.userOpHash);
    } else {
      console.log('❌ Transaction failed:', result.errorMessage);
    }
  } catch (error) {
    console.error('Something went wrong:', error);
  }
};
```

### Quick Start with Delegated EOA Mode (EIP-7702)

For users who want to use EIP-7702 delegated EOAs:

```typescript
import { TransactionKit } from '@etherspot/transaction-kit';

// Initialize TransactionKit
const kit = TransactionKit({
  chainId: 137, // Polygon mainnet
  privateKey: '0x...your-private-key...', // Required for EIP-7702 (either privateKey or viemLocalAcocunt)
  bundlerApiKey: 'your-bundler-api-key', // Optional but recommended
  walletMode: 'delegatedEoa', // Required for EIP-7702
});

// Send a transaction with delegated EOA
const sendDelegatedTransaction = async () => {
  try {
    // Check if EOA is delegated
    const isDelegated = await kit.isDelegateSmartAccountToEoa(137);

    if (!isDelegated) {
      // Delegate EOA to smart account first
      await kit.delegateSmartAccountToEoa({
        chainId: 137,
        delegateImmediately: true,
      });
    }

    // Create and send transaction
    const transaction = kit
      .transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: '1000000000000000000', // 1 ETH
        chainId: 137,
      })
      .name({ transactionName: 'delegated-tx' });

    const result = await transaction.send();

    if (result.isSentSuccessfully) {
      console.log('🎉 Delegated EOA transaction sent!');
    }
  } catch (error) {
    console.error('Transaction failed:', error);
  }
};
```

### Batch Transactions in Modular and Delegated EOA modes

Want to send multiple transactions at once? We've got you covered! 🎯

```typescript
// Create multiple transactions and add them to a batch
const sendBatchTransactions = async () => {
  try {
    // First transaction
    kit
      .transaction({
        to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: '500000000000000000', // 0.5 ETH
        chainId: 137, // Optional but recommended for batched transaction
      })
      .name({ transactionName: 'tx1' })
      .addToBatch({ batchName: 'my-batch' });

    // Second transaction
    kit
      .transaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '300000000000000000', // 0.3 ETH
        chainId: 137, // Optional but recommended for batched transaction
      })
      .name({ transactionName: 'tx2' })
      .addToBatch({ batchName: 'my-batch' });

    // Send the entire batch
    const result = await kit.sendBatches();

    if (result.isSentSuccessfully) {
      console.log('🎉 Batch sent successfully!');
      Object.entries(result.batches).forEach(([batchName, batchResult]) => {
        console.log(`Batch "${batchName}":`, batchResult.userOpHash);
      });
    }
  } catch (error) {
    console.error('Batch failed:', error);
  }
};
```

### Advanced Usage in Modular and Delegated EOA modes

```typescript
// Update existing transactions
const updateTransaction = () => {
  const namedTx = kit.name({ transactionName: 'my-tx' });

  // Update the transaction details
  namedTx
    .transaction({
      to: '0xNewAddress123456789012345678901234567890',
      value: '2000000000000000000', // 2 ETH
      chainId: 137, // Optional
    })
    .update();
};

// Remove transactions or batches
const cleanup = () => {
  // Remove a specific transaction
  kit.name({ transactionName: 'my-tx' }).remove();

  // Remove an entire batch
  kit.batch({ batchName: 'my-batch' }).remove();
};

// Get wallet address
const getWalletAddress = async () => {
  const address = await kit.getWalletAddress(137); // Polygon
  console.log('Your wallet address:', address);
};

// Enable debug mode for troubleshooting
kit.setDebugMode(true);
```

### EIP-7702 Delegated EOA Examples

For EIP-7702 specific functionalities:

```typescript
// Initialize with delegated EOA mode
const kit = TransactionKit({
  chainId: 137, // Polygon
  privateKey: '0x...your-private-key...', // Required for EIP-7702 (either privateKey or viemLocalAcocunt)
  bundlerApiKey: 'your-bundler-api-key',
  walletMode: 'delegatedEoa',
});

// Check if EOA is delegated to a smart account
const isDelegated = await kit.isDelegateSmartAccountToEoa(137);
console.log('Is EOA delegated:', isDelegated);

// Delegate EOA to smart account (if not already delegated)
if (!isDelegated) {
  const delegationResult = await kit.delegateSmartAccountToEoa({
    chainId: 137,
    delegateImmediately: true, // Set to false to get the authorization object and not execute
  });

  console.log('Delegation result:', delegationResult);
  console.log('EOA Address:', delegationResult.eoaAddress);
  console.log('Delegate Address:', delegationResult.delegateAddress);
  console.log('Already installed:', delegationResult.isAlreadyInstalled);
}

// Send transactions using delegated EOA
const sendWithDelegatedEoa = async () => {
  const transaction = kit
    .transaction({
      to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      value: '1000000000000000000', // 1 ETH
      chainId: 137,
    })
    .name({ transactionName: 'delegated-tx' });

  const result = await transaction.send();

  if (result.isSentSuccessfully) {
    console.log('🎉 Delegated EOA transaction sent!');
    console.log('UserOp Hash:', result.userOpHash);
  }
};

// Remove delegation (if needed)
const removeDelegation = async () => {
  const undelegationResult = await kit.undelegateSmartAccountToEoa({
    chainId: 137,
    delegateImmediately: true, // Set to false to get the authorization object and not execute
  });

  console.log('Undelegation result:', undelegationResult);
};
```

### Using the authorization parameter (delegatedEoa mode)

You can perform EOA delegation and a transaction atomically by passing a freshly signed authorization to `estimate()`, `send()`, `estimateBatches()`, or `sendBatches()`.

#### Single Transaction Example

```typescript
// 1) Get a signed authorization without executing the installation
const { authorization } = await kit.delegateSmartAccountToEoa({
  chainId: 137,
  delegateImmediately: false,
});

if (!authorization) {
  // Already delegated, proceed without the authorization parameter
}

// 2) Create and name a transaction on the SAME chain as authorization.chainId
kit
  .transaction({
    to: '0x000000000000000000000000000000000000dEaD',
    value: '100000000000000',
    chainId: authorization?.chainId ?? 137,
  })
  .name({ transactionName: 'txWithAuth' });

// 3) Estimate or send by passing the authorization (delegation will be executed within the UserOp)
const named = kit.name({ transactionName: 'txWithAuth' });
const estimate = await named.estimate({ authorization });
const result = await named.send({ authorization });
```

#### Batch Example

```typescript
// 1) Get a signed authorization without executing the installation
const { authorization } = await kit.delegateSmartAccountToEoa({
  chainId: 137,
  delegateImmediately: false,
});

if (!authorization) {
  // Already delegated, proceed without the authorization parameter
}

// 2) Create transactions on the SAME chain as authorization.chainId
kit
  .transaction({
    to: '0x000000000000000000000000000000000000dEaD',
    value: '100000000000000',
    chainId: authorization?.chainId ?? 137,
  })
  .name({ transactionName: 'batch-tx1' })
  .addToBatch({ batchName: 'auth-batch' });

kit
  .transaction({
    to: '0x000000000000000000000000000000000000beef',
    value: '200000000000000',
    chainId: authorization?.chainId ?? 137,
  })
  .name({ transactionName: 'batch-tx2' })
  .addToBatch({ batchName: 'auth-batch' });

// 3) Estimate or send batches by passing the authorization (delegation will be executed within the UserOp)
const estimate = await kit.estimateBatches({ authorization });
const result = await kit.sendBatches({ authorization });
```

Notes:

- The `authorization` must match the transaction `chainId` and Kernel v3.3 implementation.
- For multi-chain batches, the `authorization` will only be applied to chain groups matching the authorization's `chainId`.
- `authorization` is only supported in `delegatedEoa` mode; using it in `modular` mode will cause validation errors.
- If the EOA is already delegated, `authorization` is not required.

### Multi-Chain Batch Operations

Enhanced batch operations with chain-based grouping:

```typescript
// Create transactions across multiple chains
const multiChainBatches = async () => {
  // Ethereum transaction
  kit
    .transaction({
      to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      value: '1000000000000000000', // 1 ETH
      chainId: 1, // Ethereum
    })
    .name({ transactionName: 'eth-tx' })
    .addToBatch({ batchName: 'multi-chain-batch' });

  // Polygon transaction
  kit
    .transaction({
      to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      value: '500000000000000000', // 0.5 ETH
      chainId: 137, // Polygon
    })
    .name({ transactionName: 'poly-tx' })
    .addToBatch({ batchName: 'multi-chain-batch' });

  // Estimate costs across all chains
  const estimates = await kit.estimateBatches();
  console.log('Multi-chain estimates:', estimates);

  // Send batches (automatically grouped by chain)
  const result = await kit.sendBatches();

  if (result.isSentSuccessfully) {
    console.log('🎉 Multi-chain batch sent successfully!');
    Object.entries(result.batches).forEach(([batchName, batchResult]) => {
      console.log(`Batch "${batchName}":`, batchResult.userOpHash);
    });
  }
};
```

## 🔧 Configuration Options

TransactionKit supports two wallet modes to suit different use cases:

### Modular Mode (Default)

Smart account functionality with Etherspot's Modular SDK:

```typescript
const kit = TransactionKit({
  provider: yourWalletProvider, // Required: Your wallet provider
  chainId: 137, // Required: Default chain ID
  bundlerApiKey: 'your-api-key', // Optional: For better performance
  bundlerUrl: 'https://your-bundler-url.com', // Optional: Custom bundler URL
  bundlerApiKeyFormat: '?api-key=', // Optional: API key format (default: '?api-key=')
  debugMode: false, // Optional: Enable debug logging
  walletMode: 'modular', // Optional: Default wallet mode
});
```

### Delegated EOA Mode (EIP-7702)

Advanced EIP-7702 functionality with delegated Externally Owned Accounts:

```typescript
const kit = TransactionKit({
  chainId: 137, // Required: Default chain ID
  privateKey: '0x...your-private-key...', // Required for EIP-7702 (either privateKey or viemLocalAcocunt)
  bundlerApiKey: 'your-api-key', // Optional: For better performance
  bundlerUrl: 'https://your-bundler-url.com', // Optional: Custom bundler URL
  bundlerApiKeyFormat: '?api-key=', // Optional: API key format (default: '?api-key=')
  debugMode: false, // Optional: Enable debug logging
  walletMode: 'delegatedEoa', // Required: Delegated EOA mode
});
```

**Note**: In delegated EOA mode, you don't need to provide a `provider`. You can provide either a `privateKey` or an `viemLocalAcocunt` (a `LocalAccount` from viem) directly, but not both. The `viemLocalAcocunt` option is useful when you already have a `LocalAccount` object and want to bypass the `privateKey` conversion.

### Wallet Mode Comparison

| Feature                                | Modular Mode             | Delegated EOA Mode                             |
| -------------------------------------- | ------------------------ | ---------------------------------------------- |
| **Account Type**                       | Etherspot Smart Account  | EIP-7702 Delegated EOA                         |
| **Provider Required**                  | ✅ Yes (wallet provider) | ❌ No (uses privateKey or viemLocalAcocunt)    |
| **Private Key/Owner Account Required** | ❌ No                    | ✅ Yes (either privateKey or viemLocalAcocunt) |
| **Client-Side Safe**                   | ✅ Yes                   | ⚠️ Depends on private key/account handling     |
| **Paymaster Support**                  | ✅ Full support          | ⚠️ Not yet supported                           |
| **UserOp Overrides**                   | ✅ Supported             | ⚠️ Not yet supported                           |
| **EIP-7702 Methods**                   | ❌ Not available         | ✅ Yes                                         |
| **Modular SDK Integration**            | ✅ Yes                   | ❌ No                                          |
| **ZeroDev Integration**                | ❌ No                    | ✅ Yes integration                             |

### Advanced Bundler Configuration

TransactionKit includes a `BundlerConfig` class for flexible bundler URL management:

```typescript
import { BundlerConfig } from '@etherspot/transaction-kit';

// Basic bundler config with API key
const bundlerConfig = new BundlerConfig(
  137, // chainId
  'your-api-key' // API key
);
console.log('Bundler URL:', bundlerConfig.url);

// Custom bundler URL with API key
const customBundlerConfig = new BundlerConfig(
  137,
  'your-api-key',
  'https://your-custom-bundler.com', // custom URL
  '?apikey=' // custom API key format
);

// Different API key formats
const pathFormat = new BundlerConfig(
  137,
  'your-api-key',
  'https://bundler.example.com',
  '/api-key/' // Results in: https://bundler.example.com/api-key/your-api-key
);

const queryFormat = new BundlerConfig(
  137,
  'your-api-key',
  'https://bundler.example.com',
  '&key=' // Results in: https://bundler.example.com&key=your-api-key
);
```

### Client Management

Access underlying clients for advanced operations:

```typescript
// Get viem clients (delegatedEoa mode only)
if (kit.getEtherspotProvider().getWalletMode() === 'delegatedEoa') {
  const publicClient = await kit.getPublicClient(137);
  const walletClient = await kit.getWalletClient(137);
  const bundlerClient = await kit.getBundlerClient(137);

  // Get account instances (delegatedEoa mode only)
  const delegatedEoaAccount = await kit.getDelegatedEoaAccount(137);
  const viemLocalAcocunt = await kit.getOwnerAccount(137);
}

// Get transaction hash from userOp hash (available in both modes)
const txHash = await kit.getTransactionHash(
  '0x123...userOpHash',
  137, // txChainId
  30000, // timeout (optional)
  1000 // retry interval (optional)
);
```

## 🛠️ Available Methods

### Core Methods

- `transaction()` - Create a new transaction
- `name()` - Name a transaction for later reference
- `batch()` - Create a batch for multiple transactions
- `addToBatch()` - Add a transaction to a batch

### Execution Methods

- `estimate()` - Estimate transaction cost
- `send()` - Send a single transaction
- `estimateBatches()` - Estimate batch costs with multi-chain support
- `sendBatches()` - Send all batches with chain grouping

### EIP-7702 Delegation Methods (delegatedEoa mode only)

- `isDelegateSmartAccountToEoa()` - Check if EOA is delegated to a smart account
- `delegateSmartAccountToEoa()` - Delegate EOA to smart account
- `undelegateSmartAccountToEoa()` - Remove EOA delegation

When calling `delegateSmartAccountToEoa({ delegateImmediately: false })`, the method returns an `authorization` object that can be passed to `estimate({ authorization })`, `send({ authorization })`, `estimateBatches({ authorization })`, and `sendBatches({ authorization })` for atomic delegation-and-execution flows.

### Client Management Methods (delegatedEoa mode only)

- `getPublicClient()` - Get viem PublicClient for a chain
- `getBundlerClient()` - Get bundler client for account abstraction
- `getWalletClient()` - Get viem WalletClient for a chain

### Account Management Methods (delegatedEoa mode only)

- `getDelegatedEoaAccount()` - Get delegated EOA account instance
- `getOwnerAccount()` - Get the owner EOA account

### Utility Methods

- `getWalletAddress()` - Get your wallet address
- `getTransactionHash()` - Get transaction hash from userOp hash
- `getState()` - Get current kit state
- `setDebugMode()` - Enable/disable debug logging
- `reset()` - Clear all transactions and batches
- `getProvider()` - Get the underlying EtherspotProvider instance
- `getEtherspotProvider()` - Get the EtherspotProvider instance directly
- `getSdk()` - Get the Modular SDK instance for a specific chain (modular mode only)
- `remove()` - Remove a named transaction or batch
- `update()` - Update an existing named transaction or batched transaction

## 🔒 Security Considerations

### Private Key and Owner Account Handling in Delegated EOA Mode

When using `walletMode: 'delegatedEoa'`, you must provide either a `privateKey` or an `viemLocalAcocunt` (LocalAccount from viem). Here are important security considerations:

**⚠️ Never expose private keys or owner accounts in client-side code or logs!**

```typescript
// ❌ BAD: Hardcoded private key
const kit = TransactionKit({
  privateKey: '0x1234567890abcdef...', // NEVER DO THIS!
  walletMode: 'delegatedEoa',
});

// ✅ GOOD: Use environment variables
const kit = TransactionKit({
  privateKey: process.env.PRIVATE_KEY, // Server-side only
  walletMode: 'delegatedEoa',
});

// ✅ GOOD: Use secure key management (works with both privateKey and viemLocalAcocunt)
const kit = TransactionKit({
  privateKey: await getSecurePrivateKey(), // From secure storage
  walletMode: 'delegatedEoa',
});
```

**Best Practices:**

1. **Private Key/Owner Account Security**: Handle private keys and owner accounts securely - never hardcode them in client-side code
2. **Environment Variables**: Store private keys in environment variables, never in code
3. **Key Rotation**: Regularly rotate private keys for enhanced security
4. **Access Control**: Implement proper access controls around private key and owner account usage
5. **Audit Logging**: Log all transactions for security auditing
6. **Secure Storage**: Use hardware security modules (HSM) or secure key management services for production
7. **Owner Account Usage**: When using `viemLocalAcocunt`, ensure the underlying private key is handled securely

### Important Limitations & Considerations

#### Delegated EOA Mode Limitations

- **Paymaster Support**: Currently not supported in delegated EOA mode
- **UserOp Overrides**: Custom userOp overrides are not yet supported
- **Private Key/Owner Account Security**: Requires careful private key or owner account handling
- **ZeroDev Dependency**: Requires `@zerodev/sdk` package

#### Modular Mode Limitations

- **Provider Required**: Must provide a wallet provider
- **No EIP-7702**: EIP-7702 delegation methods are not available
- **Modular SDK Dependency**: Requires `@etherspot/modular-sdk` package

#### General Considerations

- **Multi-Chain UX Warning**: In modular mode, batches with multiple chainIds require multiple user signatures (one per chain)

### Network Support

TransactionKit includes comprehensive network constants and supports multiple blockchain networks:

```typescript
// Access network configurations
import { getNetworkConfig } from '@etherspot/transaction-kit';

// Get network configuration for a specific chain
const networkConfig = getNetworkConfig(137); // Polygon
console.log('Chain ID:', networkConfig.chainId);
console.log('Bundler/RPC:', networkConfig.bundler); // Etherspot bundler endpoint
console.log('Chain Object:', networkConfig.chain); // viem Chain object
console.log('Entry Point:', networkConfig.contracts.entryPoint);
console.log('Wallet Factory:', networkConfig.contracts.walletFactory);
```

The library automatically handles network-specific configurations for Etherspot bundler endpoints, smart contract addresses, and viem chain objects.

## 🤝 Contributing

We love contributions! Whether it's fixing a bug, adding a feature, or improving the documentation, every contribution is welcome. Check out our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Need Help?

- 📖 [Documentation](https://github.com/etherspot/transaction-kit)
- 🐛 [Report a Bug](https://github.com/etherspot/transaction-kit/issues)
- 💡 [Request a Feature](https://github.com/etherspot/transaction-kit/issues)
- 💬 [Join our Community](https://discord.gg/etherspot)

---

**Made with ❤️ by the Etherspot team**

_Now go forth and build amazing things! The blockchain is your oyster! 🦪_
