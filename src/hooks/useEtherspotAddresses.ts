import { useEtherspot } from '@etherspot/react-etherspot';
import { AccountTypes, sleep } from 'etherspot';
import { useEffect, useState } from 'react';
import { ISmartWalletAddress } from '../types/EtherspotUi';

/**
 * Hook to fetch Etherspot Smart Wallet addresses
 * @returns {ISmartWalletAddress[] | null} - An array of Etherspot addresses
 */
const useEtherspotAddresses = (): (ISmartWalletAddress | null)[] => {
  const [etherspotAddresses, setEtherspotAddresses] = useState<(ISmartWalletAddress | null)[]>([]);
  const { connect, getSdkForChainId, sdk } = useEtherspot();

  useEffect(() => {
    let shouldUpdate = true;

    const updateEtherspotAddresses = async () => {
      const computedContractAddress: (ISmartWalletAddress | null)[] = [];
      if (!sdk) {
        return null;
      }

      for (let index = 0; index < sdk.supportedNetworks.length; index++) {
        const supportedNetwork = sdk.supportedNetworks[index];

        const sdkForChainId = getSdkForChainId(supportedNetwork.chainId);
  
        if (sdkForChainId) {
          if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
            const isConnecting = connect(supportedNetwork.chainId);
      
            await isConnecting;
          }

          /**
           * SLEEP!
           */
          await sleep(2);

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

      // const computedContractAddress = await Promise.all(
      //   sdk.supportedNetworks
      //   .map(async (supportedNetwork) => {
      //     const sdkForChainId = getSdkForChainId(supportedNetwork.chainId);
  
      //     if (sdkForChainId) {
      //       if (sdkForChainId?.state?.account?.type !== AccountTypes.Contract) {
      //         const isConnecting = connect(supportedNetwork.chainId);
        
      //         await isConnecting;
      //       }

      //       /**
      //        * SLEEP!
      //        */
      //       await sleep(2);

      //       const response = await sdkForChainId.computeContractAccount({
      //         sync: false
      //       }).catch((e) => {
      //         console.warn('An error occured whilst trying to compute contract account:', e);
      //         return e;
      //       });

      //       const accountData: ISmartWalletAddress =  {
      //         chainId: supportedNetwork.chainId,
      //         address: response.address, 
      //         chainName: supportedNetwork.name,
      //       };

      //       return accountData;
      //     } else {
      //       console.warn(`Sorry, the SDK is not ready yet for chain ${supportedNetwork.name} - please try again.`);
      //       return null;
      //     }
      //   })
      // );
  
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
