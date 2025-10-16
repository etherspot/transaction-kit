# Changelog

## [2.1.0] - 2025-01-27

### Added Changes

- **EIP-7702 Support**: Added delegated EOA (Externally Owned Account) functionality with `isDelegateSmartAccountToEoa()`, `delegateSmartAccountToEoa()` and `undelegateSmartAccountToEoa()` methods for EIP-7702 transactions
- **New Wallet Mode**: Introduced `walletMode` configuration with support for both `modular` and `delegatedEoa` modes
- **Enhanced Security**: Added secure configuration management with separate `PrivateConfig` and `PublicConfig` interfaces for sensitive data handling
- **Bundler Configuration**: Added `BundlerConfig` class for flexible bundler URL management with API key support and custom formatting options
- **Client Management**: Added per-chain client management with `getPublicClient()`, `getBundlerClient()`, and `getWalletClient()` methods for efficient multi-chain operations
- **Account Management**: Added `getDelegatedEoaAccount()` and `getOwnerAccount()` methods for EIP-7702 account operations and owner account access
- **Network Constants and Support**: Added comprehensive network constants and supported networks configuration
- **Batch Operations**: Enhanced batch processing with new `estimateBatches()` and `sendBatches()` methods for improved batch transaction handling on multi-chains
- **Batch State Management**: Implemented intelligent batch state cleanup that removes successful chain groups and transactions from internal state after sending
- **Multi-Chain Grouping**: Added chain-based transaction grouping within batches for efficient multi-chain processing and cost tracking
- **ZeroDev Integration**: Added `@zerodev/sdk` dependency for enhanced account abstraction capabilities
- **Viem Update**: Updated `viem` library to version `^2.38.0` for improved compatibility and features

### Breaking Changes

- **Configuration Structure**: Updated configuration interfaces with new security-focused structure separating public and private configurations
- **Dependencies**: Added new `@zerodev/sdk` dependency requirement

## [2.0.3] - 2025-08-22

### Added Changes

- `chainId` is mandatory in the `transaction()` method.
- For `send` and `estimate`, the `etherspotModularSdk` is initialized using the transaction's `chainId` rather than the provider's `chainId`.

## [2.0.2] - 2025-07-24

### Added Changes

- Added `getEtherspotProvider` to access directly the Etherspot Provider.
- Added `getTransactionHash` to get a transaction hash with a userOp Hash and the chain id.
- Update of the `modular-sdk` version to 6.1.1.

## [2.0.1] - 2025-07-17

### Documentation

- **Updated README.md**: Completely rewrote the README with comprehensive examples and better documentation of the library's features including method chaining, tree-shaking, and framework agnostic capabilities.

## [2.0.0] - 2025-07-10

## Breaking Changes

### Architecture Changes

- **Removed dependencies**: `Etherspot Data Utils` and `ethers` library are no longer included
- **Removed React-specific features**: All `React` contexts and hooks have been removed
- **Framework agnostic**: Now compatible with any `JavaScript`/`TypeScript` application (not React-specific)

### Scope Reduction

Transaction Kit now focuses exclusively on transaction management:

**✅ What's included:**

- Creating transactions
- Updating transactions
- Adding/removing transaction batches
- Estimating gas for transactions and batches
- Sending transactions and batches

**❌ What's been removed:**

- Asset management (getting assets, balances, history)
- Module management
- Asset price fetching
- Token and NFT swapping functionality

### API Changes

- **New class-based API**: Replaced component-based architecture with a simplified `TransactionKit()` instance followed by method chaining
- **No UI components**: All React components have been removed
- **Simplified usage**: Just instantiate `TransactionKit()` and chain methods for all transaction operations

### Migration Impact

This is a major version change that significantly reduces the library's scope. If you were using the removed features (assets, balances, swaps, etc.), you'll need to implement these separately or use alternative libraries.

## [1.1.1] - 2025-06-04

### Added Changes

- Added `SendOptions` to the `send()` function, allowing an optional retry mechanism if the `useOp.maxFeePerGas` and `userOp.maxPriorityFeePerGas` are too low.

## [1.1.0] - 2025-05-29

### Added Changes

- Added optional `customChain` to `getSdk`

### Breaking Changes

- Version update of `etherspot-modular` with new wallet factory address

## [1.0.5] - 2025-03-18

### Added Changes

- Replaced `batchId` param with `chainId` in `getTransactionHash` and made it mandatory.

## [1.0.4] - 2025-03-12

### Added Changes

- Remove `transactionHash` to `send()` in `EtherspotTransactionKitContextProvider`.

## [1.0.3] - 2025-03-12

### Added Changes

- Added `getTransactionHash` to get transaction hash with an userOp hash.
- Added `transactionHash` to `send()` in `EtherspotTransactionKitContextProvider`.
- Version update of `etherspot-modular`.

## [1.0.2] - 2025-02-19

### Added Changes

- Update `Viem` library version to match `etherspot-modular`

## [1.0.1] - 2025-02-06

### Added Changes

- Node version update on circleci

## [1.0.0] - 2025-02-03

### Added Changes

- Version update of `etherspot-modular`
- Use of the `Viem` library
- Use of the `etherspot-data-utils` to replace `etherspot-prime-sdk` data utils

### Breaking Changes

- Removed the `etherspot-prime-sdk`
- Removed `isModular` because the Transaction Kit is now using only `etherspot-modular-sdk`
- Removed `accountTemplate` because the Transaction Kit is not using only one `accountTemplate` type, `etherspot`

## [0.15.2] - 2024-09-05

### Added Changes

- Implementation of Prettier and EsLint to the code base

## [0.15.1] - 2024-08-09

### Added Changes

- Remove postinstall script

## [0.15.0] - 2024-08-08

### Breaking Changes

- Updated `@etherspot/modular-sdk` with new wallet factory contract address
- `IMPORTANT`: To access previous wallet factory contract address, please use 0.14.1 or below, and move assets from wallets before updating to 0.15.0+

## [0.14.1] - 2024-07-11

### Added Changes

- Added `MODULE_TYPE` enum and `ModuleInfo` type from `etherspot-modular`

## [0.14.0] - 2024-07-10

### Added Changes

- Version update of `etherspot-modular`
- Added Etherspot Modular SDK `getAllModules` and `isModuleInstalled` to hook `useEtherspotModules`
- Updated `uninstallModule` with Etherspot Modular SDK `generateModuleDeInitData` to hook `useEtherspotModules` which allows to install and uninstall several modules

### Breaking Changes

- Updated `getAssets` which accepts optional props `chainId` and `name`

## [0.13.0] - 2024-06-17

### Added Changes

- `getSDK` include a param to choose to instantiate the Prime SDK instead of the Modular SDK
- Added Etherspot Modular SDK `installModule` and `uninstallModule` to hook `useEtherspotModules`
- Added `isModular` to context `EtherspotContextProvider`

### Breaking Changes

- Etherspot Modular SDK implemented to TransactionKit as the default `accountTemplate`
- Changed the `etherspot-prime` wallet type to `etherspot` wallet type

## [0.12.1] - 2024-05-22

### Added Changes

- Links updated on README file

## [0.12.0] - 2024-05-21

### Added Changes

- Added Etherspot Prime SDK `getSupportedAssets` to hook `useEtherspotAssets`
- Added Etherspot Prime SDK `getQuotes` to hook `useEtherspotSwaps`
- Added Etherspot Prime SDK `getTransactionStatus` to hook `useEtherspotHistory`
- Default bridging provider for all above new functions is `Connext`
- Updated `@etherspot/prime-sdk` to version `1.8.1`

## [0.11.0] - 2024-03-28

### Added Changes

- Added `chainId` param to `useEtherspotNfts` hook's `getTransactions` and `getTransaction` methods
- Fixed `useEtherspotNfts` hook's `getTransactions` method returned result to match back-end changes

### Breaking Changes

- Transactions returned by `useEtherspotNfts` hook's `getTransactions` method are now different type called `UserOpTransaction`

## [0.10.1] - 2024-03-20

### Added Changes

- Fixes and optimizations on SDK initialization
- Updated `@etherspot/prime-sdk` to version `1.6.4` with config changes

## [0.10.0] - 2024-03-20

### Breaking Changes

- Etherspot project keys are now split as `dataApiKey` and `bundlerApiKey` to support separation of bundler and data services, however `TransactionKit` still carries embedded keys with low frequency usage API calls support

## [0.9.2] - 2024-03-20

### Breaking Changes

- Cast `chainId` to number throughout the library to make it failproof for string chain IDs

## [0.9.1] - 2024-03-16

### Breaking Changes

- Chore on Etherspot Prime project keys

## [0.9.0] - 2024-03-16

### Breaking Changes

- Updated `@etherspot/prime-sdk` to version `1.6.2` with data service changes
- Hook `useEtherspotSwaps` temporarily unavailable for `getOffers` method

## [0.8.0] - 2024-02-28

### Breaking Changes

- Updated `useEtherspotTransactions` hook's `estimate` and `send` methods to return actual gas cost on `estimated` key and nicer error messages on `errorMessage` key
- Changed return type to `JSX.Element` for `EtherspotApprovalTransaction`, `EtherspotContractTransaction` and `EtherspotTokenTransferTransaction` components

## [0.7.7] - 2024-02-22

### Added Changes

- Added `chainId` param to `useEtherspotNfts` hook's `getAccountNfts` method

## [0.7.6] - 2024-02-21

### Added Changes

- Added Etherspot Prime SDK computed account pull from SDK instance state

## [0.7.5] - 2024-02-21

### Added Changes

- Added missing `tokenDecimals` param to `<EtherspotTokenTransferTransaction />` and `<EtherspotApprovalTransaction />` components

## [0.7.4] - 2024-02-20

### Added Changes

- Added `chainId` param to `useEtherspotAssets` hook's `getAssets` method

## [0.7.3] - 2024-02-20

### Added Changes

- Fixed `<EtherspotTokenTransferTransaction />` component's used transfer method

## [0.7.2] - 2024-02-07

### Added Changes

- Fixed `useEtherspotBalances` hook's `getAccountBalances` accepted params type

## [0.7.1] - 2024-02-06

### Added Changes

- Added `chainId` param to `useEtherspotBalances` hook's `getAccountBalances` method

## [0.7.0] - 2024-01-30

### Added Changes

- Added `isSending`, `isEstimating`, `containsSendingError`, `containsEstimatingError` to `useEtherspotTransactions` hook

## [0.6.12] - 2024-01-26

### Added Changes

- Added Etherspot Prime SDK `projectKey` to `<EtherspotTransactionKit />`, it allows usage of SDK data services

## [0.6.11] - 2023-11-23

### Added Changes

- Removed `reflect-metadata` and `rxjs` dependencies
- Fixed `@etherspot/eip1271-verification-util` to version `0.1.3`
- Added Pull Request template

## [0.6.10] - 2023-11-23

### Breaking Changes

- Updated `@etherspot/prime-sdk` to version `1.3.112` that removes `api_key` param from `paymaster` prop, now it's passed via `url` param

## [0.6.9] - 2023-11-06

### Added Changes

- Updated `@etherspot/prime-sdk` to version `1.3.10` that includes better error message handling under the hood

## [0.6.8] - 2023-10-29

### Added Changes

- Fixed `<EtherspotBatches />` component `paymaster.context` issues

## [0.6.7] - 2023-10-28

### Added Changes

- Fixed `<EtherspotBatches />` component `paymaster` prop issues

## [0.6.6] - 2023-10-27

### Added Changes

- Added accepted `provider` to `<EtherspotTransactionKit />` component that supports most of providers by Prime SDK

## [0.6.5] - 2023-10-26

### Added Changes

- Updated `@etherspot/prime-sdk` to version `1.3.8` with `accountTemplate` (SDK `factoryWallet`) fixes

## [0.6.4] - 2023-10-25

### Added Changes

- Added `accountTemplate` to `<EtherspotTransactionKit />` component that allows passing custom `factoryWallet` supported by Prime SDK

## [0.6.3] - 2023-10-25

### Added Changes

- Added missing `useEtherspotTransactions` hook tests for `send` method

## [0.6.2] - 2023-10-24

### Added Changes

- Added missing `useEtherspotTransactions` hook tests for `estimate` method
- Fixed `skip` prop to ignore batch group estimations
- Fixed batching for same chain ID SDK instance

## [0.6.1] - 2023-10-24

### Added Changes

- Updated `example` React code to latest changes
- Updated `@etherspot/prime-sdk` to version `1.3.4`

### Breaking Changes

- Removed `etherspot` dependency
- Removed `@etherspot/react-etherspot` dependency
- Updated `provider` prop as required for `<EtherspotTransactionKit />` component
- Removed `getSdkForChainId` from `useEtherspot` hook, replaced with `getSdk` that returns `Prime SDK` instance as `Promise`
- Removed `connect` from `useEtherspot` therefore it's no longer required to start SDK session
- Removed `accountAddress` and `providerWalletAddress` from `useEtherspot` hook, please use `useWalletAddress` hook
- Removed `sdk` from `useEtherspot` hook, please use `getSdk` on `useEtherspot` hook
- Removed `etherspotSessionStorage` from `<EtherspotTransactionKit />` component, session is now handled internally

### Pending Changes

- Method `getOffers` for same chain swaps on `useEtherspotSwaps` hook is not working on this release
- Methods `getAccountTransactions` and `getAccountTransaction` on `useEtherspotHistory` hook are not working on this release

## [0.6.0] - 2023-10-18

### Breaking Changes

- Removed `etherspot` wallet type from `useWalletAddress` hook
- Removed `via` prop from `<EtherspotBatches />` component
- Default `useWalletAddress` and `<EtherspotBatches />` provider is set to `etherspot-prime`
- Removed `gasTokenAddress` prop from `<EtherspotBatches />` component due being unsupported in default `etherspot-prime` provider

### Added

- Added `gasCost` to `etherspot-prime` estimations

## [0.5.1] - 2023-10-17

### Added

- `react` dependencies chore.

## [0.5.0] - 2023-10-17

### Breaking Changes

- Downgraded `react` peer dependency to version `>=16.13.0`

## [0.4.9] - 2023-09-29

### Added

- Updated `@etherspot/prime-sdk` to version `1.2.11`
- Added `paymaster` prop to `<EtherspotBatches />` which is used for setting custom `paymaster` sent via `etherspot-prime` provider

## [0.4.8] - 2023-09-27

### Added

- Updated `@etherspot/prime-sdk` to version `1.2.10`

## [0.4.7] - 2023-09-27

### Fixes

- Updated `@etherspot/prime-sdk` to version `1.2.9`
- Removed `ethereumjs-util` dependency
- Updated address `checksum` util and tests
- Made library compatible with latest `react-scripts` (5.0.1)

## [0.4.6] - 2023-08-03

### Added

- Chore on `@etherspot/prime-sdk` version `1.1.1`

## [0.4.5] - 2023-07-27

### Added

- Updated `@etherspot/prime-sdk` to version `1.1.1`

## [0.4.4] - 2023-07-25

### Fixes

- Fixed transaction sending after recent `@etherspot/prime-sdk` update to version `1.1.0`

## [0.4.3] - 2023-07-25

### Added

- Updated `@etherspot/prime-sdk` to version `1.1.0`

## [0.4.2] - 2023-07-03

### Added

- Updated `@etherspot/react-etherspot` to version `1.2.0` with `provider` state update fixes
- Added Etherspot Prime SDK saved instances fix to support `provider` change

## [0.4.1] - 2023-06-26

### Added

- Added updated Etherspot Prime SDK that supports Arbitrum chain
- Added improvements how `chainId` is handled

## [0.4.0] - 2023-06-16

### Added

- Added updated Etherspot Prime SDK that solves multiple issues within their SDK

## [0.3.2] - 2023-06-14

### Added

- Added fixes and improvements how Etherspot Prime SDK is created and handled
- Added `userOpHash` and `via` type to `SentBatches` type to to able to tell if it is
  `etherspot` `batchHash` or `etherspot-prime` `userOpHash`

## [0.3.1] - 2023-06-13

### Added

- Updated `@etherspot/eip1271-verification-util` to version `0.1.2`

## [0.3.0] - 2023-06-06

### Added

- Added `via` prop to `<EtherspotBatches />` component that accepts default `etherspot` provider or newly added SDK
  provider `etherspot-prime` that can be used to send EIP-4337 (Account Abstraction / UserOperation) transactions
  via Etherspot bundler
- Added `useWalletAddres` hook to get `etherspot`, `etherspot-prime` and connected `provider` wallet address by type
- Added deprecation warning for `useEtherspotAddresses` hook, `useWalletAddress('etherspot', chainId)` should
  be used instead

### Fixes

- Fixed `batches` ordering issue that were affecting renders with few `<EtherspotBatches />` components rendered
  at the same time

## [0.2.5] - 2023-06-02

### Added

- Added `useEtherspotSwaps` hook for cross chain and same chain asset swaps

## [0.2.4] - 2023-06-01

### Added

- Added `useEtherspotPrices` hook for asset prices

## [0.2.3] - 2023-05-30

### Added

- Updated `window` context to not be used within non-browser environments.

## [0.2.2] - 2023-05-30

### Added

- Updated `@etherspot/eip1271-verification-util` to version `0.1.1`.

## [0.2.1] - 2023-05-30

### Added

- Added `rimraf` to suport developers in `Windows` environment.
- Added provider wallet transaction component `<ProviderWalletTransaction />`
- Added `useProviderWalletTransaction` hook for provider wallet transaction management

## [0.2.0] - 2023-05-12

### Added

- Added `useEtherspotBalances` hook for Etherspot/EVM related contract
- Added `useEtherspotUtils` hook for Etherspot/EVM related utils
- Added `useEtherspotHistory` hook for Etherspot account transactions history
- Added `useEtherspotNfts` hook for Etherspot account owned NFTs
- Added `CHANGELOG.md` to track library changes
- Improved Etherspot SDK session connection flows
- Added missing warning logs throughout the library

### Breaking Changes

- Removed current output of `useEtherspotAssets` and added method `getAssets: () => Promise<TokenListToken[]>` that returns a list of assets instead of putting asseets automatically into the state
