import { SendTransactionParams } from 'flash-sdk';

export class WhitelistApproveRequest {
  public readonly approveTxParams: SendTransactionParams;

  public constructor(approveTxParams: SendTransactionParams) {
    this.approveTxParams = approveTxParams;
  }
}
