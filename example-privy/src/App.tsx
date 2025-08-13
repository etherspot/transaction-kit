import { WalletProviderLike } from '@etherspot/modular-sdk';
import { TransactionKit } from '@etherspot/transaction-kit';
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback, useEffect, useState } from 'react';
import { createWalletClient, custom } from 'viem';
import { polygon } from 'viem/chains';

// Create a single, stable TransactionKit instance (like the working example)
let kit: ReturnType<typeof TransactionKit> | null = null;

// Safe JSON serialization that handles BigInt values
const safeStringify = (obj: any): string => {
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    },
    2
  );
};

const AppContent = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [amount, setAmount] = useState('0.001');
  const [toAddress, setToAddress] = useState(
    '0x000000000000000000000000000000000000dead'
  );
  const [smartAccountAddress, setSmartAccountAddress] = useState<string>('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const logMessage = useCallback((message: string) => {
    setMessages((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  }, []);

  // Initialize TransactionKit when wallet is connected
  useEffect(() => {
    if (wallets.length === 0 || !authenticated) return;

    const wallet = wallets[0];
    if (!wallet || !wallet.address) return;

    const initializeKit = async () => {
      try {
        logMessage('Initializing TransactionKit...');

        // Only create TransactionKit if it doesn't exist
        if (!kit) {
          // Get the Web3.js provider from Privy
          const web3Provider = await wallet.getEthereumProvider();

          // Create viem client using EXACT same pattern as working example
          const client = createWalletClient({
            account: wallet.address as `0x${string}`,
            chain: polygon,
            transport: custom(web3Provider), // Same as working example: custom(window.ethereum!)
          });

          kit = TransactionKit({
            provider: client as WalletProviderLike, // Same as working example
            chainId: 137, // Polygon
            bundlerApiKey: process.env.REACT_APP_ETHERSPOT_BUNDLER_API_KEY,
          });

          logMessage(
            `TransactionKit initialized with wallet: ${wallet.address}`
          );
          logMessage(`Using EXACT same pattern as working example`);

          // Get the Smart Account address
          kit
            .getWalletAddress(137)
            .then((address) => {
              if (address) {
                setSmartAccountAddress(address);
                logMessage(`Smart Account address: ${address}`);
              }
            })
            .catch((error) => {
              logMessage(
                `Error getting Smart Account address: ${error.message}`
              );
            });
        } else {
          logMessage('TransactionKit already initialized, skipping recreation');
        }
      } catch (error: any) {
        logMessage(
          `Error initializing TransactionKit: ${error.message || error}`
        );
      }
    };

    initializeKit();
  }, [wallets, authenticated, logMessage]);

  const createTransaction = useCallback(async () => {
    if (!kit) {
      logMessage('TransactionKit not initialized');
      return;
    }

    try {
      setIsLoading(true);
      logMessage('Creating transaction...');

      const amountInWei = BigInt(parseFloat(amount) * 10 ** 18);
      logMessage(`Amount in wei: ${amountInWei.toString()}`);

      // Create transaction using the kit (exactly like working example)
      kit.transaction({
        to: toAddress,
        value: amountInWei.toString(),
        chainId: 137,
      });

      // Name the transaction
      kit.name({ transactionName: 'tx1' });

      logMessage(`Transaction object created`);
      logMessage(`Transaction named as tx1`);
      logMessage(`Transaction created: ${amount} MATIC to ${toAddress}`);

      // Get current state
      const state = kit.getState();
      logMessage(
        `Current state after creation: ${JSON.stringify(state, null, 2)}`
      );
    } catch (error: any) {
      logMessage(`Error creating transaction: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  }, [amount, toAddress, logMessage]);

  const estimateTransaction = useCallback(async () => {
    if (!kit) {
      logMessage('TransactionKit not initialized');
      return;
    }

    try {
      setIsLoading(true);
      logMessage('Starting transaction estimation...');

      // Debug: Check provider state before estimation
      logMessage(`=== DEBUG: Provider State Before Estimation ===`);
      try {
        const etherspotProvider = kit.getEtherspotProvider();
        const provider = etherspotProvider.getProvider();
        logMessage(`Provider before estimation: ${safeStringify(provider)}`);
        logMessage(`Provider type: ${typeof provider}`);
        logMessage(
          `Provider has request: ${typeof (provider as any)?.request === 'function'}`
        );
      } catch (error: any) {
        logMessage(
          `ERROR getting provider before estimation: ${error.message}`
        );
      }
      logMessage(`=== END DEBUG ===`);

      // Get the named transaction
      const namedTx = kit.name({ transactionName: 'tx1' });
      logMessage('Transaction named for estimation, now estimating...');

      // Estimate the transaction
      const result = await namedTx.estimate();
      logMessage(`Estimation result: ${safeStringify(result)}`);

      if (result.isEstimatedSuccessfully) {
        logMessage(`Estimation successful! Cost: ${result.cost}`);

        // Debug: Check provider state after successful estimation
        logMessage(`=== DEBUG: Provider State After Estimation ===`);
        try {
          const etherspotProvider = kit.getEtherspotProvider();
          const provider = etherspotProvider.getProvider();
          logMessage(`Provider after estimation: ${safeStringify(provider)}`);
        } catch (error: any) {
          logMessage(
            `ERROR getting provider after estimation: ${error.message}`
          );
        }
        logMessage(`=== END DEBUG ===`);
      } else {
        logMessage(`Estimation failed: ${result.errorMessage}`);
      }
    } catch (error: any) {
      logMessage(`Error estimating transaction: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  }, [logMessage]);

  const sendTransaction = useCallback(async () => {
    if (!kit) {
      logMessage('TransactionKit not initialized');
      return;
    }

    try {
      setIsLoading(true);
      logMessage('Starting transaction send process...');

      // Debug: Check Privy authentication state before sending
      logMessage(`=== DEBUG: Privy Authentication State ===`);
      logMessage(`Authenticated: ${authenticated}`);
      logMessage(`Wallet address: ${wallets[0]?.address}`);
      logMessage(`Wallet connected: ${wallets.length > 0}`);

      // Debug: Check if we can still get the provider
      try {
        const freshProvider = await wallets[0].getEthereumProvider();
        logMessage(`Fresh provider request successful: ${!!freshProvider}`);
        logMessage(
          `Provider has request method: ${typeof freshProvider.request === 'function'}`
        );
      } catch (error: any) {
        logMessage(`ERROR getting fresh provider: ${error.message}`);
      }

      // Debug: Check TransactionKit state before sending
      const kitState = kit.getState();
      logMessage(`Kit state before send: ${safeStringify(kitState)}`);

      // Debug: Check provider in EtherspotProvider
      try {
        const etherspotProvider = kit.getEtherspotProvider();
        logMessage(
          `EtherspotProvider config: ${safeStringify(etherspotProvider.getConfig())}`
        );
      } catch (error: any) {
        logMessage(`ERROR getting EtherspotProvider: ${error.message}`);
      }

      logMessage(`=== END DEBUG ===`);

      // Get the named transaction
      const namedTx = kit.name({ transactionName: 'tx1' });
      logMessage('Transaction named successfully, now sending...');

      // Debug: Check provider again right before send
      logMessage(`=== DEBUG: Provider Check Before Send ===`);
      try {
        const etherspotProvider = kit.getEtherspotProvider();
        const provider = etherspotProvider.getProvider();
        logMessage(`Provider from kit: ${safeStringify(provider)}`);
        logMessage(`Provider type: ${typeof provider}`);
        logMessage(
          `Provider has request: ${typeof (provider as any)?.request === 'function'}`
        );
      } catch (error: any) {
        logMessage(`ERROR getting provider from kit: ${error.message}`);
      }
      logMessage(`=== END DEBUG ===`);

      // Send the transaction
      const result = await namedTx.send();
      logMessage(`Send result received: ${safeStringify(result)}`);

      if (result.isSentSuccessfully) {
        logMessage(
          `Transaction sent successfully! UserOp Hash: ${result.userOpHash}`
        );
      } else {
        logMessage(`Transaction failed: ${result.errorMessage}`);
        logMessage(`Error type: ${result.errorType}`);

        // Debug: Check what happened to the provider after the error
        logMessage(`=== DEBUG: Provider State After Error ===`);
        try {
          const etherspotProvider = kit.getEtherspotProvider();
          const provider = etherspotProvider.getProvider();
          logMessage(`Provider after error: ${safeStringify(provider)}`);
        } catch (error: any) {
          logMessage(`ERROR getting provider after error: ${error.message}`);
        }
        logMessage(`=== END DEBUG ===`);
      }
    } catch (error: any) {
      logMessage(`Error sending transaction: ${error.message || error}`);

      // Debug: Check what happened to the provider after the exception
      logMessage(`=== DEBUG: Provider State After Exception ===`);
      try {
        const etherspotProvider = kit.getEtherspotProvider();
        const provider = etherspotProvider.getProvider();
        logMessage(`Provider after exception: ${safeStringify(provider)}`);
      } catch (providerError: any) {
        logMessage(
          `ERROR getting provider after exception: ${providerError.message}`
        );
      }
      logMessage(`=== END DEBUG ===`);
    } finally {
      setIsLoading(false);
    }
  }, [logMessage, authenticated, wallets]);

  const clearLogs = useCallback(() => {
    setMessages([]);
  }, []);

  if (!authenticated) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Privy Transaction Kit Example
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Connect your wallet to get started
          </Typography>
          <Button variant="contained" onClick={login} size="large">
            Connect Wallet
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Privy Transaction Kit Example
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Wallet Info
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connected: {user?.email?.address || 'Unknown'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            EOA Address: {wallets[0]?.address || 'Not connected'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Smart Account: {smartAccountAddress || 'Not available'}
          </Typography>
          <Button variant="outlined" onClick={logout} sx={{ mt: 2 }}>
            Disconnect
          </Button>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Transaction Details
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Amount (MATIC)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              size="small"
            />
            <TextField
              label="To Address"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={createTransaction}
              disabled={isLoading || !kit}
            >
              Create Transaction
            </Button>
            <Button
              variant="contained"
              onClick={estimateTransaction}
              disabled={isLoading || !kit}
            >
              Estimate
            </Button>
            <Button
              variant="contained"
              onClick={sendTransaction}
              disabled={isLoading || !kit}
            >
              Send
            </Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6">Transaction Logs</Typography>
            <Button variant="outlined" onClick={clearLogs} size="small">
              Clear
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {messages.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No logs yet. Create a transaction to see activity.
              </Typography>
            ) : (
              messages.map((message, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message}
                </Typography>
              ))
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

const App = () => {
  return (
    <PrivyProvider
      appId={process.env.REACT_APP_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
      }}
    >
      <AppContent />
    </PrivyProvider>
  );
};

export default App;
