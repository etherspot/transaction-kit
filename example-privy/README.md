# Transaction Kit + Privy Example

This is a simple example application demonstrating how to use the Transaction Kit with Privy for wallet management and transaction handling.

## Features

- **Wallet Connection**: Connect using Privy (email or wallet)
- **Transaction Creation**: Create simple ETH transfer transactions
- **Transaction Estimation**: Estimate gas costs before sending
- **Transaction Sending**: Send transactions using Account Abstraction
- **Real-time Logs**: View transaction activity and state changes
- **Clean UI**: Modern Material-UI interface

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables** (optional):
   Create a `.env` file in the root directory:
   ```bash
   REACT_APP_ETHERSPOT_BUNDLER_API_KEY=your_bundler_api_key_here
   ```

3. **Start the Application**:
   ```bash
   npm start
   ```

## How It Works

1. **Connect Wallet**: Use Privy to connect your wallet or create an account
2. **Create Transaction**: Enter recipient address and amount
3. **Estimate**: Get gas cost estimation before sending
4. **Send**: Execute the transaction using Account Abstraction

## Architecture

- **Privy**: Handles wallet connection and authentication
- **Transaction Kit**: Manages transaction creation, estimation, and sending
- **Material-UI**: Provides the user interface components
- **Account Abstraction**: Enables gasless transactions and better UX
- **Viem**: Modern Ethereum utilities for parsing values and other operations

## Supported Networks

- Polygon (Chain ID: 137)

## Dependencies

- `@privy-io/react-auth`: Wallet connection and authentication
- `@etherspot/transaction-kit`: Transaction management
- `@mui/material`: UI components
- `viem`: Modern Ethereum utilities (replaces ethers)

## Notes

- This example uses the Privy App ID: `clp8ojcbo008fl40f32m28tl5`
- Transactions are sent using Account Abstraction (ERC-4337)
- The app automatically initializes TransactionKit when a wallet is connected
- All transaction states and logs are displayed in real-time
- Uses Viem instead of ethers for better TypeScript support and modern APIs 