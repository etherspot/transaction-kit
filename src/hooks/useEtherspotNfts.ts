import { NftCollection } from '@etherspot/prime-sdk';
import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';
import useWalletAddress from './useWalletAddress';

interface IEtherspotNftsHook {
  getAccountNfts: (accountAddress?: string) => Promise<NftCollection[]>;
}

/**
 * Hook to fetch Etherspot account owned NFTs
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotNftsHook} - hook methods to fetch Etherspot account NFTs
 */
const useEtherspotNfts = (chainId?: number): IEtherspotNftsHook => {
  const { connect, getSdk, chainId: defaultChainId, isConnected } = useEtherspot();
  const currentAccountAddress = useWalletAddress('etherspot-prime', chainId ?? defaultChainId);

  const nftsChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  const getAccountNfts = async (accountAddress?: string) => {
    const sdkForChainId = getSdk(nftsChainId);
    if (!sdkForChainId) {
      console.warn(`Unable to get SDK for chain ID ${nftsChainId}`);
      return [];
    }

    if (!isConnected(nftsChainId)) {
      await connect();
    }

    const nftsForAccount = accountAddress ?? currentAccountAddress;
    if (!nftsForAccount) {
      console.warn(`No account address provided!`);
      return [];
    }

    try {
      const { items } = await sdkForChainId.getNftList({
        account: nftsForAccount,
      });

      return items;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to fetch account NFTs`
        + ` for ${sdkForChainId.state.account.address}. Please try again. Error:`,
        e,
      );
    }

    return [];
  }

  return { getAccountNfts };
};

export default useEtherspotNfts;
