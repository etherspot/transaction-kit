# Changelog

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

### Improvements
- Added `useEtherspotBalances` hook for Etherspot/EVM related contract
- Added `useEtherspotUtils` hook for Etherspot/EVM related utils
- Added `useEtherspotHistory` hook for Etherspot account transactions history
- Added `useEtherspotNfts` hook for Etherspot account owned NFTs
- Added `CHANGELOG.md` to track library changes
- Improved Etherspot SDK session connection flows
- Added missing warning logs throughout the library

### Breaking Changes
- Removed current output of `useEtherspotAssets` and added method `getAssets: () => Promise<TokenListToken[]>` that returns a list of assets instead of putting asseets automatically into the state
