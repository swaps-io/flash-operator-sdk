import { IWallet, IWalletLike, Swap, isNull, isSmartWallet } from 'flash-sdk';

import { IProofer } from 'proof-sdk';

import { ReportNoSendMainV0Params, SlashMainV0Params, reportNoSendMainV0, slashMainV0 } from '../../../api/gen/main-v0';
import { mapTransactionParams } from '../../../helper/transaction';
import { ProofFactory } from '../../../proofFactory';
import { FlashOperatorError } from '../../error';
import { FlashOperatorOptionalValue } from '../../optional';

import {
  CollateralSlashRequest,
  NoSendReport,
  NoSendReportRequest,
  NoSendReportSource,
  NoSendReportTxData,
} from './model';

export class SwapSlashSubClient {
  private readonly wallet: FlashOperatorOptionalValue<IWalletLike>;
  private readonly proofer: FlashOperatorOptionalValue<IProofer>;

  public constructor(wallet: FlashOperatorOptionalValue<IWalletLike>, proofer: FlashOperatorOptionalValue<IProofer>) {
    this.wallet = wallet;
    this.proofer = proofer;
  }

  public async prepareNoSendReport(
    operation: string | undefined,
    swap: Swap,
    reportSource: NoSendReportSource = 'existing-or-new-tx',
  ): Promise<NoSendReportRequest> {
    if (isNull(swap.txReceive)) {
      throw new FlashOperatorError('Swap must have receive transaction for slash operation');
    }

    const hasExistingReport = swap.txReportNoSend.length > 0;
    if (reportSource === 'only-existing-tx' && !hasExistingReport) {
      throw new FlashOperatorError('Swap has no existing "report no-send" txs - required by source type');
    }

    const shouldUseExistingReport = hasExistingReport && reportSource !== 'only-new-tx';
    if (shouldUseExistingReport) {
      const proofer = await this.proofer.getValue('Proofer must be provided for swap slash operation');
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
      const { reporter, txid } = swap.txReportNoSend[0];
      await proofFactory.addAssetNoSendEventProof({
        operation,
        hash: swap.hash,
        toChainId: swap.toCrypto.chain.id,
        toContractAddress: swap.toCrypto.chain.contract.address,
        collateralChainId: swap.collateralChain.id,
        collateralContractAddress: swap.collateralChain.contract.address,
        reportNoSendTxid: txid,
        reporter: reporter,
      });
      const [receiveProof, noSendProof] = await proofFactory.build();

      const noSendReport = new NoSendReport(receiveProof, noSendProof, reporter);
      const noSendReportRequest = new NoSendReportRequest(operation, swap, noSendReport);
      return noSendReportRequest;
    }

    const wallet = await this.wallet.getValue('Wallet must be configured for swap no-send report preparation');

    let reporterAddress: string;
    if (isSmartWallet(wallet)) {
      reporterAddress = await wallet.getAddress({ chainId: swap.toCrypto.chain.id });
    } else {
      reporterAddress = await wallet.getAddress();
    }

    const reportTxParams: ReportNoSendMainV0Params = {
      reporter: reporterAddress,
    };
    const { data: reportTx } = await reportNoSendMainV0(swap.hash, reportTxParams);

    const reportParams = mapTransactionParams(reportTx, operation, 'report-swap');
    const noSendReportTxData = new NoSendReportTxData(
      swap.hash,
      swap.fromCrypto.chain.id,
      swap.txReceive.txid,
      swap.fromCrypto.chain.contract.address,
      reportParams,
      swap.toCrypto.chain.contract.address,
      swap.collateralChain.id,
      swap.collateralChain.contract.address,
    );
    const noSendReportRequest = new NoSendReportRequest(operation, swap, noSendReportTxData);
    return noSendReportRequest;
  }

  public async reportNoSend(noSendReportRequest: NoSendReportRequest): Promise<NoSendReport> {
    if (noSendReportRequest.data instanceof NoSendReport) {
      const noSendReport: NoSendReport = noSendReportRequest.data;
      return noSendReport;
    }

    if (isNull(noSendReportRequest.swap.txReceive)) {
      throw new FlashOperatorError('Receive tx is required to slash swap');
    }

    const wallet = await this.wallet.getValue('Wallet must be configured for swap no-send report');
    const proofer = await this.proofer.getValue('Proofer must be provided for swap slash operation');

    const noSendReportTxData: NoSendReportTxData = noSendReportRequest.data;
    const reportParams = noSendReportTxData.reportNoSendParams;

    let reporter: string;
    let reportTxid: string;
    if (isSmartWallet(wallet)) {
      reporter = await wallet.getAddress({ chainId: noSendReportRequest.swap.toCrypto.chain.id });

      const ownerWallet = await wallet.getOwnerWallet();
      const from = await ownerWallet.getAddress();
      const signReportParams = await wallet.getSignTransactionParams({ ...reportParams, from });
      const ownerSignature = await ownerWallet.signTypedData(signReportParams);
      const sendReportParams = await wallet.getSendTransactionParams({ ...signReportParams, ownerSignature });
      reportTxid = await ownerWallet.sendTransaction(sendReportParams);
    } else {
      reporter = await wallet.getAddress();
      reportTxid = await wallet.sendTransaction(reportParams);
    }

    const proofFactory = new ProofFactory({ proofer });
    proofFactory.addAssetReceiveEventProof({
      operation: noSendReportRequest.operation,
      hash: noSendReportRequest.swap.hash,
      fromChainId: noSendReportRequest.swap.fromCrypto.chain.id,
      fromContractAddress: noSendReportRequest.swap.fromCrypto.chain.contract.address,
      collateralChainId: noSendReportRequest.swap.collateralChain.id,
      collateralContractAddress: noSendReportRequest.swap.collateralChain.contract.address,
      receiveTxid: noSendReportRequest.swap.txReceive.txid,
    });
    await proofFactory.addAssetNoSendEventProof({
      operation: noSendReportRequest.operation,
      hash: noSendReportRequest.swap.hash,
      toChainId: noSendReportRequest.swap.toCrypto.chain.id,
      toContractAddress: noSendReportRequest.swap.toCrypto.chain.contract.address,
      collateralChainId: noSendReportRequest.swap.collateralChain.id,
      collateralContractAddress: noSendReportRequest.swap.collateralChain.contract.address,
      reportNoSendTxid: reportTxid,
      reporter,
    });
    const [receiveProof, noSendProof] = await proofFactory.build();

    const noSendReport = new NoSendReport(receiveProof, noSendProof, reporter);
    return noSendReport;
  }

  public async prepareCollateralSlash(
    operation: string | undefined,
    swapRef: Swap | string,
    noSendReport: NoSendReport,
  ): Promise<CollateralSlashRequest> {
    const isHashRef = typeof swapRef === 'string';
    const swapHash = isHashRef ? swapRef : swapRef.hash;

    const slashTxParams: SlashMainV0Params = {
      from_proof: noSendReport.receiveProof,
      to_proof: noSendReport.noSendProof,
      reporter: noSendReport.reporter,
    };
    const { data: slashTx } = await slashMainV0(swapHash, slashTxParams);

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
