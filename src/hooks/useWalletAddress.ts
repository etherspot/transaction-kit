import { useEffect, useMemo, useState } from 'react';

// types
import { IWalletType } from '../types/EtherspotTransactionKit';

// hooks
import useEtherspot from './useEtherspot';

/**
 * Hook to return wallet address by wallet type
 * @param walletType {IWalletType} - wallet type
 * @param chainId {number} - Chain ID
 * @returns {string | undefined} - wallet address by its type
 */
const useWalletAddress = (walletType: IWalletType = 'etherspot-prime', chainId?: number): string | undefined => {
  const [walletAddress, setWalletAddress] = useState<(string | undefined)>(undefined);
  const { connect, getSdk, providerWalletAddress, chainId: defaultChainId, isConnected  } = useEtherspot();

  const walletAddressChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  useEffect(() => {
    let shouldUpdate = true;

    const updateWalletAddress = async () => {
      if (!isConnected(walletAddressChainId)) {
        await connect(walletAddressChainId);
      }

      if (!shouldUpdate) return;

      let updatedWalletAddress = undefined;

      if (walletType === 'etherspot-prime') {
        const etherspotPrimeSdk = getSdk(walletAddressChainId);
        if (!etherspotPrimeSdk) {
          console.warn(`Unable to get Etherspot Prime SDK for chain ID ${walletAddressChainId}`);
        }

        try {
          // @ts-ignore
          updatedWalletAddress = await etherspotPrimeSdk.getCounterFactualAddress();
        } catch (e) {
          console.warn(`Unable to get wallet address for etherspot-prime type for chainId ID ${walletAddressChainId}. `, e);
        }
      } else if (walletType === 'provider') {
        updatedWalletAddress = providerWalletAddress;
      }

      if (!shouldUpdate) return;

      setWalletAddress(updatedWalletAddress);
    }

    updateWalletAddress();

    return () => { shouldUpdate = false; }
  }, [getSdk, connect, walletAddressChainId, isConnected]);

  return walletAddress;
};

export default useWalletAddress;
