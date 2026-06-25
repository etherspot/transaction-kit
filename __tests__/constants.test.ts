import {
  NETWORK_NAME_TO_CHAIN_ID,
  NetworkNames,
  Networks,
  SupportedNetworks,
  arcTestnet,
} from '../lib/constants';
import {
  CHAIN_ID_TO_NETWORK_NAME,
  getChainFromId,
  getNetworkConfig,
} from '../lib/utils';

describe('Arc Testnet network support', () => {
  const arcTestnetChainId = 5042002;

  it('exposes Arc Testnet through supported network mappings', () => {
    expect(SupportedNetworks).toContain(arcTestnetChainId);
    expect(NETWORK_NAME_TO_CHAIN_ID[NetworkNames.ArcTestnet]).toBe(
      arcTestnetChainId
    );
    expect(CHAIN_ID_TO_NETWORK_NAME[arcTestnetChainId]).toBe(
      NetworkNames.ArcTestnet
    );
  });

  it('returns Arc Testnet chain and bundler configuration', () => {
    const config = getNetworkConfig(arcTestnetChainId);

    expect(config).toBe(Networks[arcTestnetChainId]);
    expect(config).toMatchObject({
      chainId: arcTestnetChainId,
      chain: arcTestnet,
      bundler: 'https://testnet-rpc.etherspot.io/v2/5042002',
      contracts: {
        entryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
        walletFactory: '0x38CC0EDdD3a944CA17981e0A19470d2298B8d43a',
        bootstrap: '0xCF2808eA7d131d96E5C73Eb0eCD8Dc84D33905C7',
        multipleOwnerECDSAValidator:
          '0x0eA25BF9F313344d422B513e1af679484338518E',
        hookMultiPlexer: '0xDcA918dd23456d321282DF9507F6C09A50522136',
      },
    });
  });

  it('defines Arc Testnet viem chain metadata', () => {
    const chain = getChainFromId(arcTestnetChainId);

    expect(chain.id).toBe(arcTestnetChainId);
    expect(chain.name).toBe('Arc Testnet');
    expect(chain.nativeCurrency).toEqual({
      decimals: 18,
      name: 'USDC',
      symbol: 'USDC',
    });
    expect(chain.rpcUrls.default.http).toContain(
      'https://rpc.testnet.arc.network'
    );
    expect(chain.rpcUrls.default.webSocket).toContain(
      'wss://rpc.testnet.arc.network'
    );
    expect(chain.blockExplorers?.default.url).toBe(
      'https://testnet.arcscan.app'
    );
    expect(chain.testnet).toBe(true);
  });
});
