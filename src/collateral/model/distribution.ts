import { Amount, Chain, Crypto } from 'flash-sdk';

/**
 * Distribution specification of the deposit action
 *
 * @category Collateral Client
 */
export interface DepositDistribution {
  /**
   * Chain or its ID where to distribute collateral to
   */
  chain: Chain | string;

  /**
   * Amount to deposit for the chain
   */
  amount: Amount;

  /**
   * Crypto or its ID that will be used to deposit collateral
   */
  crypto: Crypto | string;
}
