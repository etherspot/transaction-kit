import { useMemo } from 'react';

// hooks
import useEtherspot from './useEtherspot';

// types
import { MODULE_TYPE } from '@etherspot/modular-sdk/dist/sdk/common';
import { ModularSdk } from '@etherspot/modular-sdk';
import { ModuleInfo } from '@etherspot/modular-sdk/dist/sdk/base/EtherspotWalletAPI';

interface IEtherspotModulesHook {
    installModule: (moduleType: MODULE_TYPE, module: string, initData?: string, accountAddress?: string, modulesChainId?: number) => Promise<string>;
    uninstallModule: (moduleType: MODULE_TYPE, module: string, deinitData?: string, accountAddress?: string, modulesChainId?: number) => Promise<string>;
    isModuleInstalled: (moduleType: MODULE_TYPE, module: string, accountAddress?: string, modulesChainId?: number) => Promise<boolean>;
    listModules: (pageSize?: number, accountAddress?: string, modulesChainId?: number) => Promise<ModuleInfo>;
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
      throw new Error(`The <EtherspotTransactionKit /> component is not using the modular functionality. Please make sure to use the modular functionality to install and uninstall modules.`);
    }

    const sdkForChainId = await getSdk(modulesChainId) as ModularSdk;

    const modulesForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!modulesForAccount) {
      throw new Error(`No account address provided!`);
    }

    try {
        const getInstallModule = await sdkForChainId.installModule(moduleType, module, initData)
        return getInstallModule;
    } catch (e) {
      console.error(
        `Sorry, an error occurred whilst trying to install the new module`
        + ` ${module}`
        + ` for ${modulesForAccount}. Please try again. Error:`,
        e,
      );
      throw new Error(`Failed to install module: ${e}`)
    }
  }

  const uninstallModule = async (
    moduleType: MODULE_TYPE,
    module: string,
    deinitData?: string,
    accountAddress?: string,
    modulesChainId: number = defaultChainId,
  ) => {
    // this hook can only be used is the sdk is using the modular functionality
    if (!isModular) {
      throw new Error(`The <EtherspotTransactionKit /> component is not using the modular functionality. Please make sure to use the modular functionality to install and uninstall modules.`);
    }

    const sdkForChainId = await getSdk(modulesChainId) as ModularSdk;

    const modulesForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!modulesForAccount) {
      throw new Error(`No account address provided!`);
    }

    // If no deInitData is passed as an arg, the default should be '0x00'
    const moduleDeInitData = deinitData ?? '0x00';

    try {
        // We need to get the deInitData which is mandatory to be able to uninstall a module
        const generateDeInitData = await sdkForChainId.generateModuleDeInitData(moduleType, module, moduleDeInitData);

        // Once the deInitData has been generated, we can proceed to uninstall the module
        const getUninstallModule = await sdkForChainId.uninstallModule(moduleType, module, generateDeInitData);
        return getUninstallModule;
    } catch (e) {
      console.error(
        `Sorry, an error occurred whilst trying to uninstall the module`
        + ` ${module}`
        + ` for ${modulesForAccount}. Please try again. Error:`,
        e,
      );
      throw new Error(`Failed to uninstall module: ${e}`)
    }
  }


  const listModules = async (
    pageSize?: number,
    accountAddress?: string,
    modulesChainId: number = defaultChainId,
  ) => {
    // this hook can only be used is the sdk is using the modular functionality
    if (!isModular) {
      throw new Error(`The <EtherspotTransactionKit /> component is not using the modular functionality. Please make sure to use the modular functionality to install and uninstall modules.`);
    }

    const sdkForChainId = await getSdk(modulesChainId) as ModularSdk;

    const modulesForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!modulesForAccount) {
      throw new Error(`No account address provided!`);
    }

    // If no pageSize is passed as an arg, the default should be 50
    const modulesListPageSize = pageSize ?? 50;

    try {
        const getAllModules = await sdkForChainId.getAllModules(modulesListPageSize);
        return getAllModules;
    } catch (e) {
      console.error(
        `Sorry, an error occurred whilst trying to list all your wallet modules on`
        + ` ${modulesForAccount}. Please try again. Error:`,
        e,
      );
      throw new Error(`Failed to list all modules: ${e}`)
    }
  }

  const isModuleInstalled = async (
    moduleType: MODULE_TYPE,
    module: string,
    accountAddress?: string,
    modulesChainId: number = defaultChainId,
  ) => {
    // this hook can only be used is the sdk is using the modular functionality
    if (!isModular) {
      throw new Error(`The <EtherspotTransactionKit /> component is not using the modular functionality. Please make sure to use the modular functionality to install and uninstall modules.`);
    }

    const sdkForChainId = await getSdk(modulesChainId) as ModularSdk;

    const modulesForAccount = accountAddress ?? await sdkForChainId.getCounterFactualAddress();
    if (!modulesForAccount) {
      throw new Error(`No account address provided!`);
    }

    try {
        const getIsModuleInstalled = await sdkForChainId.isModuleInstalled(moduleType, module)
        return getIsModuleInstalled;
    } catch (e) {
      console.error(
        `Sorry, an error occurred whilst trying to verify if the module`
        + ` ${module}`
        + ` for ${modulesForAccount} is already installed. Please try again. Error:`,
        e,
      );
      throw new Error(`Failed to verify if the module is already installed: ${e}`)
    }
  }

  return { installModule, uninstallModule, isModuleInstalled, listModules };
};

export default useEtherspotModules;

