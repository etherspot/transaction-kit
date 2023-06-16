import { useEffect, useState } from 'react';
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
const useWalletAddress = (walletType: IWalletType = 'etherspot', chainId: number = 1): string | undefined => {
  const [walletAddress, setWalletAddress] = useState<(string | undefined)>(undefined);
  const { connect, getSdkForChainId, providerWalletAddress } = useEtherspot();
  const { getEtherspotPrimeSdkForChainId } = useEtherspotTransactions();

  useEffect(() => {
    let shouldUpdate = true;

    const updateWalletAddress = async () => {
      let updatedWalletAddress = undefined;

      const sdkForChainId = getSdkForChainId(chainId);
      if (!sdkForChainId) {
        console.warn(`Unable to get SDK for chain ID ${chainId}`);
      }

      if (walletType === 'etherspot') {
        if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
          await connect(chainId);
        }

        updatedWalletAddress = sdkForChainId?.state?.account?.address;
      } else if (walletType === 'etherspot-prime') {
        const etherspotPrimeSdk = await getEtherspotPrimeSdkForChainId(chainId);
        if (!etherspotPrimeSdk) {
          console.warn(`Unable to get Etherspot Prime SDK for chain ID ${chainId}`);
          setWalletAddress(undefined);
          return;
        }

        try {
          // @ts-ignore
          updatedWalletAddress = await etherspotPrimeSdk.getCounterFactualAddress();
        } catch (e) {
          console.warn(`Unable to get wallet address for etherspot-prime type for chainId ID ${chainId}. `, e);
        }
      } else if (walletType === 'provider') {
        updatedWalletAddress = providerWalletAddress;
      }

      if (!shouldUpdate) return;

      setWalletAddress(updatedWalletAddress);
    }

    updateWalletAddress();

    return () => { shouldUpdate = false; }
  }, [getSdkForChainId, getEtherspotPrimeSdkForChainId, connect]);

  return walletAddress;
};

export default useWalletAddress;
