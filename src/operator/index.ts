import {
  ApiCryptoApproveProvider,
  CryptoApprover,
  IWalletLike,
  NoWalletCryptoApproveProvider,
  isNotNull,
} from 'flash-sdk';

import { IProofer } from 'proof-sdk';

import { setAxiosInstanceMainV0 } from '../api/client/axios/main-v0';

import { FlashOperatorOptionalValue } from './optional';
import { ConfirmSwapParams, FlashOperatorClientParams, LiquidateSwapParams, SlashSwapParams } from './param';
import { SwapConfirmSubClient } from './sub/swapConfirm';
import { SwapLiqSendSubClient } from './sub/swapLiqSend';
import { SwapSlashSubClient } from './sub/swapSlash';

export type * from './param';
export type * from './error';

/**
 * Client for interaction with Flash on operator level
 *
 * @category Operator Client
 */
export class FlashOperatorClient {
  private readonly wallet: FlashOperatorOptionalValue<IWalletLike>;
  private readonly proofer: FlashOperatorOptionalValue<IProofer>;
  private readonly cryptoApprover: CryptoApprover;
  private readonly swapSlash: SwapSlashSubClient;
  private readonly swapLiqSend: SwapLiqSendSubClient;
  private readonly swapConfirm: SwapConfirmSubClient;

  public constructor(params: FlashOperatorClientParams = {}) {
    const {
      wallet,
      proofer,
      cryptoApprove = isNotNull(wallet)
        ? new ApiCryptoApproveProvider({ wallet })
        : new NoWalletCryptoApproveProvider(),
      mainClient = 'https://api.prod.swaps.io',
    } = params;

    setAxiosInstanceMainV0(mainClient);

    this.wallet = new FlashOperatorOptionalValue(wallet);
    this.proofer = new FlashOperatorOptionalValue(proofer);
    this.cryptoApprover = new CryptoApprover(cryptoApprove);
    this.swapSlash = new SwapSlashSubClient(this.wallet, this.proofer);
    this.swapLiqSend = new SwapLiqSendSubClient(this.wallet, this.proofer, this.cryptoApprover);
    this.swapConfirm = new SwapConfirmSubClient(this.wallet, this.proofer);
  }

  /**
   * Slashes swap collateral (if eligible)
   *
   * Combines the following actions:
   * - report swap no-send (on the 'to' chain, optional)
   * - slash swap collateral (on the 'collateral' chain)
   *
   * @param params The operation {@link SlashSwapParams | params}
   */
  public async slashSwap(params: SlashSwapParams): Promise<void> {
    const noSendReportRequest = await this.swapSlash.prepareNoSendReport(
      params.operation,
      params.swap,
      params.noSendReportSource,
    );
    const noSendReport = await this.swapSlash.reportNoSend(noSendReportRequest);

    const collateralSlashRequest = await this.swapSlash.prepareCollateralSlash(
      params.operation,
      params.swap,
      noSendReport,
    );
    await this.swapSlash.slashCollateral(collateralSlashRequest);
  }

  /**
   * Liquidates swap collateral (if eligible)
   *
   * Combines the following actions:
   * - liq-send swap (on the 'to' chain, optional)
   * - slash swap collateral (on the 'collateral' chain)
   *
   * @param params The operation {@link LiquidateSwapParams | params}
   */
  public async liquidateSwap(params: LiquidateSwapParams): Promise<void> {
    const liqSendRequest = await this.swapLiqSend.prepareLiqSend(params.operation, params.swap, params.liquidateSource);
    const liqSendData = await this.swapLiqSend.liqSend(liqSendRequest);

    const collateralSlashRequest = await this.swapLiqSend.prepareCollateralSlash(
      params.operation,
      params.swap,
      liqSendData,
    );
    await this.swapLiqSend.slashCollateral(collateralSlashRequest);
  }

  /**
   * Confirms swap execution for collateral unlock (if eligible)
   *
   * Combines the following actions:
   * - confirm swap (on the 'collateral' chain)
   *
   * @param params The operation {@link ConfirmSwapParams | params}
   */
  public async confirmSwap(params: ConfirmSwapParams): Promise<void> {
    const swapConfirmRequest = await this.swapConfirm.prepareSwapConfirm(params.operation, params.swap);
    await this.swapConfirm.confirmSwap(swapConfirmRequest);
  }
}
