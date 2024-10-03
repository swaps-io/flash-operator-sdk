import { SendTransactionParams } from 'flash-sdk';

export class SwapConfirmRequest {
  public readonly swapConfirmParams: SendTransactionParams;

  public constructor(swapConfirmParams: SendTransactionParams) {
    this.swapConfirmParams = swapConfirmParams;
  }
}
