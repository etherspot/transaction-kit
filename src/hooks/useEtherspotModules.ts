import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

// types
import { MODULE_TYPE } from '@etherspot/modular-sdk/dist/sdk/common';
import { ModularSdk } from '@etherspot/modular-sdk';

interface IEtherspotModulesHook {
    installModule: (moduleType: MODULE_TYPE, module: string, initData?: string, accountAddress?: string, chainId?: number) => Promise<string>;
    uninstallModule: (moduleType: MODULE_TYPE, module: string, deinitData: string, accountAddress?: string, chainId?: number) => Promise<string>;
}

/**
 * Hook to fetch account balances
 * @param chainId {number | undefined} - Chain ID
 * @returns {IEtherspotModulesHook} - hook method to fetch Etherspot account balances
 */
const useEtherspotModules = (chainId?: number): IEtherspotModulesHook => {
  const { getSdk, chainId: etherspotChainId, isModular } = useEtherspot();

  const defaultChainId = useMemo(() => {
    if (chainId) return chainId;
    return etherspotChainId;
  }, [chainId, etherspotChainId]);

  const installModule = async (
    moduleType: MODULE_TYPE,
    module: string,
    initData?: string,
    accountAddress?: string,
    modulesChainId: number = defaultChainId,
  ) => {
    // this hook can only be used is the sdk is using the modular functionality
    if (!isModular) {
      console.warn(`The <EtherspotTransactionKit /> component is not using the modular functionality. Please make sure to use the modular functionality to install and uninstall modules.`);
      return '';
    }

    const sdkForChainId = await getSdk(isModular, modulesChainId) as ModularSdk;

    const modulesForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!modulesForAccount) {
      console.warn(`No account address provided!`);
      return '';
    }

    try {
        const getInstallModule = await sdkForChainId.installModule(moduleType, module, initData)
        return getInstallModule;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to install the new module`
        + ` ${module}`
        + ` for ${modulesForAccount}. Please try again. Error:`,
        e,
      );
      return '';
    }
  }

  const uninstallModule = async (
    moduleType: MODULE_TYPE,
    module: string,
    deinitData: string,
    accountAddress?: string,
    modulesChainId: number = defaultChainId,
  ) => {
    // this hook can only be used is the sdk is using the modular functionality
    if (!isModular) {
      console.warn(`The <EtherspotTransactionKit /> component is not using the modular functionality. Please make sure to use the modular functionality to install and uninstall modules.`);
      return '';
    }

    const sdkForChainId = await getSdk(isModular, modulesChainId) as ModularSdk;

    const modulesForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!modulesForAccount) {
      console.warn(`No account address provided!`);
      return '';
    }

    try {
        const getUninstallModule = await sdkForChainId.uninstallModule(moduleType, module, deinitData);
        return getUninstallModule;
    } catch (e) {
      console.warn(
        `Sorry, an error occurred whilst trying to uninstall the module`
        + ` ${module}`
        + ` for ${modulesForAccount}. Please try again. Error:`,
        e,
      );
      return '';
    }
  }

  return { installModule, uninstallModule };
};

export default useEtherspotModules;

