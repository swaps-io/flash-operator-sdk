import { WithWalletOperation } from 'flash-sdk';

import { IProofer, ProoferCapability } from 'proof-sdk';

/**
 * Params for {@link ProofFactory} constructor
 *
 * @category Proof Factory
 */
export interface ProofFactoryParams {
  /**
   * Underlying proofer to use by factory
   */
  proofer: IProofer;

  /**
   * List of proofer capabilities that should be ignored, i.e. factory should try to
   * use other capabilities reported by proofer excluding ones that are listed here
   *
   * @default []
   */
  ignoreCapabilities?: ProoferCapability[];
}

/**
 * Base proof params for {@link ProofFactory} methods
 *
 * @category Proof Factory
 */
export type BaseProofParams = WithWalletOperation;

/**
 * Params for {@link ProofFactory.addAssetReceiveEventProof} method
 *
 * @category Proof Factory
 */
export interface AssetReceiveProofParams extends BaseProofParams {
  /**
   * Hash of the swap
   */
  hash: string;

  /**
   * "from" chain ID of the swap
   */
  fromChainId: string;

  /**
   * Flash contract address on the "from" chain
   */
  fromContractAddress: string;

  /**
   * TXID of the receive transaction
   */
  receiveTxid: string;

  /**
   * Chain ID of the collateral
   */
  collateralChainId: string;

  /**
   * Flash contract address on the "collateral" chain
   */
  collateralContractAddress: string;
}

/**
 * Params for {@link ProofFactory.addAssetNoReceiveEventProof} method
 *
 * @category Proof Factory
 */
export interface AssetNoReceiveProofParams extends BaseProofParams {
  /**
   * Hash of the swap
   */
  hash: string;

  /**
   * "from" chain ID of the swap
   */
  fromChainId: string;

  /**
   * Flash contract address on the "from" chain
   */
  fromContractAddress: string;

  /**
   * TXID of the no-receive report transaction
   *
   * Empty string value is replaced with {@link AssetNoReceiveProofParams.hash | swap hash}
   */
  reportNoReceiveTxid: string;

  /**
   * Address of the reporter, i.e. caller of the report-no-receive transaction
   */
  reporter: string;

  /**
   * Chain ID of the collateral
   */
  collateralChainId: string;

  /**
   * Flash contract address on the "collateral" chain
   */
  collateralContractAddress: string;
}

/**
 * Params for {@link ProofFactory.addAssetSendEventProof} method
 *
 * @category Proof Factory
 */
export interface AssetSendProofParams extends BaseProofParams {
  /**
   * Hash of the swap
   */
  hash: string;

  /**
   * "to" chain ID of the swap
   */
  toChainId: string;

  /**
   * Flash contract address on the "to" chain
   */
  toContractAddress: string;

  /**
   * TXID of the send transaction
   */
  sendTxid: string;

  /**
   * Chain ID of the collateral
   */
  collateralChainId: string;

  /**
   * Flash contract address on the "collateral" chain
   */
  collateralContractAddress: string;
}

/**
 * Params for {@link ProofFactory.addAssetLiqSendEventProof} method
 *
 * @category Proof Factory
 */
export interface AssetLiqSendProofParams extends BaseProofParams {
  /**
   * Hash of the swap
   */
  hash: string;

  /**
   * "to" chain ID of the swap
   */
  toChainId: string;

  /**
   * Flash contract address on the "to" chain
   */
  toContractAddress: string;

  /**
   * TXID of the liq-send transaction
   */
  liqSendTxid: string;

  /**
   * Address of the liquidator, i.e. caller of the liq-send transaction
   */
  liquidator: string;

  /**
   * Chain ID of the collateral
   */
  collateralChainId: string;

  /**
   * Flash contract address on the "collateral" chain
   */
  collateralContractAddress: string;
}

/**
 * Params for {@link ProofFactory.addAssetNoSendEventProof} method
 *
 * @category Proof Factory
 */
export interface AssetNoSendProofParams extends BaseProofParams {
  /**
   * Hash of the swap
   */
  hash: string;

  /**
   * "to" chain ID of the swap
   */
  toChainId: string;

  /**
   * Flash contract address on the "to" chain
   */
  toContractAddress: string;

  /**
   * TXID of the report-no-send transaction
   *
   * Empty string value is replaced with {@link AssetNoSendProofParams.hash | swap hash}
   */
  reportNoSendTxid: string;

  /**
   * Address of the reporter, i.e. caller of the report-no-send transaction
   */
  reporter: string;

  /**
   * Chain ID of the collateral
   */
  collateralChainId: string;

  /**
   * Flash contract address on the "collateral" chain
   */
  collateralContractAddress: string;
}

/**
 * Params for {@link ProofFactory.addWithdrawReportEventProof} method
 *
 * @category Proof Factory
 */
export interface WithdrawReportProofParams extends BaseProofParams {
  /**
   * Collateral manager variant
   */
  variant: bigint;

  /**
   * Lock chain ID
   */
  lockChainId: string;

  /**
   * Unlock chain ID
   */
  unlockChainId: string;

  /**
   * Address of the account that is making withdraw
   */
  account: string;

  /**
   * Result of the "lockCounter" view method of the Collateral Manager contract on the lock chain
   */
  lockCounter: bigint;

  /**
   * Amount in wei to withdraw
   */
  amount: bigint;

  /**
   * Result of the "nonce" view method of the Collateral Manager contract on the lock chain
   */
  nonce: bigint;

  /**
   * Contract address on the lock chain
   */
  lockChainContractAddress: string;

  /**
   * Contract address on the unlock chain
   */
  unlockChainContractAddress: string;

  /**
   * TXID of the report-withdraw transaction
   */
  reportWithdrawTxid: string;
}
