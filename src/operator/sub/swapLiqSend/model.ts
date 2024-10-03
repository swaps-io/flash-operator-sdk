import { SendTransactionParams, Swap } from 'flash-sdk';

/**
 * Preferred source of liq-send:
 * - `only-existing-tx` - use only existing liq-send tx, error if none
 * - `existing-or-new-tx` - try use existing liq-send tx, create new tx if none
 * - `only-new-tx` - create new tx regardless if there is existing one
 *
 * @category Operator Client
 */
export type LiqSendSource = 'only-existing-tx' | 'existing-or-new-tx' | 'only-new-tx';

export class LiqSendTxData {
  public readonly swapHash: string;
  public readonly receiveChainId: string;
  public readonly receiveTxid: string;
  public readonly receiveEmitter: string;
  public readonly liqSendParams: SendTransactionParams;
  public readonly liqSendEmitter: string;
  public readonly collateralChainId: string;
  public readonly collateralContract: string;

  public constructor(
    swapHash: string,
    receiveChainId: string,
    receiveTxid: string,
    receiveEmitter: string,
    liqSendParams: SendTransactionParams,
    liqSendEmitter: string,
    collateralChainId: string,
    collateralContract: string,
  ) {
    this.swapHash = swapHash;
    this.receiveChainId = receiveChainId;
    this.receiveTxid = receiveTxid;
    this.receiveEmitter = receiveEmitter;
    this.liqSendParams = liqSendParams;
    this.liqSendEmitter = liqSendEmitter;
    this.collateralChainId = collateralChainId;
    this.collateralContract = collateralContract;
  }
}

export class LiqSendRequest {
  public readonly operation: string | undefined;
  public readonly swap: Swap;
  public readonly data: LiqSendData | LiqSendTxData;

  public constructor(operation: string | undefined, swap: Swap, data: LiqSendData | LiqSendTxData) {
    this.operation = operation;
    this.data = data;
    this.swap = swap;
  }
}

export class LiqSendData {
  public readonly receiveProof: string;
  public readonly liqSendProof: string;
  public readonly liquidator: string;

  public constructor(receiveProof: string, liqSendProof: string, liquidator: string) {
    this.receiveProof = receiveProof;
    this.liqSendProof = liqSendProof;
    this.liquidator = liquidator;
  }
}

export class CollateralSlashRequest {
  public readonly slashCollateralParams: SendTransactionParams;

  public constructor(slashCollateralParams: SendTransactionParams) {
    this.slashCollateralParams = slashCollateralParams;
  }
}
