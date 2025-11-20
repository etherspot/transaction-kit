/**
 * Example: Demonstrating signMessage with EIP-6492 for EIP-7702 Wallets
 * 
 * This example shows how to use the signMessage function with:
 * 1. Non-delegated EOA (before EIP-7702 delegation)
 * 2. Delegated EOA (after EIP-7702 delegation)
 * 
 * Prerequisites:
 * - Set up environment variables (see .env.example)
 * - Install dependencies: npm install
 * - Run: npx ts-node src/signMessage-example.ts
 */

import { TransactionKit } from '@etherspot/transaction-kit';
import { parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const PRIVATE_KEY = process.env.REACT_APP_DEMO_WALLET_PK || process.env.PRIVATE_KEY || '0x' + '0'.repeat(64);
const BUNDLER_URL = process.env.REACT_APP_BUNDLER_URL || process.env.BUNDLER_URL || 'https://api.etherspot.io/v2';
const BUNDLER_API_KEY = process.env.REACT_APP_ETHERSPOT_BUNDLER_API_KEY || process.env.BUNDLER_API_KEY || '';
const CHAIN_ID = parseInt(process.env.REACT_APP_CHAIN_ID || process.env.CHAIN_ID || '11155111'); // Sepolia

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function logInfo(label: string, value: string | number | boolean) {
  log(`${label}:`, 'cyan');
  console.log(`  ${value}\n`);
}

/**
 * Verify EIP-6492 signature format
 */
function verifyEIP6492Format(signature: string): boolean {
  if (!signature.startsWith('0x6492')) {
    return false;
  }
  if (signature.length < 140) {
    // Minimum: 0x6492 (4) + signature (130) + some deployment data
    return false;
  }
  return true;
}

/**
 * Extract signature components from EIP-6492 format
 */
function extractSignatureComponents(eip6492Signature: string) {
  const withoutPrefix = eip6492Signature.slice(2); // Remove '0x'
  const magicPrefix = withoutPrefix.slice(0, 4); // '6492'
  const signature = '0x' + withoutPrefix.slice(4, 134); // 65 bytes = 130 hex chars
  const deploymentData = '0x' + withoutPrefix.slice(134);
  
  return {
    magicPrefix,
    signature,
    deploymentData,
    signatureLength: signature.length,
    deploymentDataLength: deploymentData.length,
  };
}

/**
 * Example 1: Sign message with non-delegated EOA
 */
async function example1_NonDelegatedEOA() {
  logSection('Example 1: Sign Message with Non-Delegated EOA');

  try {
    // Initialize TransactionKit with delegatedEoa mode
    const transactionKit = TransactionKit({
      chainId: CHAIN_ID,
      walletMode: 'delegatedEoa',
      privateKey: PRIVATE_KEY,
      bundlerUrl: BUNDLER_URL,
      bundlerApiKey: BUNDLER_API_KEY,
      debugMode: true,
    });

    logInfo('Wallet Mode', 'delegatedEoa');
    logInfo('Chain ID', CHAIN_ID);

    // Get wallet address
    const walletAddress = await transactionKit.getWalletAddress();
    logInfo('EOA Address', walletAddress || 'N/A');

    // Check if EOA is already delegated
    const isDelegated = await transactionKit.isDelegateSmartAccountToEoa();
    logInfo('Is Delegated', isDelegated ? 'Yes' : 'No');

    if (isDelegated) {
      log('⚠️  EOA is already delegated. This example shows non-delegated behavior.', 'yellow');
      log('   Consider using Example 2 for delegated EOA scenarios.\n', 'yellow');
    }

    // Sign a message
    const message = 'Hello, World! This is a test message.';
    logInfo('Message to Sign', message);

    log('Signing message...', 'blue');
    const signature = await transactionKit.signMessage(message, CHAIN_ID);

    // Verify signature format
    const isValidFormat = verifyEIP6492Format(signature);
    logInfo('EIP-6492 Format Valid', isValidFormat ? '✓ Yes' : '✗ No');

    if (isValidFormat) {
      const components = extractSignatureComponents(signature);
      logInfo('Magic Prefix', `0x${components.magicPrefix}`);
      logInfo('Signature (first 20 chars)', `${components.signature.slice(0, 22)}...`);
      logInfo('Signature Length', `${components.signatureLength} chars`);
      logInfo('Deployment Data Length', `${components.deploymentDataLength} chars`);
      logInfo('Total Signature Length', `${signature.length} chars`);
    }

    logInfo('Full Signature', signature);

    log('✓ Example 1 completed successfully!', 'green');
    return signature;
  } catch (error: any) {
    log(`✗ Example 1 failed: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

/**
 * Example 2: Sign message with delegated EOA
 */
async function example2_DelegatedEOA() {
  logSection('Example 2: Sign Message with Delegated EOA');

  try {
    // Initialize TransactionKit with delegatedEoa mode
    const transactionKit = TransactionKit({
      chainId: CHAIN_ID,
      walletMode: 'delegatedEoa',
      privateKey: PRIVATE_KEY,
      bundlerUrl: BUNDLER_URL,
      bundlerApiKey: BUNDLER_API_KEY,
      debugMode: true,
    });

    logInfo('Wallet Mode', 'delegatedEoa');
    logInfo('Chain ID', CHAIN_ID);

    // Get wallet address
    const walletAddress = await transactionKit.getWalletAddress();
    logInfo('EOA Address', walletAddress || 'N/A');

    // Check if EOA is already delegated
    let isDelegated = await transactionKit.isDelegateSmartAccountToEoa();
    logInfo('Is Delegated (Before)', isDelegated ? 'Yes' : 'No');

    // If not delegated, delegate it first
    if (!isDelegated) {
      log('Delegating EOA to smart account...', 'blue');
      const delegateResult = await transactionKit.delegateSmartAccountToEoa({
        chainId: CHAIN_ID,
        delegateImmediately: true, // Execute immediately
      });

      logInfo('Delegation Status', delegateResult.isAlreadyInstalled ? 'Already Installed' : 'Newly Installed');
      logInfo('EOA Address', delegateResult.eoaAddress);
      logInfo('Delegate Address', delegateResult.delegateAddress);
      
      if (delegateResult.userOpHash) {
        logInfo('UserOp Hash', delegateResult.userOpHash);
      }

      // Wait a bit for the transaction to be mined
      log('Waiting for delegation to be confirmed...', 'blue');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check again
      isDelegated = await transactionKit.isDelegateSmartAccountToEoa();
      logInfo('Is Delegated (After)', isDelegated ? 'Yes' : 'No');
    }

    // Sign a message with the delegated EOA
    const message = 'This message is signed by a delegated EOA!';
    logInfo('Message to Sign', message);

    log('Signing message with delegated EOA...', 'blue');
    const signature = await transactionKit.signMessage(message, CHAIN_ID);

    // Verify signature format
    const isValidFormat = verifyEIP6492Format(signature);
    logInfo('EIP-6492 Format Valid', isValidFormat ? '✓ Yes' : '✗ No');

    if (isValidFormat) {
      const components = extractSignatureComponents(signature);
      logInfo('Magic Prefix', `0x${components.magicPrefix}`);
      logInfo('Signature (first 20 chars)', `${components.signature.slice(0, 22)}...`);
      logInfo('Signature Length', `${components.signatureLength} chars`);
      logInfo('Deployment Data Length', `${components.deploymentDataLength} chars`);
      logInfo('Total Signature Length', `${signature.length} chars`);
    }

    logInfo('Full Signature', signature);

    log('✓ Example 2 completed successfully!', 'green');
    return signature;
  } catch (error: any) {
    log(`✗ Example 2 failed: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

/**
 * Example 3: Compare signatures from different states
 */
async function example3_CompareSignatures() {
  logSection('Example 3: Compare Signatures from Different States');

  try {
    const transactionKit = TransactionKit({
      chainId: CHAIN_ID,
      walletMode: 'delegatedEoa',
      privateKey: PRIVATE_KEY,
      bundlerUrl: BUNDLER_URL,
      bundlerApiKey: BUNDLER_API_KEY,
      debugMode: false,
    });

    const message = 'Same message, different states';
    logInfo('Message', message);

    // Sign before delegation (if not already delegated)
    const isDelegated = await transactionKit.isDelegateSmartAccountToEoa();
    
    let signatureBefore: string | null = null;
    let signatureAfter: string | null = null;

    if (!isDelegated) {
      log('Signing before delegation...', 'blue');
      signatureBefore = await transactionKit.signMessage(message, CHAIN_ID);
      if (signatureBefore) {
        logInfo('Signature Before Delegation', signatureBefore.slice(0, 50) + '...');
      }

      // Delegate
      log('Delegating...', 'blue');
      await transactionKit.delegateSmartAccountToEoa({
        chainId: CHAIN_ID,
        delegateImmediately: true,
      });

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Sign after delegation
    log('Signing after delegation...', 'blue');
    signatureAfter = await transactionKit.signMessage(message, CHAIN_ID);
    if (signatureAfter) {
      logInfo('Signature After Delegation', signatureAfter.slice(0, 50) + '...');
    }

    if (signatureBefore !== null && signatureAfter !== null) {
      const areSame = signatureBefore === signatureAfter;
      logInfo('Signatures Match', areSame ? 'Yes' : 'No');
      
      if (!areSame) {
        log('Note: Signatures differ because deployment data may change.', 'yellow');
      }
    } else {
      log('Note: Could not compare signatures - one or both signatures are null.', 'yellow');
    }

    log('✓ Example 3 completed successfully!', 'green');
  } catch (error: any) {
    log(`✗ Example 3 failed: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

/**
 * Example 4: Sign different types of messages
 */
async function example4_DifferentMessageTypes() {
  logSection('Example 4: Sign Different Types of Messages');

  try {
    const transactionKit = TransactionKit({
      chainId: CHAIN_ID,
      walletMode: 'delegatedEoa',
      privateKey: PRIVATE_KEY,
      bundlerUrl: BUNDLER_URL,
      bundlerApiKey: BUNDLER_API_KEY,
      debugMode: false,
    });

    const messages = [
      'Simple text message',
      '0x48656c6c6f', // Hex string
      'Message with special chars: !@#$%^&*()',
      'Very long message: ' + 'x'.repeat(100),
    ];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      log(`\nSigning message ${i + 1}:`, 'blue');
      logInfo('Message', message.length > 50 ? message.slice(0, 50) + '...' : message);
      
      const signature = await transactionKit.signMessage(message, CHAIN_ID);
      const isValid = verifyEIP6492Format(signature);
      
      logInfo('Valid EIP-6492', isValid ? '✓ Yes' : '✗ No');
      logInfo('Signature', signature.slice(0, 50) + '...');
    }

    log('\n✓ Example 4 completed successfully!', 'green');
  } catch (error: any) {
    log(`✗ Example 4 failed: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('EIP-6492 signMessage Example for EIP-7702 Wallets', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  logInfo('Configuration', '');
  logInfo('  Chain ID', CHAIN_ID);
  logInfo('  Bundler URL', BUNDLER_URL);
  logInfo('  Bundler API Key', BUNDLER_API_KEY ? 'Set' : 'Not Set');

  // Validate private key
  if (PRIVATE_KEY === '0x' + '0'.repeat(64)) {
    log('\n⚠️  WARNING: Using default private key. Set PRIVATE_KEY in .env file!', 'yellow');
  }

  try {
    // Run examples
    await example1_NonDelegatedEOA();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await example2_DelegatedEOA();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await example3_CompareSignatures();
    await new Promise(resolve => setTimeout(resolve, 2000));

    await example4_DifferentMessageTypes();

    log('\n' + '='.repeat(60), 'bright');
    log('All examples completed successfully!', 'green');
    log('='.repeat(60) + '\n', 'bright');
  } catch (error: any) {
    log('\n' + '='.repeat(60), 'red');
    log('Examples failed!', 'red');
    log('='.repeat(60) + '\n', 'red');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export {
  example1_NonDelegatedEOA,
  example2_DelegatedEOA,
  example3_CompareSignatures,
  example4_DifferentMessageTypes,
};

