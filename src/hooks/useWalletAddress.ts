import { useEffect, useMemo, useState } from 'react';
import { useEtherspot } from '@etherspot/react-etherspot';
import { AccountTypes } from 'etherspot';

// types
import { IWalletType } from '../types/EtherspotTransactionKit';

// hooks
import useEtherspotTransactions from './useEtherspotTransactions';

/**
 * Hook to return wallet address by wallet type
 * @param walletType {IWalletType} - wallet type
 * @param chainId {number} - Chain ID
 * @returns {string | undefined} - wallet address by its type
 */
const useWalletAddress = (walletType: IWalletType = 'etherspot', chainId?: number): string | undefined => {
  const [walletAddress, setWalletAddress] = useState<(string | undefined)>(undefined);
  const { connect, getSdkForChainId, providerWalletAddress, chainId: defaultChainId  } = useEtherspot();
  const { getEtherspotPrimeSdkForChainId } = useEtherspotTransactions();

  const walletAddressChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  useEffect(() => {
    let shouldUpdate = true;

    const updateWalletAddress = async () => {
      let updatedWalletAddress = undefined;

      const sdkForChainId = getSdkForChainId(walletAddressChainId);
      if (!sdkForChainId) {
        console.warn(`Unable to get SDK for chain ID ${walletAddressChainId}`);
      }

      if (walletType === 'etherspot') {
        if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
          await connect(walletAddressChainId);
        }

        updatedWalletAddress = sdkForChainId?.state?.account?.address;
      } else if (walletType === 'etherspot-prime') {
        const etherspotPrimeSdk = await getEtherspotPrimeSdkForChainId(walletAddressChainId);
        if (!etherspotPrimeSdk) {
          console.warn(`Unable to get Etherspot Prime SDK for chain ID ${walletAddressChainId}`);
          setWalletAddress(undefined);
          return;
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
  }, [getSdkForChainId, getEtherspotPrimeSdkForChainId, connect, walletAddressChainId]);

  return walletAddress;
};

export default useWalletAddress;
