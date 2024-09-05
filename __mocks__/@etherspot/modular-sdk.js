import * as EtherspotModular from '@etherspot/modular-sdk';
import { ethers } from 'ethers';

export const defaultAccountAddressModular =
  '0x7F30B1960D5556929B03a0339814fE903c55a347';
export const otherFactoryDefaultAccountAddressModular =
  '0xe383724e3bDC4753746dEC781809f8CD82010914';
export const otherAccountAddressModular =
  '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1';

export class ModularSdk {
  sdkChainId;
  userOps = [];
  nonce = ethers.BigNumber.from(1);
  factoryWallet;

  constructor(provider, config) {
    this.sdkChainId = config.chainId;
    this.factoryWallet = config.factoryWallet;
  }

  getCounterFactualAddress() {
    if (this.factoryWallet === 'etherspotModular') {
      return defaultAccountAddressModular;
    }
    return otherFactoryDefaultAccountAddressModular;
  }

  async clearUserOpsFromBatch() {
    this.userOps = [];
  }

  async addUserOpsToBatch(userOp) {
    this.userOps.push(userOp);
  }

  async estimate({ paymasterDetails: paymaster }) {
    let maxFeePerGas = ethers.utils.parseUnits('1', 'gwei');
    let maxPriorityFeePerGas = ethers.utils.parseUnits('1', 'gwei');
    let callGasLimit = ethers.BigNumber.from('50000');
    let signature = '0x004';

    if (paymaster?.url === 'someUrl') {
      maxFeePerGas = ethers.utils.parseUnits('2', 'gwei');
      maxPriorityFeePerGas = ethers.utils.parseUnits('3', 'gwei');
      callGasLimit = ethers.BigNumber.from('75000');
    }

    if (paymaster?.url === 'someUnstableUrl') {
      signature = '0x0';
    }

    let finalGasLimit = ethers.BigNumber.from(callGasLimit);

    if (this.sdkChainId === 420) {
      throw new Error('Transaction reverted: chain too high');
    }

    this.userOps.forEach((userOp) => {
      if (userOp.to === '0xDEADBEEF') {
        throw new Error('Transaction reverted: invalid address');
      }
      finalGasLimit = finalGasLimit.add(callGasLimit);
      if (userOp.data && userOp.data !== '0x0' && userOp.data !== '0xFFF') {
        finalGasLimit = finalGasLimit.add(callGasLimit);
      }
    });

    return {
      sender: defaultAccountAddressModular,
      nonce: this.nonce,
      initCode: '0x001',
      callData: '0x002',
      callGasLimit: finalGasLimit,
      verificationGasLimit: ethers.BigNumber.from('25000'),
      preVerificationGas: ethers.BigNumber.from('75000'),
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData: '0x003',
      signature,
    };
  }

  totalGasEstimated({
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
  }) {
    return callGasLimit.add(verificationGasLimit).add(preVerificationGas);
  }

  async send(userOp) {
    if (this.sdkChainId === 696969) {
      throw new Error('Transaction reverted: chain too hot');
    }

    if (userOp.signature === '0x0') {
      throw new Error('Transaction reverted: invalid signature');
    }

    /**
     * provide fake userOp hash by increasing nonce on each send
     * and add SDK chain ID to make it more unique per userOp
     */
    const userOpHash = this.nonce.add(this.sdkChainId).toHexString();
    this.nonce = this.nonce.add(1);

    return userOpHash;
  }

  async generateModuleDeInitData() {
    const deInitData = ethers.utils.defaultAbiCoder.encode(
      ['address', 'bytes'],
      ['0x0000000000000000000000000000000000000001', '0x00']
    );
    return deInitData;
  }

  async installModule(moduleType, module, initData, accountAddress) {
    if (!accountAddress && !defaultAccountAddressModular) {
      throw new Error('No account address provided!');
    }

    if (!moduleType || !module) {
      throw new Error('installModule props missing');
    }

    if (module === '0x222') {
      throw new Error('module is already installed');
    }

    return '0x123';
  }

  async uninstallModule(moduleType, module, deinitData, accountAddress) {
    if (module === '0x222') {
      throw new Error('module is not installed');
    }

    if (!accountAddress && !defaultAccountAddressModular) {
      throw new Error('No account address provided!');
    }

    if (!moduleType || !module || !deinitData) {
      throw new Error('uninstallModule props missing');
    }

    return '0x456';
  }

  async getAllModules(pageSize, accountAddress) {
    if (!accountAddress && !defaultAccountAddressModular) {
      throw new Error('No account address provided!');
    }

    return {
      validators: ['0x000', '0x111', '0x222'],
    };
  }

  async isModuleInstalled(moduleType, module, accountAddress) {
    if (!accountAddress && !defaultAccountAddressModular) {
      throw new Error('No account address provided!');
    }

    if (!moduleType || !module) {
      throw new Error('uninstallModule props missing');
    }

    if (module === '0x111') {
      return true;
    }

    if (module === '0x222') {
      return false;
    }
  }
}

export const isWalletProvider = EtherspotModular.isWalletProvider;

export const Factory = EtherspotModular.Factory;

export const EtherspotBundler = jest.fn();

export default EtherspotModular;
