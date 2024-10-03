import { SendTransactionParams, Swap } from 'flash-sdk';

/**
 * Preferred source of no-send report:
 * - `only-existing-tx` - use only existing report tx, error if none
 * - `existing-or-new-tx` - try use existing report tx, create new tx if none
 * - `only-new-tx` - create new tx regardless if there is existing one
 *
 * @category Operator Client
 */
export type NoSendReportSource = 'only-existing-tx' | 'existing-or-new-tx' | 'only-new-tx';

export class NoSendReportTxData {
  public readonly swapHash: string;
  public readonly receiveChainId: string;
  public readonly receiveTxid: string;
  public readonly receiveEmitter: string;
  public readonly reportNoSendParams: SendTransactionParams;
  public readonly reportNoSendEmitter: string;
  public readonly collateralChainId: string;
  public readonly collateralContract: string;

  public constructor(
    swapHash: string,
    receiveChainId: string,
    receiveTxid: string,
    receiveEmitter: string,
    reportNoSendParams: SendTransactionParams,
    reportNoSendEmitter: string,
    collateralChainId: string,
    collateralContract: string,
  ) {
    this.swapHash = swapHash;
    this.receiveChainId = receiveChainId;
    this.receiveTxid = receiveTxid;
    this.receiveEmitter = receiveEmitter;
    this.reportNoSendParams = reportNoSendParams;
    this.reportNoSendEmitter = reportNoSendEmitter;
    this.collateralChainId = collateralChainId;
    this.collateralContract = collateralContract;
  }
}

export class NoSendReportRequest {
  public readonly operation: string | undefined;
  public readonly swap: Swap;
  public readonly data: NoSendReport | NoSendReportTxData;

  public constructor(operation: string | undefined, swap: Swap, data: NoSendReport | NoSendReportTxData) {
    this.operation = operation;
    this.data = data;
    this.swap = swap;
  }
}

export class NoSendReport {
  public readonly receiveProof: string;
  public readonly noSendProof: string;
  public readonly reporter: string;

  public constructor(receiveProof: string, noSendProof: string, reporter: string) {
    this.receiveProof = receiveProof;
    this.noSendProof = noSendProof;
    this.reporter = reporter;
  }
}

export class CollateralSlashRequest {
  public readonly slashCollateralParams: SendTransactionParams;

  public constructor(slashCollateralParams: SendTransactionParams) {
    this.slashCollateralParams = slashCollateralParams;
  }
}
