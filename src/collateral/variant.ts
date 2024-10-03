/**
 * Collateral manager variant. Different variants correspond to different
 * contracts with own set of balance tokens and counters for them
 *
 * @category Collateral Client
 */
export enum CollateralVariant {
  /**
   * Stablecoin collateral manager variant, holding USD-equivalent assets
   */
  Stablecoin = 'stablecoin',

  /**
   * Bitcoin collateral manager variant, holding BTC-equivalent assets
   */
  Bitcoin = 'bitcoin',
}
