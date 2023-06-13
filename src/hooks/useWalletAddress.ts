import { useEffect, useState } from 'react';
import { useEtherspot } from '@etherspot/react-etherspot';
import { AccountTypes, EnvNames } from 'etherspot';
import { PrimeSdk } from 'etherspot-prime';

// types
import { IWalletType } from '../types/EtherspotTransactionKit';

// utils
import { isTestnetChainId } from '../utils/common';

/**
 * Hook to return wallet address by wallet type
 * @param walletType {IWalletType} - wallet type
 * @param chainId {number} - Chain ID
 * @returns {string | undefined} - wallet address by it's type
 */
const useWalletAddress = (walletType: IWalletType = 'etherspot', chainId: number = 1): string | undefined => {
  const [walletAddress, setWalletAddress] = useState<(string | undefined)>(undefined);
  const { connect, getSdkForChainId, provider, providerWalletAddress } = useEtherspot();

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
        const etherspotNetwork = sdkForChainId?.state?.network;
        if (!etherspotNetwork) {
          console.warn(`Unable to get network for Etherspot chain ID ${chainId}`);
          setWalletAddress(undefined);
          return;
        }

        try {
          // @ts-ignore
          const etherspotPrimeSdk = new PrimeSdk(provider, {
            networkName: etherspotNetwork.name,
            env: isTestnetChainId(etherspotNetwork.chainId) ? EnvNames.TestNets : EnvNames.MainNets,
          });
          updatedWalletAddress = await etherspotPrimeSdk.getCounterFactualAddress();
        } catch (e) {
          console.warn(
            `Unable to get wallet address for Etherspot-Prime type `
            + `at network ${etherspotNetwork.name} ID ${etherspotNetwork.chainId}. `
            + `Received error: `,
            e
          );
        }
      } else if (walletType === 'provider') {
        updatedWalletAddress = providerWalletAddress;
      }

      if (!shouldUpdate) return;

      setWalletAddress(updatedWalletAddress);
    }

    updateWalletAddress();

    return () => { shouldUpdate = false; }
  }, [getSdkForChainId, connect]);

  return walletAddress;
};

export default useWalletAddress;
