import {
  Amount,
  Chain,
  Crypto,
  Duration,
  IChainProvider,
  ICryptoApproveProvider,
  ICryptoDataSource,
  IWallet,
  WithWalletOperation,
} from 'flash-sdk';

import { IProofer } from 'proof-sdk';

import { DepositDistribution } from './model/distribution';
import { CollateralVariant } from './variant';

export type { DepositDistribution };

/**
 * Params for {@link FlashCollateralClient} constructor
 *
 * @category Collateral Client
 */
export interface FlashCollateralClientParams {
  /**
   * Wallet provider to use for sending transactions
   */
  wallet: IWallet;

  /**
   * Chain provider to use fetching on-chain data
   */
  chain: IChainProvider;

  /**
   * Crypto allowance provider, i.e. approve & permit functionality conductor
   *
   * @default ApiCryptoApproveProvider({ wallet })
   */
  cryptoApprove?: ICryptoApproveProvider;

  /**
   * Time duration contract addresses cache is considered relevant after fetch
   *
   * @default Duration.fromHours(1)
   */
  contractCacheTtl?: Duration;

  /**
   * Data source for cryptos
   *
   * @default ApiCryptoDataSource
   */
  cryptoDataSource?: ICryptoDataSource;

  /**
   * Proof provider to use for withdraw collateral functionality
   *
   * Needed for using the following methods:
   * - {@link FlashCollateralClient.withdraw}
   *
   * @default Withdraw functionality unavailable
   */
  proofer?: IProofer;

  /**
   * Collateral version to use by default for collateral manager client methods.
   * Variant specified in method params still may override this value
   *
   * @default CollateralVariant.Stablecoin
   */
  defaultVariant?: CollateralVariant;
}

/**
 * Collateral variant param provider for operation
 *
 * @category Collateral Client
 */
export interface WithCollateralVariant {
  /**
   * Collateral variant to use for operation
   *
   * When unset, uses the default variant specified in
   * {@link FlashCollateralClientParams.defaultVariant | constructor}
   *
   * @default Default variant from constructor (CollateralVariant.Stablecoin if unset)
   */
  variant?: CollateralVariant;
}

/**
 * Params for {@link FlashCollateralClient.getCollateralChains} method
 *
 * @category Collateral Client
 */
export interface GetCollateralChainsParams extends WithCollateralVariant {
  /**
   * Should chain data load be forced or allow usage of cached values
   *
   * @default false
   */
  force?: boolean;
}

/**
 * Params for {@link FlashCollateralClient.getDistributionChains} method
 *
 * @category Collateral Client
 */
export interface GetDistributionChainsParams extends WithCollateralVariant {
  /**
   * Chain or its ID where the collateral is deposited
   */
  collateralChain: Chain | string;

  /**
   * Should chain data load be forced or allow usage of cached values
   *
   * @default false
   */
  force?: boolean;
}

/**
 * Params for {@link FlashCollateralClient.getCollateralCryptos} method
 *
 * @category Collateral Client
 */
export interface GetCollateralCryptosParams extends WithCollateralVariant {
  /**
   * Chain or its ID where the collateral is deposited
   */
  collateralChain: Chain | string;

  /**
   * Should chain data load be forced or allow usage of cached values
   *
   * @default false
   */
  force?: boolean;
}

/**
 * Params for {@link FlashCollateralClient.deposit} method
 *
 * @category Collateral Client
 */
export interface DepositParams extends WithWalletOperation, WithCollateralVariant {
  /**
   * Chain or its ID where to deposit collateral
   */
  collateralChain: Chain | string;

  /**
   * Deposit distribution configuration
   */
  distribution: DepositDistribution | DepositDistribution[];
}

/**
 * Params for {@link FlashCollateralClient.withdraw} method
 *
 * @category Collateral Client
 */
export interface WithdrawParams extends WithWalletOperation, WithCollateralVariant {
  /**
   * Chain or its ID where to withdraw collateral, i.e. where the collateral was deposited
   */
  collateralChain: Chain | string;

  /**
   * Chain or its ID where the collateral was distributed to
   */
  distributionChain: Chain | string;

  /**
   * Crypto or its ID to withdraw
   *
   */
  withdrawCrypto: Crypto | string;

  /**
   * Amount to withdraw
   *
   * @default Max available withdraw amount
   */
  withdrawAmount?: Amount;

  /**
   * Skip previous withdraw if necessary
   *
   * @default true
   */
  skipPreviousWithdraw?: boolean;
}

/**
 * Params for {@link FlashCollateralClient.whitelistApprove} method
 *
 * @category Collateral Client
 */
export interface WhitelistApproveParams extends WithWalletOperation, WithCollateralVariant {
  /**
   * Chain or its ID where to approve whitelist
   */
  chain: Chain | string;

  /**
   * Contract address to approve
   *
   * @default Flash address
   */
  contractAddress?: string;

  /**
   * Approve contract preference
   * If approveStrong than it doesn't revoke when protocol is revoked by owner
   *
   * @default true
   */
  approveStrong?: boolean;
}

/**
 * Params for {@link FlashCollateralClient.getCollateralBalance} method
 *
 * @category Collateral Client
 */
export interface GetCollateralBalanceParams extends WithCollateralVariant {
  /**
   * Address of the account to get collateral balance of
   */
  account: string;

  /**
   * Chain or its ID where the collateral is deposited in
   */
  collateralChain: Chain | string;

  /**
   * Chain or its ID where the collateral is distributed to
   */
  distributionChain: Chain | string;
}

/**
 * Params for {@link FlashCollateralClient.getCollateralBalanceByCrypto} method
 *
 * @category Collateral Client
 */
export interface GetCollateralBalanceByCryptoParams extends WithCollateralVariant {
  /**
   * Address of the account to get collateral balance by crypto for
   */
  account: string;

  /**
   * Chain or its ID where the collateral is deposited in
   */
  collateralChain: Chain | string;

  /**
   * Chain or its ID where the collateral is distributed to
   */
  distributionChain: Chain | string;

  /**
   * Crypto or its ID which was used to deposit collateral
   */
  crypto: Crypto | string;
}

/**
 * Params for {@link FlashCollateralClient.getUnlockedCounter} method
 *
 * @category Collateral Client
 */
export interface GetUnlockedCounterParams extends WithCollateralVariant {
  /**
   * Address of the account to get unlocked counter for
   */
  account: string;

  /**
   * Chain or its ID where the collateral is deposited in
   */
  collateralChain: Chain | string;

  /**
   * Chain or its ID where the collateral is distributed to
   */
  distributionChain: Chain | string;
}

/**
 * Params for {@link FlashCollateralClient.getLockedCounter} method
 *
 * @category Collateral Client
 */
export interface GetLockedCounterParams extends WithCollateralVariant {
  /**
   * Address of the account
   */
  account: string;

  /**
   * Chain or its ID where the collateral is deposited in
   */
  collateralChain: Chain | string;

  /**
   * Chain or its ID where the collateral is distributed to
   */
  distributionChain: Chain | string;
}
