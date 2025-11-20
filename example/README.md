# signMessage Example

This example demonstrates how to use the `signMessage` function with EIP-6492 format for EIP-7702 wallets.

## Features

The example includes four scenarios:

1. **Example 1: Non-Delegated EOA** - Signing messages before EIP-7702 delegation
2. **Example 2: Delegated EOA** - Signing messages after EIP-7702 delegation
3. **Example 3: Compare Signatures** - Comparing signatures from different delegation states
4. **Example 4: Different Message Types** - Signing various message formats (text, hex, special chars, long messages)

## Prerequisites

1. Node.js 18+ installed
2. TypeScript and ts-node installed
3. A private key for testing (use a test account, never use your main account's private key)
4. A bundler API key (optional, but recommended for delegation)

## Setup

1. **Install dependencies** (from example directory):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   
   Create a `.env` file in the `example` directory with:
   ```env
   REACT_APP_DEMO_WALLET_PK=0x...your-private-key...
   REACT_APP_BUNDLER_URL=https://api.etherspot.io/v2
   REACT_APP_ETHERSPOT_BUNDLER_API_KEY=your-api-key
   REACT_APP_CHAIN_ID=11155111
   ```
   
   Or use these alternative env var names:
   ```env
   PRIVATE_KEY=0x...your-private-key...
   BUNDLER_URL=https://api.etherspot.io/v2
   BUNDLER_API_KEY=your-api-key
   CHAIN_ID=11155111
   ```

**⚠️ WARNING**: Never commit your `.env` file or share your private key!

## Running the Example

From the `example` directory:

```bash
# Using ts-node
npx ts-node src/signMessage-example.ts

# Or if ts-node is installed globally
ts-node src/signMessage-example.ts

# Or compile and run
tsc src/signMessage-example.ts --esModuleInterop --module commonjs --target es2020 --outDir dist
node dist/signMessage-example.js
```

## Expected Output

The example will output:

- Wallet address (EOA)
- Delegation status
- EIP-6492 signature format verification
- Signature components breakdown
- Full signature hex string

Example output:
```
============================================================
Example 1: Sign Message with Non-Delegated EOA
============================================================

EOA Address: 0x1234...
Is Delegated: No
Message to Sign: Hello, World! This is a test message.
EIP-6492 Format Valid: ✓ Yes
Magic Prefix: 0x6492
Signature: 0x1234...
Signature Length: 132 chars
Deployment Data Length: 200+ chars
Total Signature Length: 400+ chars
```

## Understanding EIP-6492 Signatures

EIP-6492 signatures have the following format:

```
0x6492<signature><deployment_data>
```

Where:
- `0x6492` - Magic prefix (2 bytes)
- `<signature>` - 65-byte signature (r, s, v) from EIP-191 personal_sign
- `<deployment_data>` - RLP-encoded transaction data for EIP-7702 authorization

## Use Cases

1. **Pre-deployment Signatures**: Sign messages before the smart account is activated
2. **Cross-chain Compatibility**: Signatures work across different chains
3. **Future-proof Signatures**: Signatures remain valid even after delegation changes

## Troubleshooting

### Error: "signMessage() is only available in 'delegatedEoa' wallet mode"
- Make sure `walletMode: 'delegatedEoa'` is set in the configuration

### Error: "Failed to create authorization"
- Check your bundler URL and API key
- Ensure the chain ID is correct
- Verify network connectivity

### Error: "Invalid private key"
- Ensure the private key starts with `0x`
- Check that it's a valid 64-character hex string

## Notes

- This example uses Sepolia testnet by default
- Signatures are deterministic for the same message and state
- Deployment data may change between delegation states
- Always use test accounts for experimentation

## Security

⚠️ **IMPORTANT SECURITY NOTES**:

1. Never use your main account's private key
2. Never commit `.env` files to version control
3. Use testnets for development and testing
4. Keep your private keys secure and never share them

## License

Same as the main project license.
