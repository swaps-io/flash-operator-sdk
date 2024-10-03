import { AbiSpec, Cache, CryptoAggregator, IChainProvider, ICryptoDataSource, getEvmProvider, isNull } from 'flash-sdk';
import { Crypto, Duration } from 'flash-sdk';

import { IMulticallElement, MulticallDecoder, MulticallEncodableElement, MulticallEncoder } from '../helper/multicall';

import { COLLATERAL_ABI } from './abi/collateral';
import { CollateralVariant } from './variant';

export class CollateralCryptoAggregator extends CryptoAggregator {
  private readonly collateralUnlockerContracts: Map<string, Cache<string>>;
  private readonly collateralLockerContracts: Map<string, Cache<string>>;
  private readonly balanceTokens: Map<string, Cache<string[]>>;
  private readonly collateralDecimals: Map<string, Cache<number>>;
  private readonly accessWhitelists: Map<string, Cache<string>>;
  private readonly cacheTtl: Duration;
  private readonly chainProvider: IChainProvider;

  public constructor(cacheTtl: Duration, cryptoDataSource: ICryptoDataSource, chainProvider: IChainProvider) {
    super(cacheTtl, cryptoDataSource);
    this.collateralUnlockerContracts = new Map();
    this.collateralLockerContracts = new Map();
    this.collateralDecimals = new Map();
    this.balanceTokens = new Map();
    this.accessWhitelists = new Map();
    this.cacheTtl = cacheTtl;
    this.chainProvider = chainProvider;
  }

  public async getMainContractAddress(chainId: string): Promise<string> {
    await this.getCryptoData(false);
    const contract = this.getContractByChainId(chainId);
    return contract.address;
  }

  public async getCollateralUnlockerContractAddress(chainId: string, variant: CollateralVariant): Promise<string> {
    const collateralUnlockerContract = await this.getCacheValue(
      this.collateralUnlockerContracts,
      chainId,
      variant,
      (...args) => this.loadCollateralUnlockerContract(...args),
    );
    return collateralUnlockerContract;
  }

  public async getCollateralLockerContractAddress(chainId: string, variant: CollateralVariant): Promise<string> {
    const collateralLockerContract = await this.getCacheValue(
      this.collateralLockerContracts,
      chainId,
      variant,
      (...args) => this.loadCollateralLockerContract(...args),
    );
    return collateralLockerContract;
  }

  public async getAccessWhitelistContractAddress(chainId: string, variant: CollateralVariant): Promise<string> {
    const accessWhitelist = await this.getCacheValue(this.accessWhitelists, chainId, variant, (...args) =>
      this.loadAccessWhitelist(...args),
    );
    return accessWhitelist;
  }

  public async getCollateralDecimals(chainId: string, variant: CollateralVariant): Promise<number> {
    const collateralDecimals = await this.getCacheValue(this.collateralDecimals, chainId, variant, (...args) =>
      this.loadCollateralDecimals(...args),
    );
    return collateralDecimals;
  }

  public async getCollateralCryptosByChainId(
    chainId: string,
    variant: CollateralVariant,
  ): Promise<Map<string, Crypto>> {
    const tokenAddresses = await this.getBalanceTokenAddresses(chainId, variant);
    const cryptos = new Map<string, Crypto>();
    for (const tokenAddress of tokenAddresses) {
      const cryptoId = Crypto.makeId(chainId, tokenAddress);
      const crypto = this.getCryptoById(cryptoId);
      cryptos.set(tokenAddress.toLowerCase(), crypto);
    }
    return cryptos;
  }

  private async getBalanceTokenAddresses(chainId: string, variant: CollateralVariant): Promise<string[]> {
    const balanceTokens = await this.getCacheValue(this.balanceTokens, chainId, variant, (...args) =>
      this.loadBalanceTokens(...args),
    );
    return balanceTokens;
  }

  private async getCacheValue<T>(
    cacheMap: Map<string, Cache<T>>,
    chainId: string,
    variant: CollateralVariant,
    load: (chainId: string, variant: CollateralVariant) => Promise<T>,
  ): Promise<T> {
    const cacheKey = `${chainId}/${variant}`;
    let cache = cacheMap.get(cacheKey);
    if (isNull(cache)) {
      cache = new Cache(this.cacheTtl, () => load(chainId, variant));
      cacheMap.set(cacheKey, cache);
    }
    const value = await cache.get();
    return value;
  }

  private async loadCollateralUnlockerContract(chainId: string, variant: CollateralVariant): Promise<string> {
    const mainContract = await this.getMainContractAddress(chainId);
    const collateralUnlockerContract = await this.readCollateralUnlockerContract(chainId, mainContract, variant);
    return collateralUnlockerContract;
  }

  private async loadCollateralLockerContract(chainId: string, variant: CollateralVariant): Promise<string> {
    const mainContract = await this.getMainContractAddress(chainId);
    const collateralLockerContract = await this.readCollateralLockerContract(chainId, mainContract, variant);
    return collateralLockerContract;
  }

  private async loadCollateralDecimals(chainId: string, variant: CollateralVariant): Promise<number> {
    const collateralUnlockerContract = await this.getCollateralUnlockerContractAddress(chainId, variant);
    const collateralDecimals = await this.readCollateralDecimals(chainId, collateralUnlockerContract);
    return collateralDecimals;
  }

  private async loadBalanceTokens(chainId: string, variant: CollateralVariant): Promise<string[]> {
    const collateralUnlockerContract = await this.getCollateralUnlockerContractAddress(chainId, variant);
    const totalBalanceTokens = await this.readTotalBalanceTokens(chainId, collateralUnlockerContract);
    const balanceTokens = await this.readBalanceTokens(chainId, collateralUnlockerContract, totalBalanceTokens);
    return balanceTokens;
  }

  private async loadAccessWhitelist(chainId: string, variant: CollateralVariant): Promise<string> {
    const collateralLockerContract = await this.getCollateralLockerContractAddress(chainId, variant);
    const accessWhitelist = await this.readAccessWhitelist(chainId, collateralLockerContract);
    return accessWhitelist;
  }

  private async readCollateralUnlockerContract(
    chainId: string,
    mainContract: string,
    variant: CollateralVariant,
  ): Promise<string> {
    const address = await this.readCollateralContractView(chainId, mainContract, variant, COLLATERAL_UNLOCKER_VIEW_MAP);
    return address;
  }

  private async readCollateralLockerContract(
    chainId: string,
    mainContract: string,
    variant: CollateralVariant,
  ): Promise<string> {
    const address = await this.readCollateralContractView(chainId, mainContract, variant, COLLATERAL_LOCKER_VIEW_MAP);
    return address;
  }

  private async readCollateralContractView(
    chainId: string,
    mainContract: string,
    variant: CollateralVariant,
    viewMap: CollateralViewMap,
  ): Promise<string> {
    const abi = await viewMap[variant].getAbi();
    const view = viewMap[variant].viewName;

    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(abi, view);
    const callResultData = await this.chainProvider.call({
      chainId: chainId,
      to: mainContract,
      data: data,
    });

    const address: string = await evm.functionResultDecode(abi, view, callResultData);
    return address;
  }

  private async readTotalBalanceTokens(chainId: string, collateralUnlockerContract: string): Promise<number> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'TOTAL_BALANCE_TOKENS');
    const callResultData = await this.chainProvider.call({
      chainId: chainId,
      to: collateralUnlockerContract,
      data: data,
    });

    const tokens: number = await evm.functionResultDecode(COLLATERAL_ABI, 'TOTAL_BALANCE_TOKENS', callResultData);
    return Number(tokens);
  }

  private async readBalanceTokens(
    chainId: string,
    collateralUnlockerContract: string,
    totalBalanceTokens: number,
  ): Promise<string[]> {
    if (totalBalanceTokens === 0) {
      return [];
    }

    const evm = getEvmProvider();

    const encodeGetToken = async (index: number): Promise<string> => {
      return await evm.functionDataEncode(COLLATERAL_ABI, 'balanceTokenByIndex', [index]);
    };

    const multicallElements: IMulticallElement[] = [];
    for (let i = 0; i < totalBalanceTokens; i++) {
      multicallElements.push(new MulticallEncodableElement(i, encodeGetToken));
    }

    const encoder = new MulticallEncoder();
    const data = await encoder.encode(multicallElements);
    const callResultData = await this.chainProvider.call({
      chainId: chainId,
      to: collateralUnlockerContract,
      data: data,
    });

    const decodeToken = (data: string): Promise<string> =>
      evm.functionResultDecode(COLLATERAL_ABI, 'balanceTokenByIndex', data);

    const decoder = new MulticallDecoder(decodeToken);
    const addresses = await decoder.decode(callResultData, totalBalanceTokens);
    return addresses;
  }

  private async readAccessWhitelist(chainId: string, collateralConfigContract: string): Promise<string> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'ACCESS_WHITELIST');
    const callResultData = await this.chainProvider.call({
      chainId: chainId,
      to: collateralConfigContract,
      data: data,
    });

    const address: string = await evm.functionResultDecode(COLLATERAL_ABI, 'ACCESS_WHITELIST', callResultData);
    return address;
  }

  private async readCollateralDecimals(chainId: string, collateralUnlockerContract: string): Promise<number> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'DECIMALS');
    const callResultData = await this.chainProvider.call({
      chainId: chainId,
      to: collateralUnlockerContract,
      data: data,
    });

    const decimals: number = await evm.functionResultDecode(COLLATERAL_ABI, 'DECIMALS', callResultData);
    return decimals;
  }
}

interface CollateralViewDescriptor {
  getAbi(): Promise<AbiSpec>;
  viewName: string;
}

type CollateralViewMap = Record<CollateralVariant, CollateralViewDescriptor>;

const COLLATERAL_UNLOCKER_VIEW_MAP: CollateralViewMap = {
  [CollateralVariant.Stablecoin]: {
    getAbi: async () => {
      const spec = await import('./abi/orderResolverFacet');
      return spec.ORDER_RESOLVER_FACET_ABI;
    },
    viewName: 'resolverCollateralUnlocker',
  },
  [CollateralVariant.Bitcoin]: {
    getAbi: async () => {
      const spec = await import('./abi/orderBitcoinResolverFacet');
      return spec.ORDER_BITCOIN_RESOLVER_FACET_ABI;
    },
    viewName: 'bitcoinResolverCollateralUnlocker',
  },
};

const COLLATERAL_LOCKER_VIEW_MAP: CollateralViewMap = {
  [CollateralVariant.Stablecoin]: {
    getAbi: async () => {
      const spec = await import('./abi/orderReceiverFacet');
      return spec.ORDER_RECEIVER_FACET_ABI;
    },
    viewName: 'receiverCollateralLocker',
  },
  [CollateralVariant.Bitcoin]: {
    getAbi: async () => {
      const spec = await import('./abi/orderBitcoinReceiverFacet');
      return spec.ORDER_BITCOIN_RECEIVER_FACET_ABI;
    },
    viewName: 'bitcoinReceiverCollateralLocker',
  },
};
