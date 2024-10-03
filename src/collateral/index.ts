import {
  Amount,
  ApiCryptoApproveProvider,
  ApiCryptoDataSource,
  Chain,
  Crypto,
  CryptoApprover,
  Duration,
  IChainProvider,
  IWallet,
  SendTransactionParams,
  getEvmProvider,
  isArray,
  isNotNull,
  isNull,
} from 'flash-sdk';

import { IProofer } from 'proof-sdk';

import {
  IMulticallElement,
  MulticallDataElement,
  MulticallEncodableElement,
  MulticallEncoder,
} from '../helper/multicall';
import { BITCOIN_COLLATERAL_VARIANT, STABLECOIN_COLLATERAL_VARIANT } from '../lib/contract/collateral/variant';
import { Allowance } from '../lib/contract/whitelist/approve-access/allowance';
import { ProofFactory } from '../proofFactory';

import { COLLATERAL_ABI } from './abi/collateral';
import { WHITELIST_ABI } from './abi/whitelist';
import { CollateralCryptoAggregator } from './aggregator';
import { FlashCollateralError } from './error';
import { WhitelistApproveRequest } from './model/approve';
import { DepositRequest } from './model/deposit';
import { WithdrawReportRequest, WithdrawReportResult, WithdrawRequest } from './model/withdraw';
import {
  DepositDistribution,
  DepositParams,
  FlashCollateralClientParams,
  GetCollateralBalanceByCryptoParams,
  GetCollateralBalanceParams,
  GetCollateralChainsParams,
  GetCollateralCryptosParams,
  GetDistributionChainsParams,
  GetLockedCounterParams,
  GetUnlockedCounterParams,
  WhitelistApproveParams,
  WithCollateralVariant,
  WithdrawParams,
} from './param';
import { CollateralVariant } from './variant';

export * from './param';
export * from './error';
export * from './variant';

interface ManualDistribution {
  chainId: string;
  token: string;
  amount: string;
}

interface ApproveParams {
  amount: Amount;
  crypto: Crypto;
}

interface PreparedDistribution {
  approve: ApproveParams;
  distribution: ManualDistribution;
}

/**
 * Client for interaction with Collateral Manager
 *
 * @category Collateral Client
 */
export class FlashCollateralClient {
  private readonly wallet: IWallet;
  private readonly chain: IChainProvider;
  private readonly proofer: IProofer | undefined;
  private readonly cryptoAggregator: CollateralCryptoAggregator;
  private readonly cryptoApprover: CryptoApprover;
  private readonly defaultVariant: CollateralVariant;

  public constructor(params: FlashCollateralClientParams) {
    const {
      wallet,
      proofer,
      chain,
      cryptoApprove = new ApiCryptoApproveProvider({ wallet }),
      contractCacheTtl = Duration.fromHours(1),
      cryptoDataSource = new ApiCryptoDataSource(),
      defaultVariant = CollateralVariant.Stablecoin,
    } = params;

    this.wallet = wallet;
    this.proofer = proofer;
    this.chain = chain;
    this.cryptoApprover = new CryptoApprover(cryptoApprove);
    this.cryptoAggregator = new CollateralCryptoAggregator(contractCacheTtl, cryptoDataSource, chain);
    this.defaultVariant = defaultVariant;
  }

  /**
   * Gets list of supported collateral chains
   *
   * @param params The operation {@link GetCollateralChainsParams | params}
   *
   * @returns Array of supported chains
   */
  public async getCollateralChains(params: GetCollateralChainsParams = {}): Promise<readonly Chain[]> {
    const variant = this.resolveVariant(params);
    const chainFilter = this.getCollateralChainFilter(variant);
    const { chains } = await this.cryptoAggregator.getCryptoData(params.force ?? false);
    const collateralChains = chains.filter(chainFilter);
    return collateralChains;
  }

  /**
   * Gets list of supported distribution chains
   *
   * @param params The operation {@link GetDistributionChainsParams | params}
   *
   * @returns Array of supported chains
   */
  public async getDistributionChains(params: GetDistributionChainsParams): Promise<readonly Chain[]> {
    // TODO: check if proofer can make proof for this direction. Should take
    // `const variant = this.resolveVariant(params)` into account when checking direction

    const { chains } = await this.cryptoAggregator.getCryptoData(params.force ?? false);
    return chains;
  }

  /**
   * Gets list of supported collateral cryptos
   *
   * @param params The operation {@link GetCollateralCryptosParams | params}
   *
   * @returns Array of supported cryptos
   */
  public async getCollateralCryptos(params: GetCollateralCryptosParams): Promise<readonly Crypto[]> {
    const variant = this.resolveVariant(params);
    const collateralChain = await this.resolveChainRef(params.collateralChain);
    const cryptos = await this.cryptoAggregator.getCollateralCryptosByChainId(collateralChain.id, variant);
    return Array.from(cryptos.values());
  }

  /**
   * Deposits selected collateral crypto with specified distribution
   *
   * Combines the following actions:
   * - approve/permit crypto for the deposit (on the 'collateral' chain, optional)
   * - deposit crypto (on the 'collateral' chain)
   *
   * @param params The operation {@link DepositParams | params}
   */
  public async deposit(params: DepositParams): Promise<void> {
    const variant = this.resolveVariant(params);
    const collateralChain = await this.resolveChainRef(params.collateralChain);

    const approveParams = new Map<string, ApproveParams>();
    const collateralCryptos = await this.cryptoAggregator.getCollateralCryptosByChainId(collateralChain.id, variant);
    let manualDistribution: ManualDistribution | ManualDistribution[];

    if (isArray(params.distribution)) {
      manualDistribution = [];
      for (const dist of params.distribution) {
        const { distribution, approve } = await this.prepareDistribution(collateralChain, dist);
        const existedApproveParams = approveParams.get(distribution.token);
        if (isNotNull(existedApproveParams)) {
          const newApproveParams = {
            amount: existedApproveParams.amount.add(approve.amount),
            crypto: existedApproveParams.crypto,
          };
          approveParams.set(approve.crypto.address, newApproveParams);
        } else {
          const collateralCrypto = collateralCryptos.get(approve.crypto.address.toLowerCase());
          if (isNull(collateralCrypto)) {
            throw new FlashCollateralError(
              `Token ${approve.crypto.address} on chain ${collateralChain.id} is not supported for collateral deposit`,
            );
          }
          const newApproveParams = { amount: approve.amount, crypto: collateralCrypto };
          approveParams.set(approve.crypto.address, newApproveParams);
        }
        manualDistribution.push(distribution);
      }
    } else {
      const { distribution, approve } = await this.prepareDistribution(collateralChain, params.distribution);
      manualDistribution = distribution;
      approveParams.set(approve.crypto.address, approve);
    }

    const collateralContract = await this.cryptoAggregator.getCollateralUnlockerContractAddress(
      collateralChain.id,
      variant,
    );
    const permits: string[] = [];
    for (const approve of approveParams.values()) {
      const approveResult = await this.cryptoApprover.approve({
        crypto: approve.crypto,
        amount: approve.amount,
        spender: collateralContract,
        operation: params.operation,
      });
      if (approveResult.permitTransaction) {
        permits.push(approveResult.permitTransaction);
      }
    }

    const depositRequest = await this.prepareDepositManually(
      params.operation,
      collateralChain.id,
      manualDistribution,
      permits,
      variant,
    );
    await this.depositManually(depositRequest);
  }

  /**
   * Withdraws previously deposited collateral crypto
   *
   * Combines the following actions:
   * - report crypto withdraw (on the 'distribution' chain)
   * - withdraw crypto (on the 'collateral' chain)
   *
   * @param params The operation {@link WithdrawParams | params}
   */
  public async withdraw(params: WithdrawParams): Promise<void> {
    const variant = this.resolveVariant(params);
    const { skipPreviousWithdraw = true, withdrawAmount } = params;

    const [collateralChain, distributionChain, withdrawCrypto] = await Promise.all([
      this.resolveChainRef(params.collateralChain),
      this.resolveChainRef(params.distributionChain),
      this.resolveCryptoRef(params.withdrawCrypto),
    ]);

    if (withdrawCrypto.chain.id !== collateralChain.id) {
      throw new FlashCollateralError(
        `Chain ID ${withdrawCrypto.chain.id} of withdraw crypto does not match collateral chain ID ${collateralChain.id}`,
      );
    }

    const collateralDecimals = await this.cryptoAggregator.getCollateralDecimals(collateralChain.id, variant);
    const withdrawReportRequest = await this.prepareReportWithdrawManually(
      params.operation,
      collateralChain.id,
      distributionChain.id,
      skipPreviousWithdraw,
      collateralDecimals,
      withdrawCrypto.decimals,
      withdrawAmount,
      variant,
    );
    const withdrawReportResult = await this.reportWithdrawManually(withdrawReportRequest, variant);

    const withdrawRequest = await this.prepareWithdrawManually(
      params.operation,
      withdrawReportResult,
      withdrawCrypto,
      skipPreviousWithdraw,
      variant,
    );
    await this.withdrawManually(withdrawRequest);
  }

  /**
   * Approves protocol in the manager access whitelist
   *
   * Combines the following actions:
   * - approve protocol in whitelist (on the specified chain)
   *
   * @param params The operation {@link WhitelistApproveParams | params}
   */
  public async whitelistApprove(params: WhitelistApproveParams): Promise<void> {
    const variant = this.resolveVariant(params);
    const chain = await this.resolveChainRef(params.chain);

    const whitelistApproveRequest = await this.prepareWhitelistApproveManually(
      params.operation,
      chain.id,
      params.approveStrong ?? true,
      params.contractAddress,
      variant,
    );
    await this.whitelistApproveManually(whitelistApproveRequest);
  }

  /**
   * Gets collateral balance of the specified account
   *
   * @param params The operation {@link GetCollateralBalanceParams | params}
   *
   * @returns Collateral balance
   */
  public async getCollateralBalance(params: GetCollateralBalanceParams): Promise<Amount> {
    const variant = this.resolveVariant(params);
    const [collateralChain, distributionChain] = await Promise.all([
      this.resolveChainRef(params.collateralChain),
      this.resolveChainRef(params.distributionChain),
    ]);

    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'balance', [params.account, distributionChain.id]);
    const callResultData = await this.chain.call({
      chainId: collateralChain.id,
      to: await this.cryptoAggregator.getCollateralUnlockerContractAddress(collateralChain.id, variant),
      data: data,
    });

    const balance: bigint = await evm.functionResultDecode(COLLATERAL_ABI, 'balance', callResultData);

    const collateralDecimals = await this.cryptoAggregator.getCollateralDecimals(collateralChain.id, variant);
    const balanceAmount = new Amount({ value: balance.toString(), decimals: collateralDecimals });
    return balanceAmount;
  }

  /**
   * Gets collateral balance of the specified account by specified crypto
   *
   * @param params The operation {@link GetCollateralBalanceByCryptoParams | params}
   *
   * @returns Collateral balance per crypto
   */
  public async getCollateralBalanceByCrypto(params: GetCollateralBalanceByCryptoParams): Promise<Amount> {
    const variant = this.resolveVariant(params);
    const [collateralChain, distributionChain, crypto] = await Promise.all([
      this.resolveChainRef(params.collateralChain),
      this.resolveChainRef(params.distributionChain),
      this.resolveCryptoRef(params.crypto),
    ]);

    if (crypto.chain.id !== collateralChain.id) {
      throw new FlashCollateralError(
        `Chain ID ${crypto.chain.id} of crypto does not match collateral chain ID ${collateralChain.id}`,
      );
    }

    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'balanceByToken', [
      params.account,
      distributionChain.id,
      crypto.address,
    ]);
    const callResultData = await this.chain.call({
      chainId: collateralChain.id,
      to: await this.cryptoAggregator.getCollateralUnlockerContractAddress(collateralChain.id, variant),
      data: data,
    });

    const balance: bigint = await evm.functionResultDecode(COLLATERAL_ABI, 'balanceByToken', callResultData);
    const collateralDecimals = await this.cryptoAggregator.getCollateralDecimals(collateralChain.id, variant);

    const balanceAmount = new Amount({ value: balance.toString(), decimals: collateralDecimals });
    return balanceAmount;
  }

  /**
   * Gets unlocked counter of the specified account
   *
   * @param params The operation {@link GetUnlockedCounterParams | params}
   *
   * @returns Unlocked counter value
   */
  public async getUnlockedCounter(params: GetUnlockedCounterParams): Promise<Amount> {
    const variant = this.resolveVariant(params);
    const [collateralChain, distributionChain] = await Promise.all([
      this.resolveChainRef(params.collateralChain),
      this.resolveChainRef(params.distributionChain),
    ]);

    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'unlockCounter', [params.account, distributionChain.id]);
    const callResultData = await this.chain.call({
      chainId: collateralChain.id,
      to: await this.cryptoAggregator.getCollateralUnlockerContractAddress(collateralChain.id, variant),
      data: data,
    });

    const unlockedCounter: bigint = await evm.functionResultDecode(COLLATERAL_ABI, 'unlockCounter', callResultData);
    const collateralDecimals = await this.cryptoAggregator.getCollateralDecimals(collateralChain.id, variant);
    const unlockedAmount = new Amount({ value: unlockedCounter.toString(), decimals: collateralDecimals });
    return unlockedAmount;
  }

  /**
   * Gets locked counter of the specified account
   *
   * @param params The operation {@link GetLockedCounterParams | params}
   *
   * @returns Locked counter value
   */
  public async getLockedCounter(params: GetLockedCounterParams): Promise<Amount> {
    const variant = this.resolveVariant(params);
    const [collateralChain, distributionChain] = await Promise.all([
      this.resolveChainRef(params.collateralChain),
      this.resolveChainRef(params.distributionChain),
    ]);

    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'lockCounter', [params.account, collateralChain.id]);
    const callResultData = await this.chain.call({
      chainId: distributionChain.id,
      to: await this.cryptoAggregator.getCollateralLockerContractAddress(distributionChain.id, variant),
      data: data,
    });

    const lockedCounter: bigint = await evm.functionResultDecode(COLLATERAL_ABI, 'lockCounter', callResultData);
    const collateralDecimals = await this.cryptoAggregator.getCollateralDecimals(distributionChain.id, variant);
    const lockedAmount = new Amount({ value: lockedCounter.toString(), decimals: collateralDecimals });
    return lockedAmount;
  }

  private async prepareDistribution(
    collateralChain: Chain,
    distribution: DepositDistribution,
  ): Promise<PreparedDistribution> {
    const [crypto, chain] = await Promise.all([
      this.resolveCryptoRef(distribution.crypto),
      this.resolveChainRef(distribution.chain),
    ]);
    if (crypto.chain.id !== collateralChain.id) {
      throw new FlashCollateralError(
        `Chain ID ${crypto.chain.id} of crypto does not match collateral chain ID ${collateralChain.id}`,
      );
    }
    const approveParams = { amount: distribution.amount, crypto: crypto };
    const manualDistribution = {
      chainId: chain.id,
      token: crypto.address,
      amount: distribution.amount.normalizeValue(crypto.decimals),
    };
    return {
      approve: approveParams,
      distribution: manualDistribution,
    };
  }

  private async prepareDepositManually(
    operation: string | undefined,
    collateralChainId: string,
    distribution: ManualDistribution | ManualDistribution[],
    permitTransactions: string[] | undefined = undefined,
    variant: CollateralVariant,
  ): Promise<DepositRequest> {
    const multicallElements: IMulticallElement[] = [];
    if (isNotNull(permitTransactions)) {
      for (const permitTransaction of permitTransactions) {
        multicallElements.push(new MulticallDataElement(permitTransaction));
      }
    }

    const encodeDeposit = (d: ManualDistribution): Promise<string> => this.encodeDepositData(d);

    if (isArray(distribution)) {
      for (const dist of distribution) {
        multicallElements.push(new MulticallEncodableElement(dist, encodeDeposit));
      }
    } else {
      multicallElements.push(new MulticallEncodableElement(distribution, encodeDeposit));
    }

    const encoder = new MulticallEncoder();
    const depositData = await encoder.encode(multicallElements);

    const depositTransactionParams: SendTransactionParams = {
      operation,
      tag: 'deposit-collateral',
      chainId: collateralChainId,
      from: await this.wallet.getAddress(),
      to: await this.cryptoAggregator.getCollateralUnlockerContractAddress(collateralChainId, variant),
      data: depositData,
    };
    return new DepositRequest(depositTransactionParams);
  }

  private async depositManually(depositRequest: DepositRequest): Promise<void> {
    await this.wallet.sendTransaction(depositRequest.depositTxParams);
    this.cryptoApprover.consumePermit();
  }

  private async prepareReportWithdrawManually(
    operation: string | undefined,
    collateralChainId: string,
    distributionChainId: string,
    skipPreviousWithdraw: boolean,
    collateralDecimals: number,
    withdrawCryptoDecimals: number,
    requestedWithdrawAmount: Amount | undefined,
    variant: CollateralVariant,
  ): Promise<WithdrawReportRequest> {
    const account = await this.wallet.getAddress();
    const lockedAmount = await this.getLockedCounter({
      account,
      collateralChain: collateralChainId,
      distributionChain: distributionChainId,
    });
    const unlockedAmount = await this.getUnlockedCounter({
      account,
      collateralChain: collateralChainId,
      distributionChain: distributionChainId,
    });
    const unlockNonce = await this.getUnlockWithdrawNonce(account, collateralChainId, distributionChainId, variant);
    const lockNonce = await this.getLockWithdrawNonce(account, collateralChainId, distributionChainId, variant);

    if (lockNonce !== unlockNonce && !skipPreviousWithdraw) {
      throw new FlashCollateralError('Lock withdraw nonce is not equal unlock nonce, skip previous withdraw first');
    }

    if (lockNonce < unlockNonce) {
      throw new FlashCollateralError('Lock withdraw nonce cannot be less than unlock nonce');
    }

    const availableWithdrawAmount = unlockedAmount.sub(lockedAmount);
    let withdrawAmount: Amount;
    if (isNotNull(requestedWithdrawAmount)) {
      withdrawAmount = requestedWithdrawAmount;
      if (withdrawAmount > availableWithdrawAmount) {
        throw new FlashCollateralError(
          'Requested withdraw amount exceeds available amount: ' +
            `${withdrawAmount.toDecimalString()} > ${availableWithdrawAmount.toDecimalString()}`,
        );
      }
    } else {
      withdrawAmount = availableWithdrawAmount;
    }

    const withdrawAmountInCryptoDecimals = new Amount({
      value: withdrawAmount.normalizeValue(withdrawCryptoDecimals),
      decimals: withdrawCryptoDecimals,
    });
    const withdrawAmountInCollateralDecimals = BigInt(
      withdrawAmountInCryptoDecimals.normalizeValue(collateralDecimals),
    );

    const reportWithdrawData = await this.encodeReportWithdrawFunctionData(
      withdrawAmountInCollateralDecimals,
      collateralChainId,
    );

    const reportWithdrawTransactionParams: SendTransactionParams = {
      operation,
      tag: 'report-collateral-withdraw',
      chainId: distributionChainId,
      from: account,
      to: await this.cryptoAggregator.getCollateralLockerContractAddress(distributionChainId, variant),
      data: reportWithdrawData,
    };

    const withdrawReport = {
      lockChain: BigInt(distributionChainId),
      unlockChain: BigInt(collateralChainId),
      account: account,
      lockCounter: BigInt(lockedAmount.data.value) + withdrawAmountInCollateralDecimals,
      amount: withdrawAmountInCollateralDecimals,
      nonce: lockNonce,
    };
    return new WithdrawReportRequest(operation, reportWithdrawTransactionParams, withdrawReport);
  }

  private async reportWithdrawManually(
    withdrawReportRequest: WithdrawReportRequest,
    variant: CollateralVariant,
  ): Promise<WithdrawReportResult> {
    if (isNull(this.proofer)) {
      throw new FlashCollateralError('Proofer must be provided for report withdraw operation');
    }

    const txid = await this.wallet.sendTransaction(withdrawReportRequest.withdrawReportTxParams);

    const proofFactory = new ProofFactory({ proofer: this.proofer });
    await proofFactory.addWithdrawReportEventProof({
      operation: withdrawReportRequest.operation,
      variant: this.getProofVariant(variant),
      lockChainId: withdrawReportRequest.withdrawReport.lockChain.toString(),
      unlockChainId: withdrawReportRequest.withdrawReport.unlockChain.toString(),
      account: withdrawReportRequest.withdrawReport.account,
      lockCounter: withdrawReportRequest.withdrawReport.lockCounter,
      amount: withdrawReportRequest.withdrawReport.amount,
      nonce: withdrawReportRequest.withdrawReport.nonce,
      unlockChainContractAddress: await this.cryptoAggregator.getMainContractAddress(
        withdrawReportRequest.withdrawReport.unlockChain.toString(),
      ),
      lockChainContractAddress: await this.cryptoAggregator.getMainContractAddress(
        withdrawReportRequest.withdrawReport.lockChain.toString(),
      ),
      reportWithdrawTxid: txid,
    });
    const [withdrawReportProof] = await proofFactory.build();

    return new WithdrawReportResult(withdrawReportProof, withdrawReportRequest.withdrawReport);
  }

  private getProofVariant(variant: CollateralVariant): bigint {
    switch (variant) {
      case CollateralVariant.Stablecoin:
        return STABLECOIN_COLLATERAL_VARIANT;
      case CollateralVariant.Bitcoin:
        return BITCOIN_COLLATERAL_VARIANT;
    }
  }

  private async prepareWithdrawManually(
    operation: string | undefined,
    withdrawReportResult: WithdrawReportResult,
    crypto: Crypto,
    skipPreviousWithdraw: boolean,
    variant: CollateralVariant,
  ): Promise<WithdrawRequest> {
    const {
      unlockChain,
      lockChain,
      lockCounter,
      amount,
      account,
      nonce: lockNonce,
    } = withdrawReportResult.withdrawReport;

    const unlockNonce = await this.getUnlockWithdrawNonce(
      account,
      unlockChain.toString(),
      lockChain.toString(),
      variant,
    );
    if (lockNonce < unlockNonce) {
      throw new FlashCollateralError('Lock nonce cannot be less than unlock nonce');
    }

    const collateralChain = unlockChain.toString();
    const collateralDecimals = await this.cryptoAggregator.getCollateralDecimals(collateralChain, variant);
    const decimalAmount = new Amount({ value: amount.toString(), decimals: collateralDecimals });
    const withdrawAmount = decimalAmount.normalizeValue(collateralDecimals);

    const evm = getEvmProvider();
    let withdrawData = await evm.functionDataEncode(COLLATERAL_ABI, 'withdraw', [
      crypto.address,
      withdrawAmount,
      lockChain,
      lockCounter,
      withdrawReportResult.withdrawReportProof,
    ]);

    if (lockNonce > unlockNonce) {
      if (!skipPreviousWithdraw) {
        throw new FlashCollateralError('Lock nonce is not equals to unlock nonce, skip previous withdraw first');
      }

      const evm = getEvmProvider();
      const skipWithdrawData = await evm.functionDataEncode(COLLATERAL_ABI, 'skipWithdraw', [
        lockChain,
        unlockNonce,
        lockNonce,
      ]);

      const encoder = new MulticallEncoder();
      withdrawData = await encoder.encode([
        new MulticallDataElement(skipWithdrawData),
        new MulticallDataElement(withdrawData),
      ]);
    }

    const withdrawTransactionParams: SendTransactionParams = {
      operation,
      tag: 'withdraw-collateral',
      chainId: collateralChain,
      from: account,
      to: await this.cryptoAggregator.getCollateralUnlockerContractAddress(collateralChain, variant),
      data: withdrawData,
    };
    return new WithdrawRequest(withdrawTransactionParams);
  }

  private async withdrawManually(withdrawRequest: WithdrawRequest): Promise<void> {
    await this.wallet.sendTransaction(withdrawRequest.withdrawTxParams);
  }

  private async prepareWhitelistApproveManually(
    operation: string | undefined,
    chainId: string,
    approveStrong: boolean,
    contractAddress: string | undefined,
    variant: CollateralVariant,
  ): Promise<WhitelistApproveRequest> {
    if (isNull(contractAddress)) {
      contractAddress = await this.cryptoAggregator.getMainContractAddress(chainId);
    }

    const evm = getEvmProvider();
    const whitelistAddress = await this.cryptoAggregator.getAccessWhitelistContractAddress(chainId, variant);
    const allowance = approveStrong ? Allowance.ApprovedStrong : Allowance.ApprovedWeak;
    const approveData = await evm.functionDataEncode(WHITELIST_ABI, 'approve', [contractAddress, allowance]);

    const approveTransactionParams: SendTransactionParams = {
      operation,
      tag: 'approve-collateral-whitelist',
      chainId,
      from: await this.wallet.getAddress(),
      to: whitelistAddress,
      data: approveData,
    };
    return new WhitelistApproveRequest(approveTransactionParams);
  }

  private async whitelistApproveManually(whitelistApproveRequest: WhitelistApproveRequest): Promise<void> {
    await this.wallet.sendTransaction(whitelistApproveRequest.approveTxParams);
  }

  private async getUnlockWithdrawNonce(
    account: string,
    collateralChainId: string,
    distributionChainId: string,
    variant: CollateralVariant,
  ): Promise<bigint> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'unlockWithdrawNonce', [account, distributionChainId]);
    const callResultData = await this.chain.call({
      chainId: collateralChainId,
      to: await this.cryptoAggregator.getCollateralUnlockerContractAddress(collateralChainId, variant),
      data: data,
    });

    const nonce: bigint = await evm.functionResultDecode(COLLATERAL_ABI, 'unlockWithdrawNonce', callResultData);
    return nonce;
  }

  private async getLockWithdrawNonce(
    account: string,
    collateralChainId: string,
    distributionChainId: string,
    variant: CollateralVariant,
  ): Promise<bigint> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(COLLATERAL_ABI, 'lockWithdrawNonce', [account, collateralChainId]);
    const callResultData = await this.chain.call({
      chainId: distributionChainId,
      to: await this.cryptoAggregator.getCollateralLockerContractAddress(distributionChainId, variant),
      data: data,
    });

    const nonce: bigint = await evm.functionResultDecode(COLLATERAL_ABI, 'lockWithdrawNonce', callResultData);
    return nonce;
  }

  private async encodeDepositData(distribution: ManualDistribution): Promise<string> {
    const evm = getEvmProvider();
    const depositData = await evm.functionDataEncode(COLLATERAL_ABI, 'deposit', [
      distribution.token,
      distribution.amount,
      distribution.chainId,
    ]);
    return depositData;
  }

  private resolveVariant(withVariant: WithCollateralVariant): CollateralVariant {
    const variant = withVariant.variant ?? this.defaultVariant;
    return variant;
  }

  private async resolveChainRef(chainRef: string | Chain): Promise<Chain> {
    if (typeof chainRef !== 'string') {
      const chain: Chain = chainRef;
      return chain;
    }

    const chainId: string = chainRef;
    await this.cryptoAggregator.getCryptoData(false);
    const chain = this.cryptoAggregator.getChainById(chainId);
    return chain;
  }

  private async resolveCryptoRef(cryptoRef: string | Crypto): Promise<Crypto> {
    if (typeof cryptoRef !== 'string') {
      const crypto: Crypto = cryptoRef;
      return crypto;
    }

    await this.cryptoAggregator.getCryptoData(false);
    const crypto = this.cryptoAggregator.getCryptoById(cryptoRef.toLowerCase(), true);
    return crypto;
  }

  private async encodeReportWithdrawFunctionData(withdrawAmount: bigint, collateralChainId: string): Promise<string> {
    const evm = getEvmProvider();
    return await evm.functionDataEncode(COLLATERAL_ABI, 'reportWithdraw', [withdrawAmount, collateralChainId]);
  }

  private getCollateralChainFilter(variant: CollateralVariant): (chain: Chain) => boolean {
    switch (variant) {
      case CollateralVariant.Stablecoin:
        return (chain) => isNotNull(chain.contract.collateral);
      case CollateralVariant.Bitcoin:
        return (chain) => isNotNull(chain.contract.collateralBitcoin);
    }
  }
}
