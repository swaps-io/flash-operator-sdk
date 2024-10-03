import { BaseError } from 'flash-sdk';

/**
 * Error occurred in {@link ProofFactory}
 *
 * @category Proof Factory
 */
export class ProofFactoryError extends BaseError {
  public constructor(message: string) {
    super('ProofFactoryError', message);
  }
}
