import { BigNumber } from 'ethers';
import { parseUnits } from 'viem';

export const defaultAccountAddress =
  '0x7F30B1960D5556929B03a0339814fE903c55a347';
export const otherFactoryDefaultAccountAddress =
  '0xe383724e3bDC4753746dEC781809f8CD82010914';
export const otherAccountAddress = '0xAb4C67d8D7B248B2fA6B638C645466065fE8F1F1';

export class ModularSdk {
  sdkChainId;
  userOps = [];
  nonce = BigNumber.from(1);
  factoryWallet;

  constructor(provider, config) {
    this.sdkChainId = config.chainId;
    this.factoryWallet = config.factoryWallet;
  }

  getCounterFactualAddress() {
    if (this.factoryWallet === 'etherspot') {
      return defaultAccountAddress;
    }
    return otherFactoryDefaultAccountAddress;
  }

  async clearUserOpsFromBatch() {
    this.userOps = [];
  }

  async addUserOpsToBatch(userOp) {
    this.userOps.push(userOp);
  }

  async estimate({ paymasterDetails: paymaster }) {
    let maxFeePerGas = parseUnits('1', 9);
    let maxPriorityFeePerGas = parseUnits('1', 9);
    let callGasLimit = BigNumber.from('50000');
    let signature = '0x004';

    if (paymaster?.url === 'someUrl') {
      maxFeePerGas = parseUnits('2', 9);
      maxPriorityFeePerGas = parseUnits('3', 9);
      callGasLimit = BigNumber.from('75000');
    }

    if (paymaster?.url === 'someUnstableUrl') {
      signature = '0x0';
    }

    let finalGasLimit = BigNumber.from(callGasLimit);

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
      sender: defaultAccountAddress,
      nonce: this.nonce,
      initCode: '0x001',
      callData: '0x002',
      callGasLimit: finalGasLimit,
      verificationGasLimit: BigNumber.from('25000'),
      preVerificationGas: BigNumber.from('75000'),
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
    const deInitData = '0000000000000000000000000000000000000001';
    return deInitData;
  }

  async installModule(moduleType, module, initData, accountAddress) {
    if (!accountAddress && !defaultAccountAddress) {
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

    if (!accountAddress && !defaultAccountAddress) {
      throw new Error('No account address provided!');
    }

    if (!moduleType || !module || !deinitData) {
      throw new Error('uninstallModule props missing');
    }

    return '0x456';
  }

  async getAllModules(pageSize, accountAddress) {
    if (!accountAddress && !defaultAccountAddress) {
      throw new Error('No account address provided!');
    }

    return {
      validators: ['0x000', '0x111', '0x222'],
    };
  }

  async isModuleInstalled(moduleType, module, accountAddress) {
    if (!accountAddress && !defaultAccountAddress) {
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

export const Factory = 'etherspot';

export const EtherspotBundler = jest.fn();
