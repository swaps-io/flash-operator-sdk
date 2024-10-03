import { SendTransactionParams } from 'flash-sdk';

export class DepositRequest {
  public readonly depositTxParams: SendTransactionParams;

  public constructor(depositTxParams: SendTransactionParams) {
    this.depositTxParams = depositTxParams;
  }
}
