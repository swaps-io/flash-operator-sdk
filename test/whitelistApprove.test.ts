import { ViemChainProvider, ViemWallet } from 'flash-sdk';

import { FlashCollateralClient } from '../src';

const TIMEOUT = 60 * 60 * 1000; // 1h

test(
  'Whitelist approve [on-chain]',
  async () => {
    const chainId = process.env.TEST_ON_CHAIN_WHITELIST_APPROVE_CHAIN_ID;
    if (!chainId) {
      console.warn('Whitelist approve test skipped - no chain id configured');
      return;
    }

    const privateKey = process.env.TEST_ON_CHAIN_WHITELIST_APPROVE_PRIVATE_KEY || process.env.TEST_ON_CHAIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key configured for whitelist approve test');
    }

    const wallet = new ViemWallet({ privateKey });
    const chain = new ViemChainProvider();
    const collateral = new FlashCollateralClient({ wallet, chain });

    console.log('Approving whitelist ...');
    await collateral.whitelistApprove({ chain: chainId });
    console.log('Whitelist approved');
  },
  TIMEOUT,
);
