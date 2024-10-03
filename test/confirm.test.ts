import { BITCOIN_CHAIN_ID, FlashClient, ViemChainProvider, ViemWallet } from 'flash-sdk';

import { DirectFeeEstimator, EventBridgeProofer, LocalStateProofer, NeverProofer, RouterProofer } from 'proof-sdk';

import { CollateralEventBridgeProoferConfig_2_14_0_Beta, FlashOperatorClient } from '../src';

const TIMEOUT = 60 * 60 * 1000; // 1h

test(
  'Confirms swap [on-chain]',
  async () => {
    const orderHash = process.env.TEST_ON_CHAIN_CONFIRM_ORDER_HASH;
    if (!orderHash) {
      console.warn('Swap confirm test skipped - no order hash configured');
      return;
    }

    const privateKey = process.env.TEST_ON_CHAIN_CONFIRM_PRIVATE_KEY || process.env.TEST_ON_CHAIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key configured for swap confirm test');
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

    if (!swap.completed) {
      throw new Error('Swap is not completed to be confirmed');
    }

    console.log('Confirming swap...');
    await flashOperator.confirmSwap({ swap });
    console.log('Swap confirmed');
  },
  TIMEOUT,
);
