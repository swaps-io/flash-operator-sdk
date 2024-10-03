import { Amount, Crypto, ViemChainProvider, ViemWallet } from 'flash-sdk';

import { FlashCollateralClient } from '../src';

const TIMEOUT = 60 * 60 * 1000; // 1h

test(
  'Collateral deposit [on-chain]',
  async () => {
    const collateralChainId = process.env.TEST_ON_CHAIN_COLLATERAL_DEPOSIT_COLLATERAL_CHAIN_ID;
    if (!collateralChainId) {
      console.warn('Collateral deposit test skipped - no collateral chain id configured');
      return;
    }

    const distributionChainId = process.env.TEST_ON_CHAIN_COLLATERAL_DEPOSIT_DISTRIBUTION_CHAIN_ID;
    if (!distributionChainId) {
      console.warn('Collateral deposit test skipped - no distribution chain id configured');
      return;
    }

    const tokenAddress = process.env.TEST_ON_CHAIN_COLLATERAL_DEPOSIT_TOKEN_ADDRESS;
    if (!tokenAddress) {
      console.warn('Collateral deposit test skipped - no token address configured');
      return;
    }

    const depositAmount = process.env.TEST_ON_CHAIN_COLLATERAL_DEPOSIT_AMOUNT;
    if (!depositAmount) {
      console.warn('Collateral deposit test skipped - no deposit amount configured');
      return;
    }

    const privateKey =
      process.env.TEST_ON_CHAIN_COLLATERAL_DEPOSIT_PRIVATE_KEY || process.env.TEST_ON_CHAIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key configured for collateral deposit test');
    }

    const wallet = new ViemWallet({ privateKey });
    const chain = new ViemChainProvider();
    const kcc = new FlashCollateralClient({ wallet, chain });

    console.log('Depositing collateral ...');
    await kcc.deposit({
      collateralChain: collateralChainId,
      distribution: {
        chain: distributionChainId,
        amount: Amount.fromDecimalString(depositAmount),
        crypto: Crypto.makeId(collateralChainId, tokenAddress),
      },
    });
    console.log('Collateral deposited');
  },
  TIMEOUT,
);
