import { BITCOIN_CHAIN_ID } from 'flash-sdk';

import { BitcoinProoferTargetInfo, IBitcoinProoferConfig, ProofTargetParams, ProofTargetSelector } from 'proof-sdk';

/**
 * Bitcoin proofer config for collateral contracts deploy `v2.14.0-beta`
 *
 * @category Proofer Config
 */
export class CollateralBitcoinProoferConfig_2_14_0_Beta implements IBitcoinProoferConfig {
  private readonly targets: ProofTargetSelector<BitcoinProoferTargetInfo>;

  public constructor() {
    type SourceParams = Pick<ProofTargetParams, 'emitChainId'>;
    type TargetParams = SourceParams & BitcoinProoferTargetInfo;

    const targetParams100 = (params: SourceParams): ProofTargetParams => {
      return {
        emitChainId: params.emitChainId,
        consumeChainId: '100',
        consumeAddress: '0x8271BeCaD4C7114488461BeD1B9193d4A5126797', // Main
      };
    };

    const target100 = (params: TargetParams): [ProofTargetParams, BitcoinProoferTargetInfo] => {
      return [targetParams100(params), params];
    };

    this.targets = new ProofTargetSelector([
      target100({
        emitChainId: BITCOIN_CHAIN_ID,
        bitcoinProofVerifier: '0xA9579DC50DD0952077B04323E9AAAF2470989d12',
      }),
    ]);
  }

  public async selectTarget(params: ProofTargetParams): Promise<BitcoinProoferTargetInfo> {
    return Promise.resolve(this.targets.selectTarget(params));
  }
}
