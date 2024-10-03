import { getEvmProvider, isNull, newArray } from 'flash-sdk';

import { EmitEvent, GetProofParams, IProofer, ProoferCapability } from 'proof-sdk';

import { WITHDRAW_REPORT_EVENT_SIGNATURE } from '../lib/contract/collateral/eventSignature';
import { calcWithdrawReportHash } from '../lib/contract/collateral/withdrawReportHash';
import { ASSET_NO_RECEIVE_EVENT_SIGNATURE } from '../lib/contract/order-bitcoin/orderBitcoinReserverEvents';
import { calcOrderActorHash } from '../lib/contract/order/orderActorHash';
import { ASSET_RECEIVE_EVENT_SIGNATURE } from '../lib/contract/order/orderReceiverEvents';
import {
  ASSET_LIQ_SEND_EVENT_SIGNATURE,
  ASSET_NO_SEND_EVENT_SIGNATURE,
  ASSET_SEND_EVENT_SIGNATURE,
} from '../lib/contract/order/orderSenderEvents';

import { ProofFactoryError } from './error';
import {
  AssetLiqSendProofParams,
  AssetNoReceiveProofParams,
  AssetNoSendProofParams,
  AssetReceiveProofParams,
  AssetSendProofParams,
  ProofFactoryParams,
  WithdrawReportProofParams,
} from './param';

export type * from './param';
export type * from './error';

type BaseGetProofParams = Pick<
  GetProofParams,
  'evm' | 'operation' | 'emitChainId' | 'emitAddress' | 'consumeChainId' | 'consumeAddress'
>;

interface ProofRequest {
  event: EmitEvent;
  proofRequestIndex: number;
}

interface PendingProofParams {
  baseParams: BaseGetProofParams;
  requests: ProofRequest[];
}

/**
 * Proof factory for building proofs
 *
 * @category Proof Factory
 */
export class ProofFactory {
  private readonly proofer: IProofer;
  private readonly ignoreCapabilities: Set<ProoferCapability>;
  private readonly pendingProofParams: Map<string, PendingProofParams>;
  private currentProofRequestIndex: number;

  public constructor(params: ProofFactoryParams) {
    this.proofer = params.proofer;
    this.ignoreCapabilities = new Set(params.ignoreCapabilities);
    this.pendingProofParams = new Map();
    this.currentProofRequestIndex = 0;
  }

  /**
   * Add asset receive event proof params
   *
   * @param params Proof {@link AssetReceiveProofParams | params}
   */
  public addAssetReceiveEventProof(params: AssetReceiveProofParams): void {
    const event: EmitEvent = {
      txid: params.receiveTxid,
      signature: ASSET_RECEIVE_EVENT_SIGNATURE,
      hashArg: params.hash,
    };
    const baseParams: BaseGetProofParams = {
      evm: getEvmProvider(),
      operation: params.operation,
      emitChainId: params.fromChainId,
      emitAddress: params.fromContractAddress,
      consumeChainId: params.collateralChainId,
      consumeAddress: params.collateralContractAddress,
    };
    this.addEvent(baseParams, event);
  }

  /**
   * Add asset no-receive event proof params
   *
   * @param params Proof {@link AssetNoReceiveProofParams | params}
   */
  public async addAssetNoReceiveEventProof(params: AssetNoReceiveProofParams): Promise<void> {
    const event: EmitEvent = {
      txid: params.reportNoReceiveTxid || params.hash,
      signature: ASSET_NO_RECEIVE_EVENT_SIGNATURE,
      hashArg: await calcOrderActorHash(params.hash, params.reporter),
    };
    const baseParams: BaseGetProofParams = {
      evm: getEvmProvider(),
      operation: params.operation,
      emitChainId: params.fromChainId,
      emitAddress: params.fromContractAddress,
      consumeChainId: params.collateralChainId,
      consumeAddress: params.collateralContractAddress,
    };
    this.addEvent(baseParams, event);
  }

  /**
   * Add asset send event proof params
   *
   * @param params Proof {@link AssetSendProofParams | params}
   */
  public addAssetSendEventProof(params: AssetSendProofParams): void {
    const event: EmitEvent = {
      txid: params.sendTxid,
      signature: ASSET_SEND_EVENT_SIGNATURE,
      hashArg: params.hash,
    };
    const baseParams: BaseGetProofParams = {
      evm: getEvmProvider(),
      operation: params.operation,
      emitChainId: params.toChainId,
      emitAddress: params.toContractAddress,
      consumeChainId: params.collateralChainId,
      consumeAddress: params.collateralContractAddress,
    };
    this.addEvent(baseParams, event);
  }

  /**
   * Add asset liq-send event proof params
   *
   * @param params Proof {@link AssetLiqSendProofParams | params}
   */
  public async addAssetLiqSendEventProof(params: AssetLiqSendProofParams): Promise<void> {
    const event: EmitEvent = {
      txid: params.liqSendTxid,
      signature: ASSET_LIQ_SEND_EVENT_SIGNATURE,
      hashArg: await calcOrderActorHash(params.hash, params.liquidator),
    };
    const baseParams: BaseGetProofParams = {
      evm: getEvmProvider(),
      operation: params.operation,
      emitChainId: params.toChainId,
      emitAddress: params.toContractAddress,
      consumeChainId: params.collateralChainId,
      consumeAddress: params.collateralContractAddress,
    };
    this.addEvent(baseParams, event);
  }

  /**
   * Add asset no-send event proof params
   *
   * @param params Proof {@link AssetNoSendProofParams | params}
   */
  public async addAssetNoSendEventProof(params: AssetNoSendProofParams): Promise<void> {
    const event: EmitEvent = {
      txid: params.reportNoSendTxid || params.hash,
      signature: ASSET_NO_SEND_EVENT_SIGNATURE,
      hashArg: await calcOrderActorHash(params.hash, params.reporter),
    };
    const baseParams: BaseGetProofParams = {
      evm: getEvmProvider(),
      operation: params.operation,
      emitChainId: params.toChainId,
      emitAddress: params.toContractAddress,
      consumeChainId: params.collateralChainId,
      consumeAddress: params.collateralContractAddress,
    };
    this.addEvent(baseParams, event);
  }

  /**
   * Add withdraw report event proof params
   *
   * @param params Proof {@link WithdrawReportProofParams | params}
   */
  public async addWithdrawReportEventProof(params: WithdrawReportProofParams): Promise<void> {
    const withdrawReportHash = await calcWithdrawReportHash({
      variant: params.variant,
      lockChain: BigInt(params.lockChainId),
      unlockChain: BigInt(params.unlockChainId),
      account: params.account,
      lockCounter: params.lockCounter,
      amount: params.amount,
      nonce: params.nonce,
    });

    const event: EmitEvent = {
      txid: params.reportWithdrawTxid,
      signature: WITHDRAW_REPORT_EVENT_SIGNATURE,
      hashArg: withdrawReportHash,
    };
    const baseParams: BaseGetProofParams = {
      evm: getEvmProvider(),
      operation: params.operation,
      emitChainId: params.lockChainId,
      emitAddress: params.lockChainContractAddress,
      consumeChainId: params.unlockChainId,
      consumeAddress: params.unlockChainContractAddress,
    };
    this.addEvent(baseParams, event);
  }

  /**
   * Builds proofs from previously added params (via `add*Proof` methods)
   *
   * @return List of built proofs
   */
  public async build(): Promise<string[]> {
    const allProofParams = Array.from(this.pendingProofParams.values());
    const proofBatches = await Promise.all(allProofParams.map((p) => this.buildProofBatch(p)));
    const proofs = newArray(this.currentProofRequestIndex, '');
    for (const batch of proofBatches) {
      for (const [index, proof] of batch.entries()) {
        proofs[index] = proof;
      }
    }
    this.pendingProofParams.clear();
    this.currentProofRequestIndex = 0;
    return proofs;
  }

  private async buildProofBatch(params: PendingProofParams): Promise<Map<number, string>> {
    const capabilities = this.proofer.getCapabilities(params.baseParams);

    const capableOf = (capability: ProoferCapability): boolean => {
      return capabilities.has(capability) && !this.ignoreCapabilities.has(capability);
    };

    if (capableOf(ProoferCapability.MultiProof)) {
      return await this.buildBatchMultiProofFlow(params);
    }

    if (capableOf(ProoferCapability.SingleProof)) {
      return await this.buildBatchSingleProofFlow(params);
    }

    throw new ProofFactoryError('Proofer is not capable of providing any proof flow');
  }

  private async buildBatchMultiProofFlow(params: PendingProofParams): Promise<Map<number, string>> {
    const proofParams: GetProofParams = {
      ...params.baseParams,
      emitEvents: params.requests.map((request) => request.event),
    };
    const proofs = await this.proofer.getProof(proofParams);

    const proofsByIndexes = new Map<number, string>();
    for (let i = 0; i < proofs.length; i++) {
      proofsByIndexes.set(params.requests[i].proofRequestIndex, proofs[i]);
    }
    return proofsByIndexes;
  }

  private async buildBatchSingleProofFlow(params: PendingProofParams): Promise<Map<number, string>> {
    const getRequestProof = async (request: ProofRequest): Promise<string[]> => {
      const proofParams: GetProofParams = {
        ...params.baseParams,
        emitEvents: [request.event],
      };
      const proof = await this.proofer.getProof(proofParams);
      return proof;
    };

    const proofs = await Promise.all(params.requests.map(getRequestProof));

    const proofsByIndexes = new Map<number, string>();
    for (let i = 0; i < proofs.length; i++) {
      proofsByIndexes.set(params.requests[i].proofRequestIndex, proofs[i][0]);
    }
    return proofsByIndexes;
  }

  private getProofParamsKey(baseParams: BaseGetProofParams): string {
    return `proof-base-${baseParams.consumeAddress}-${baseParams.consumeChainId}-${baseParams.emitAddress}-${baseParams.emitChainId}`;
  }

  private addEvent(baseParams: BaseGetProofParams, event: EmitEvent): void {
    const proofRequest: ProofRequest = {
      event: event,
      proofRequestIndex: this.currentProofRequestIndex,
    };

    const key = this.getProofParamsKey(baseParams);
    const existingProofParams = this.pendingProofParams.get(key);
    if (isNull(existingProofParams)) {
      const proofParams = {
        baseParams,
        requests: [proofRequest],
      };
      this.pendingProofParams.set(key, proofParams);
    } else {
      existingProofParams.requests.push(proofRequest);
    }
    this.currentProofRequestIndex++;
  }
}
