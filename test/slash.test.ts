import { BITCOIN_CHAIN_ID, FlashClient, ViemChainProvider, ViemWallet } from 'flash-sdk';

import { DirectFeeEstimator, EventBridgeProofer, LocalStateProofer, NeverProofer, RouterProofer } from 'proof-sdk';

import { CollateralEventBridgeProoferConfig_2_14_0_Beta, FlashOperatorClient } from '../src';

const TIMEOUT = 60 * 60 * 1000; // 1h

test(
  'Slashes swap [on-chain]',
  async () => {
    const orderHash = process.env.TEST_ON_CHAIN_SLASH_ORDER_HASH;
    if (!orderHash) {
      console.warn('Swap slash test skipped - no order hash configured');
      return;
    }

    const privateKey = process.env.TEST_ON_CHAIN_SLASH_PRIVATE_KEY || process.env.TEST_ON_CHAIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key configured for swap slash test');
    }

    const wallet = new ViemWallet({ privateKey });
    const chain = new ViemChainProvider();
    const feeEstimator = new DirectFeeEstimator(chain);
    const config = new CollateralEventBridgeProoferConfig_2_14_0_Beta();
    const eventBridgeProofer = new EventBridgeProofer({ config, feeEstimator, wallet, chain });
    const localStateProofer = new LocalStateProofer();
    const proofer = new RouterProofer({
      localProofer: localStateProofer,
      foreignProofer: eventBridgeProofer,
      bitcoinProofer: new NeverProofer(),
      bitcoinChainId: BITCOIN_CHAIN_ID,
    });
    const flash = new FlashClient();
    const flashOperator = new FlashOperatorClient({ wallet, proofer });

    console.log('Obtaining swap...');
    const swap = await flash.getSwap({ swap: orderHash });
    console.log('Swap obtained');

    if (!swap.slashable) {
      throw new Error('Swap is not slashable');
    }

    console.log('Slashing swap...');
    await flashOperator.slashSwap({ swap });
    console.log('Swap slashed');
  },
  TIMEOUT,
);
