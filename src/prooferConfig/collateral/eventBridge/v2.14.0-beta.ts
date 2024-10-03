import {
  EventBridgeTargetInfo,
  IEventBridgeProoferConfig,
  ProofTargetParams,
  ProofTargetSelector,
  Provider,
} from 'proof-sdk';

/**
 * Event bridge proofer config for collateral contracts deploy `v2.14.0-beta`
 *
 * @category Proofer Config
 */
export class CollateralEventBridgeProoferConfig_2_14_0_Beta implements IEventBridgeProoferConfig {
  private readonly targets: ProofTargetSelector<EventBridgeTargetInfo>;

  public constructor() {
    type SourceParams = Pick<ProofTargetParams, 'emitChainId'>;
    type TargetParams = SourceParams & EventBridgeTargetInfo;

    const targetParams100 = (params: SourceParams): ProofTargetParams => {
      return {
        emitChainId: params.emitChainId,
        consumeChainId: '100',
        consumeAddress: '0x8271BeCaD4C7114488461BeD1B9193d4A5126797',
      };
    };

    const target100 = (params: TargetParams): [ProofTargetParams, EventBridgeTargetInfo] => {
      return [targetParams100(params), params];
    };

    this.targets = new ProofTargetSelector([
      target100({
        emitChainId: '137',
        reporterAddress: '0x382D6F8A2789822aE0dc57C9D5F9fA58E4240A1b',
        adapterAddress: '0x761044EAFB06AD3D8B0e84566e899a35C8bbb479',
        transports: [
          {
            provider: Provider.Hyperlane,
            index: 0,
            senderAddress: '0x13431DdE6d79A14eB7f017c005DD21d137418904',
            receiverAddress: '0x427807bEd20E6949c011539c805BdDF8D3b418fe',
          },
          {
            provider: Provider.LayerZero,
            index: 1,
            senderAddress: '0x8090147eA2dC4E4e5fb5C0b247EEF34932bD75e9',
            receiverAddress: '0xC59EA72C288127826dD7E576ee272CE9808dF602',
          },
          {
            provider: Provider.Connext,
            index: 2,
            senderAddress: '0x31936D379180A8E6A2954EFA84d01cd3c8B5436B',
            receiverAddress: '0x954fC63aCEfa482CF6c9F763842E0446D8c60Ae7',
          },
        ],
      }),
      target100({
        emitChainId: '42161',
        reporterAddress: '0x809842d4dD086DaeB460137ee7FE2FFDc5EBe7E1',
        adapterAddress: '0x4d330fe624B68f445ce5AF72Cf58315B630a4ced',
        transports: [
          {
            provider: Provider.Hyperlane,
            index: 0,
            senderAddress: '0x454879f3BeC35ed8955e8A893F93dEaCFdD76D37',
            receiverAddress: '0x7cd823725708B39F199E311FbAe2CfA97E2BF6f2',
          },
          {
            provider: Provider.LayerZero,
            index: 1,
            senderAddress: '0x91DFd49E78d4B15aabeBd1f703CE09F4fE3d3673',
            receiverAddress: '0x38A94D550a059c036487aD5F48be77B0a7bBFB23',
          },
          {
            provider: Provider.Connext,
            index: 2,
            senderAddress: '0xe33e47B26295bE9C99649B11A24036e01E02A9C1',
            receiverAddress: '0x7d4648ec7eCAE51Bb3527E75791938A94cf74ef5',
          },
        ],
      }),
    ]);
  }

  public async selectTarget(params: ProofTargetParams): Promise<EventBridgeTargetInfo> {
    return Promise.resolve(this.targets.selectTarget(params));
  }
}
