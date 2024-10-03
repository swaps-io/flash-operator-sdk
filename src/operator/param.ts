import {
  AxiosInstanceSource,
  Dynamic,
  ICryptoApproveProvider,
  IWalletLike,
  Swap,
  WithWalletOperation,
} from 'flash-sdk';

import { IProofer } from 'proof-sdk';

import { LiqSendSource } from './sub/swapLiqSend/model';
import { NoSendReportSource } from './sub/swapSlash/model';

export type { NoSendReportSource };
export type { LiqSendSource };

/**
 * Params for {@link FlashOperatorClient} constructor
 *
 * @category Operator Client
 */
export interface FlashOperatorClientParams {
  /**
   * Wallet provider to use for signing quotes & sending transactions
   *
   * @default Swap functionality unavailable:
   * - Slash swap (including no-send report)
   * - Liquidate swap send (including approve)
   * - Confirm swap
   */
  wallet?: Dynamic<IWalletLike>;

  /**
   * Allowance provider to use for checking allowance and making approves
   *
   * @default ApiCryptoApproveProvider({ wallet }) or NoWalletCryptoApproveProvider()
   */
  cryptoApprove?: ICryptoApproveProvider;

  /**
   * Proof provider to use for swap collateral slash functionality
   *
   * Needed for using the following methods:
   * - {@link FlashOperatorClient.slashSwap}
   *
   * @default Slash functionality unavailable
   */
  proofer?: Dynamic<IProofer>;

  /**
   * Client for Flash Main API access
   *
   * @default 'https://api.prod.swaps.io'
   */
  mainClient?: AxiosInstanceSource;
}

/**
 * Params for {@link FlashOperatorClient.slashSwap} method
 *
 * @category Operator Client
 */
export interface SlashSwapParams extends WithWalletOperation {
  /**
   * Instance of swap to perform slash procedure for
   */
  swap: Swap;

  /**
   * Preferred no-send report source
   *
   * @default 'existing-or-new-tx'
   */
  noSendReportSource?: NoSendReportSource;
}

/**
 * Params for {@link FlashOperatorClient.liquidateSwap} method
 *
 * @category Operator Client
 */
export interface LiquidateSwapParams extends WithWalletOperation {
  /**
   * Instance of swap to perform slash procedure for
   */
  swap: Swap;

  /**
   * Preferred liq-send report source
   *
   * @default 'existing-or-new-tx'
   */
  liquidateSource?: LiqSendSource;
}

/**
 * Params for {@link FlashOperatorClient.confirmSwap} method
 *
 * @category Operator Client
 */
export interface ConfirmSwapParams extends WithWalletOperation {
  /**
   * Instance of swap to perform confirm
   */
  swap: Swap;
}
