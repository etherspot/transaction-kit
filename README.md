# 🚀 TransactionKit

> **The framework-agnostic Etherspot Transaction Kit that makes blockchain transactions feel like a walk in the park! 🌳**

Ever felt like blockchain transactions were more complex than explaining quantum physics to a cat? Well, fret no more! TransactionKit is here to turn your transaction woes into smooth sailing. Built on top of Etherspot's Modular SDK, this library brings you a delightful, method-chained API that makes sending transactions as easy as ordering coffee. ☕

## ✨ What Makes TransactionKit Special?

- **🔗 Method Chainable**: Fluent API that reads like poetry
- **🌳 Tree Shakeable**: Only bundle what you actually use - your users will thank you
- **🎯 Framework Agnostic**: Works with React, Vue, vanilla JS, or whatever floats your boat
- **⚡ TypeScript First**: Full type safety with beautiful IntelliSense
- **🛡️ Error Handling**: Graceful error handling that won't make you pull your hair out
- **📦 Batch Support**: Send multiple transactions in one go - efficiency is key!
- **🔧 Debug Mode**: When things go sideways, we've got your back with detailed logging

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

### Basic Transaction Sending

Here's how to send a simple transaction - it's easier than making toast! 🍞

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

### Batch Transactions

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
      })
      .name({ transactionName: 'tx1' })
      .addToBatch({ batchName: 'my-batch' });

    // Second transaction
    kit
      .transaction({
        to: '0x1234567890123456789012345678901234567890',
        value: '300000000000000000', // 0.3 ETH
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

### Advanced Usage

```typescript
// Update existing transactions
const updateTransaction = () => {
  const namedTx = kit.name({ transactionName: 'my-tx' });

  // Update the transaction details
  namedTx
    .transaction({
      to: '0xNewAddress123456789012345678901234567890',
      value: '2000000000000000000', // 2 ETH
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

## 🔧 Configuration Options

```typescript
const kit = TransactionKit({
  provider: yourWalletProvider, // Required: Your wallet provider
  chainId: 137, // Required: Default chain ID
  bundlerApiKey: 'your-api-key', // Optional: For better performance
  debugMode: false, // Optional: Enable debug logging
});
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
- `estimateBatches()` - Estimate batch costs
- `sendBatches()` - Send all batches

### Utility Methods

- `getWalletAddress()` - Get your wallet address
- `getState()` - Get current kit state
- `setDebugMode()` - Enable/disable debug logging
- `reset()` - Clear all transactions and batches
- `getProvider()` - Get the underlying EtherspotProvider instance
- `getSdk()` - Get the Modular SDK instance for a specific chain
- `remove()` - Remove a named transaction or batch
- `update()` - Update an existing named transaction or batched transaction

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
