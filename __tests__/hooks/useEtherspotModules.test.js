import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

// hooks
import { useEtherspotModules, EtherspotTransactionKit } from '../../src';
import { MODULE_TYPE } from '@etherspot/modular-sdk/dist/sdk/common';

const ethersProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', 'sepolia'); // replace with your node's RPC URL
const provider = new ethers.Wallet.createRandom().connect(ethersProvider);

const moduleAddress = '0x111';
const initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "bytes"],
    ['0x0000000000000000000000000000000000000001', '0x00']
  );
  const deInitData = ethers.utils.defaultAbiCoder.encode(
    ["address", "bytes"],
    ['0x0000000000000000000000000000000000000001', '0x00']
  );

describe('useEtherspotModules()', () => {
  it('install one module', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(({ chainId }) => useEtherspotModules(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });


    // wait for balances to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const installModuleMissingProps = await result.current.installModule(MODULE_TYPE.VALIDATOR)
    .catch((e) => {
      console.error(e);
      return `${e}`
    })
    expect(installModuleMissingProps).toBe('Error: Failed to install module: Error: installModule props missing');

    const installModuleAlreadyInstalled = await result.current.installModule(MODULE_TYPE.VALIDATOR, '0x222')
    .catch((e) => {
      console.error(e);
      return `${e}`
    })

    expect(installModuleAlreadyInstalled).toBe('Error: Failed to install module: Error: module is already installed');

    const installOneModule = await result.current.installModule(MODULE_TYPE.VALIDATOR, moduleAddress, initData);
    expect(installOneModule).toBe('0x123')
  });

  it('uninstall one module', async () => {
    const wrapper = ({ children }) => (
      <EtherspotTransactionKit provider={provider}>
        {children}
      </EtherspotTransactionKit>
    );

    const { result } = renderHook(({ chainId }) => useEtherspotModules(chainId), {
      initialProps: { chainId: 1 },
      wrapper,
    });

    // wait for balances to be fetched for chain ID 1
    await waitFor(() => expect(result.current).not.toBeNull());

    const uninstallModuleNotInstalled = await result.current.uninstallModule(MODULE_TYPE.VALIDATOR, '0x222', deInitData)
    .catch((e) => {
      console.error(e);
      return `${e}`
    })

    expect(uninstallModuleNotInstalled).toBe('Error: Failed to uninstall module: Error: module is not installed');

    const installOneModule = await result.current.installModule(MODULE_TYPE.VALIDATOR, moduleAddress, initData);
    expect(installOneModule).toBe('0x123');

    const uninstallModulePropsMissing = await result.current.uninstallModule(moduleAddress)
    .catch((e) => {
      console.error(e);
      return `${e}`
    })
    expect(uninstallModulePropsMissing).toBe('Error: Failed to uninstall module: Error: uninstallModule props missing');
    
    
    const uninstallOneModule = await result.current.uninstallModule(MODULE_TYPE.VALIDATOR, moduleAddress, deInitData);
    expect(uninstallOneModule).toBe('0x456');

  });
})
