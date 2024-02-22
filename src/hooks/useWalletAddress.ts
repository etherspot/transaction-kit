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
  const [accountAddress, setAccountAddress] = useState<(string | undefined)>(undefined);
  const { getSdk, chainId: defaultChainId, provider } = useEtherspot();

  const walletAddressChainId = useMemo(() => {
    if (chainId) return chainId;
    return defaultChainId;
  }, [chainId, defaultChainId]);

  useEffect(() => {
    let shouldUpdate = true;

    const updateAccountAddress = async () => {
      const etherspotPrimeSdk = await getSdk(walletAddressChainId);

      let newAccountAddress;

      try {
        /**
         * Currently `etherspotWallet` is marked as private on SDK, let's ignore until SDK team fixes it
         * Reference – https://github.com/etherspot/etherspot-prime-sdk/blob/master/src/sdk/sdk.ts#L31
         */
        // @ts-ignore
        newAccountAddress = etherspotPrimeSdk?.etherspotWallet?.accountAddress;
      } catch (e) {
        console.warn(`Unable to get wallet address from SDK state for etherspot-prime type for chainId ID ${walletAddressChainId}.`, e);
      }

      // if were unable to get wallet address from SDK state, try to get using getCounterFactualAddress
      if (!newAccountAddress) {
        try {
          newAccountAddress = await etherspotPrimeSdk.getCounterFactualAddress();
        } catch (e) {
          console.warn(`Unable to get wallet address for etherspot-prime type for chainId ID ${walletAddressChainId}.`, e);
        }
      }

      if (!newAccountAddress || !shouldUpdate) return;

      setAccountAddress(newAccountAddress);
    }

    updateAccountAddress();

    return () => { shouldUpdate = false; }
  }, [getSdk, walletAddressChainId]);

  return useMemo(() => {
    if (walletType === 'etherspot-prime') {
      return accountAddress;
    }

    if (walletType === 'provider') {
      // @ts-ignore
      const providerAddress = provider?.address || provider?.accounts?.[0];
      if (providerAddress) return providerAddress;
      console.warn(`Unable to get wallet address for provider type`);
    }

    return undefined;
  }, [accountAddress, walletType]);
};

export default useWalletAddress;
