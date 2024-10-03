import { BaseError } from 'flash-sdk';

/**
 * Error occurred in {@link FlashOperatorClient}
 *
 * @category Operator Client
 */
export class FlashOperatorError extends BaseError {
  public constructor(message: string) {
    super('FlashOperatorError', message);
  }
}
