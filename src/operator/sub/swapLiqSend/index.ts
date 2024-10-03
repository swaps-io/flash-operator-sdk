import { CryptoApprover, IWallet, IWalletLike, Swap, isNotNull, isNull, isSmartWallet } from 'flash-sdk';

import { IProofer } from 'proof-sdk';

import { LiqSendMainV0Params, LiqSlashMainV0Params, liqSendMainV0, liqSlashMainV0 } from '../../../api/gen/main-v0';
import { mapTransactionParams } from '../../../helper/transaction';
import { ProofFactory } from '../../../proofFactory';
import { FlashOperatorError } from '../../error';
import { FlashOperatorOptionalValue } from '../../optional';

import { CollateralSlashRequest, LiqSendData, LiqSendRequest, LiqSendSource, LiqSendTxData } from './model';

export class SwapLiqSendSubClient {
  private readonly wallet: FlashOperatorOptionalValue<IWalletLike>;
  private readonly proofer: FlashOperatorOptionalValue<IProofer>;
  private readonly cryptoApprover: CryptoApprover;

  public constructor(
    wallet: FlashOperatorOptionalValue<IWalletLike>,
    proofer: FlashOperatorOptionalValue<IProofer>,
    approver: CryptoApprover,
  ) {
    this.wallet = wallet;
    this.proofer = proofer;
    this.cryptoApprover = approver;
  }

  public async prepareLiqSend(
    operation: string | undefined,
    swap: Swap,
    reportSource: LiqSendSource = 'existing-or-new-tx',
  ): Promise<LiqSendRequest> {
    if (isNull(swap.txReceive)) {
      throw new FlashOperatorError('Swap must have receive transaction for liq-send operation');
    }

    const hasExistingLiqSend = isNotNull(swap.txLiqSend);
    if (reportSource === 'only-existing-tx' && !hasExistingLiqSend) {
      throw new FlashOperatorError('Swap has no existing "liq-send" tx - required by source type');
    }

    const shouldUseExistingLiqSend = hasExistingLiqSend && reportSource !== 'only-new-tx';
    if (shouldUseExistingLiqSend) {
      const proofer = await this.proofer.getValue('Proofer must be provided for swap liq-send operation');
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
      const { liquidator, txid } = swap.txLiqSend;
      await proofFactory.addAssetLiqSendEventProof({
        operation,
        hash: swap.hash,
        toChainId: swap.toCrypto.chain.id,
        toContractAddress: swap.toCrypto.chain.contract.address,
        collateralChainId: swap.collateralChain.id,
        collateralContractAddress: swap.collateralChain.contract.address,
        liqSendTxid: txid,
        liquidator: liquidator,
      });
      const [receiveProof, liqSendProof] = await proofFactory.build();

      const liqSendData = new LiqSendData(receiveProof, liqSendProof, liquidator);
      const liqSendRequest = new LiqSendRequest(operation, swap, liqSendData);
      return liqSendRequest;
    }

    const wallet = await this.wallet.getValue('Wallet must be configured for swap liq-send preparation');

    const approveResult = await this.cryptoApprover.approve({
      crypto: swap.toCrypto,
      amount: swap.toAmount,
      spender: swap.toCrypto.chain.contract.address,
      operation,
    });

    let liquidatorAddress: string;
    if (isSmartWallet(wallet)) {
      liquidatorAddress = await wallet.getAddress({ chainId: swap.toCrypto.chain.id });
    } else {
      liquidatorAddress = await wallet.getAddress();
    }

    const liqSendTxParams: LiqSendMainV0Params = {
      liquidator: liquidatorAddress,
      permit_transaction: approveResult.permitTransaction,
    };
    const { data: reportTx } = await liqSendMainV0(swap.hash, liqSendTxParams);

    const liqSendParams = mapTransactionParams(reportTx, operation, 'liq-send');
    const liqSendTxData = new LiqSendTxData(
      swap.hash,
      swap.fromCrypto.chain.id,
      swap.txReceive.txid,
      swap.fromCrypto.chain.contract.address,
      liqSendParams,
      swap.toCrypto.chain.contract.address,
      swap.collateralChain.id,
      swap.collateralChain.contract.address,
    );
    const liqSendRequest = new LiqSendRequest(operation, swap, liqSendTxData);
    return liqSendRequest;
  }

  public async liqSend(liqSendRequest: LiqSendRequest): Promise<LiqSendData> {
    if (liqSendRequest.data instanceof LiqSendData) {
      const liqSendData: LiqSendData = liqSendRequest.data;
      return liqSendData;
    }

    if (isNull(liqSendRequest.swap.txReceive)) {
      throw new FlashOperatorError('Receive tx is required to slash swap');
    }

    const wallet = await this.wallet.getValue('Wallet must be configured for swap no-send report');
    const proofer = await this.proofer.getValue('Proofer must be provided for swap slash operation');

    const liqSendTxData: LiqSendTxData = liqSendRequest.data;
    const liqSendParams = liqSendTxData.liqSendParams;

    let liquidator: string;
    let liqSendTxid: string;
    if (isSmartWallet(wallet)) {
      liquidator = await wallet.getAddress({ chainId: liqSendRequest.swap.toCrypto.chain.id });

      const ownerWallet = await wallet.getOwnerWallet();
      const from = await ownerWallet.getAddress();
      const signLiqSendParams = await wallet.getSignTransactionParams({ ...liqSendParams, from });
      const ownerSignature = await ownerWallet.signTypedData(signLiqSendParams);
      const sendLiqSendParams = await wallet.getSendTransactionParams({ ...signLiqSendParams, ownerSignature });
      liqSendTxid = await ownerWallet.sendTransaction(sendLiqSendParams);
    } else {
      liquidator = await wallet.getAddress();
      liqSendTxid = await wallet.sendTransaction(liqSendParams);
    }

    const proofFactory = new ProofFactory({ proofer });
    proofFactory.addAssetReceiveEventProof({
      operation: liqSendRequest.operation,
      hash: liqSendRequest.swap.hash,
      fromChainId: liqSendRequest.swap.fromCrypto.chain.id,
      fromContractAddress: liqSendRequest.swap.fromCrypto.chain.contract.address,
      collateralChainId: liqSendRequest.swap.collateralChain.id,
      collateralContractAddress: liqSendRequest.swap.collateralChain.contract.address,
      receiveTxid: liqSendRequest.swap.txReceive.txid,
    });
    await proofFactory.addAssetLiqSendEventProof({
      operation: liqSendRequest.operation,
      hash: liqSendRequest.swap.hash,
      toChainId: liqSendRequest.swap.toCrypto.chain.id,
      toContractAddress: liqSendRequest.swap.toCrypto.chain.contract.address,
      collateralChainId: liqSendRequest.swap.collateralChain.id,
      collateralContractAddress: liqSendRequest.swap.collateralChain.contract.address,
      liqSendTxid,
      liquidator,
    });
    const [receiveProof, liqSendProof] = await proofFactory.build();

    const liqSendData = new LiqSendData(receiveProof, liqSendProof, liquidator);
    return liqSendData;
  }

  public async prepareCollateralSlash(
    operation: string | undefined,
    swapRef: Swap | string,
    liqSendData: LiqSendData,
  ): Promise<CollateralSlashRequest> {
    const isHashRef = typeof swapRef === 'string';
    const swapHash = isHashRef ? swapRef : swapRef.hash;

    const slashTxParams: LiqSlashMainV0Params = {
      from_proof: liqSendData.receiveProof,
      to_proof: liqSendData.liqSendProof,
    };
    const { data: slashTx } = await liqSlashMainV0(swapHash, slashTxParams);

    const slashParams = mapTransactionParams(slashTx, operation, 'slash-swap');
    const collateralSlashRequest = new CollateralSlashRequest(slashParams);
    return collateralSlashRequest;
  }

  public async slashCollateral(collateralSlashRequest: CollateralSlashRequest): Promise<void> {
    const wallet = await this.wallet.getValue('Wallet must be configured for swap slash');

    let senderWallet: IWallet;
    if (isSmartWallet(wallet)) {
      senderWallet = await wallet.getOwnerWallet();
    } else {
      senderWallet = wallet;
    }

    await senderWallet.sendTransaction(collateralSlashRequest.slashCollateralParams);
  }
}
