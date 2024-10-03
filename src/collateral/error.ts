import { BaseError } from 'flash-sdk';

/**
 * Error occurred in {@link FlashCollateralClient}
 *
 * @category Collateral Client
 */
export class FlashCollateralError extends BaseError {
  public constructor(message: string) {
    super('FlashCollateralError', message);
  }
}
