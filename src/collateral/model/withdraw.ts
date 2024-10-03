import { SendTransactionParams } from 'flash-sdk';

import { WithdrawReport } from '../../lib/contract/collateral/withdrawReport';

export type WithdrawReportParams = Omit<WithdrawReport, 'variant'>;

export class WithdrawReportRequest {
  public readonly operation: string | undefined;
  public readonly withdrawReportTxParams: SendTransactionParams;
  public readonly withdrawReport: WithdrawReportParams;

  public constructor(
    operation: string | undefined,
    withdrawReportTxParams: SendTransactionParams,
    withdrawReport: WithdrawReportParams,
  ) {
    this.operation = operation;
    this.withdrawReportTxParams = withdrawReportTxParams;
    this.withdrawReport = withdrawReport;
  }
}

export class WithdrawReportResult {
  public readonly withdrawReportProof: string;
  public readonly withdrawReport: WithdrawReportParams;

  public constructor(withdrawReportProof: string, withdrawReport: WithdrawReportParams) {
    this.withdrawReportProof = withdrawReportProof;
    this.withdrawReport = withdrawReport;
  }
}

export class WithdrawRequest {
  public readonly withdrawTxParams: SendTransactionParams;

  public constructor(withdrawTxParams: SendTransactionParams) {
    this.withdrawTxParams = withdrawTxParams;
  }
}
