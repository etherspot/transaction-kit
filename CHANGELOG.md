# Changelog

## [0.6.1] - 2023-10-17

### Breaking Changes
- Removed `gasTokenAddress` prop from `<EtherspotBatches />` component due being unsupported in default `etherspot-prime` provider

### Added
- Added `gasCost` to `etherspot-prime` estimations

## [0.6.0] - 2023-10-17

### Breaking Changes
- Removed `etherspot` wallet type from `useWalletAddress` hook
- Removed `via` prop from `<EtherspotBatches />` component
- Default `useWalletAddress` and  `<EtherspotBatches />` provider is set to `etherspot-prime`

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
- Updated  `@etherspot/eip1271-verification-util` to version `0.1.1`.

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
