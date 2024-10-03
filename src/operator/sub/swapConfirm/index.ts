import { IWallet, IWalletLike, Swap, isNull, isSmartWallet } from 'flash-sdk';

import { IProofer } from 'proof-sdk';

import { ConfirmSwapMainV0Params, confirmSwapMainV0 } from '../../../api/gen/main-v0';
import { mapTransactionParams } from '../../../helper/transaction';
import { ProofFactory } from '../../../proofFactory';
import { FlashOperatorError } from '../../error';
import { FlashOperatorOptionalValue } from '../../optional';

import { SwapConfirmRequest } from './model';

export class SwapConfirmSubClient {
  private readonly wallet: FlashOperatorOptionalValue<IWalletLike>;
  private readonly proofer: FlashOperatorOptionalValue<IProofer>;

  public constructor(wallet: FlashOperatorOptionalValue<IWalletLike>, proofer: FlashOperatorOptionalValue<IProofer>) {
    this.wallet = wallet;
    this.proofer = proofer;
  }

  public async prepareSwapConfirm(operation: string | undefined, swap: Swap): Promise<SwapConfirmRequest> {
    const proofer = await this.proofer.getValue('Proofer must be provided for swap confirm operation');
    const wallet = await this.wallet.getValue('Wallet must be configured for swap confirm');

    if (isNull(swap.txReceive) || isNull(swap.txSend)) {
      throw new FlashOperatorError('Receive and send transactions are required to confirm swap');
    }

    const proofFactory = new ProofFactory({ proofer });
    proofFactory.addAssetReceiveEventProof({
      operation,
      hash: swap.hash,
      fromChainId: swap.fromCrypto.chain.id,
      fromContractAddress: swap.fromCrypto.chain.contract.address,
      collateralChainId: swap.collateralChain.id,
      collateralContractAddress: swap.collateralChain.contract.address,
      receiveTxid: swap.txReceive.txid,
    });
    proofFactory.addAssetSendEventProof({
      operation,
      hash: swap.hash,
      toChainId: swap.toCrypto.chain.id,
      toContractAddress: swap.toCrypto.chain.contract.address,
      collateralChainId: swap.collateralChain.id,
      collateralContractAddress: swap.collateralChain.contract.address,
      sendTxid: swap.txSend.txid,
    });
    const [receiveProof, sendProof] = await proofFactory.build();

    let confirmAddress: string;
    if (isSmartWallet(wallet)) {
      confirmAddress = await wallet.getAddress({ chainId: swap.collateralChain.id });
    } else {
      confirmAddress = await wallet.getAddress();
    }

    const confirmTxParams: ConfirmSwapMainV0Params = {
      from_proof: receiveProof,
      to_proof: sendProof,
      address: confirmAddress,
    };
    const { data: confirmTx } = await confirmSwapMainV0(swap.hash, confirmTxParams);

    const confirmParams = mapTransactionParams(confirmTx, operation, 'confirm-swap');
    const swapConfirmRequest = new SwapConfirmRequest(confirmParams);
    return swapConfirmRequest;
  }

  public async confirmSwap(swapConfirmRequest: SwapConfirmRequest): Promise<void> {
    const wallet = await this.wallet.getValue('Wallet must be configured for swap confirm');

    let senderWallet: IWallet;
    if (isSmartWallet(wallet)) {
      senderWallet = await wallet.getOwnerWallet();
    } else {
      senderWallet = wallet;
    }

    await senderWallet.sendTransaction(swapConfirmRequest.swapConfirmParams);
  }
}
