import { useEtherspot } from '@etherspot/react-etherspot';
import { AccountTypes, Network } from 'etherspot';
import { useEffect, useState } from 'react';
import { ISmartWalletAddress } from '../types/EtherspotTransactionKit';
import { isTestnetChainId } from '../utils/common';

let isConnecting: Promise<any> | undefined;

/**
 * @deprecated
 * Hook to fetch Etherspot Smart Wallet addresses
 * @returns {ISmartWalletAddress[] | null} - An array of Etherspot addresses
 */
const useEtherspotAddresses = (): (ISmartWalletAddress | null)[] => {
  const [etherspotAddresses, setEtherspotAddresses] = useState<(ISmartWalletAddress | null)[]>([]);
  const { connect, getSdkForChainId, sdk } = useEtherspot();

  useEffect(() => {
    let shouldUpdate = true;

    const updateEtherspotAddresses = async () => {
      if (!!isConnecting) return;

      let computedContractAddress: (ISmartWalletAddress | null)[] = [];
      const chainsToInstantiate: (Network[]) = [];
      if (!sdk) {
        return null;
      }

      /**
       * Until we need to calculate all chains individually, we will
       * just calculate the first chain and then either Avax or Fuji
       */
      
      // Are we in testnet mode?
      const isTestnetMode = isTestnetChainId(sdk.supportedNetworks[0].chainId);

      if (isTestnetMode) {
        // Find goerli
        const goerli = sdk.supportedNetworks.find((network) => network.chainId === 5);
        if (goerli) {
          chainsToInstantiate.push(goerli);
        }

        // Find Fuji
        const fuji = sdk.supportedNetworks.find((network) => network.chainId === 43113);
        if (fuji) {
          chainsToInstantiate.push(fuji);
        }
      } else {
        // Find Ethereum
        const ethereum = sdk.supportedNetworks.find((network) => network.chainId === 1);
        if (ethereum) {
          chainsToInstantiate.push(ethereum);
        }

        // Find Avalanche
        const avalanche = sdk.supportedNetworks.find((network) => network.chainId === 43114);
        if (avalanche) {
          chainsToInstantiate.push(avalanche);
        }
      }

      for (let index = 0; index < chainsToInstantiate.length; index++) {
        const supportedNetwork = chainsToInstantiate[index];
        const sdkForChainId = getSdkForChainId(supportedNetwork.chainId);
  
        if (sdkForChainId) {
          if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
            isConnecting = connect(supportedNetwork.chainId);
            await isConnecting;
            isConnecting = undefined;
          }

          const response = await sdkForChainId.computeContractAccount({
            sync: false
          }).catch((e) => {
            console.warn('An error occured whilst trying to compute contract account:', e);
            return e;
          });

          const accountData: ISmartWalletAddress =  {
            chainId: supportedNetwork.chainId,
            address: response.address, 
            chainName: supportedNetwork.name,
          };

          computedContractAddress.push(accountData);
        } else {
          console.warn(`Sorry, the SDK is not ready yet for chain ${supportedNetwork.name} - please try again.`);
          computedContractAddress.push(null);
        }
      }

      // Next, we need to fill in the gaps for mainnets and testnets
      if (isTestnetMode) {
        const missingNetworks = sdk
          .supportedNetworks
          .filter((network) => network.chainId !== 5 && network.chainId !== 43113)
          .map((network) => {
            const accountData: ISmartWalletAddress =  {
              chainId: network.chainId,
              address: computedContractAddress[0]?.address || '', 
              chainName: network.name,
            };

            return accountData;
          });

        computedContractAddress = [...computedContractAddress, ...missingNetworks];
      } else {
        const missingNetworks = sdk
          .supportedNetworks
          .filter((network) => network.chainId !== 1 && network.chainId !== 43114)
          .map((network) => {
            const accountData: ISmartWalletAddress =  {
              chainId: network.chainId,
              address: computedContractAddress[0]?.address || '', 
              chainName: network.name,
            };

            return accountData;
          });

        computedContractAddress = [...computedContractAddress, ...missingNetworks];
      }

      // Finally, set the Etherspot addresses.
      if (shouldUpdate) {
        const filteredComputedContractAddresses = computedContractAddress
          .filter((addressObject) => addressObject !== null);

        setEtherspotAddresses(filteredComputedContractAddresses);
      }
    }

    updateEtherspotAddresses();

    return () => { shouldUpdate = false; }
  }, [getSdkForChainId, connect]);

  return etherspotAddresses;
};

export default useEtherspotAddresses;
