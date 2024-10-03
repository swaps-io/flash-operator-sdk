import {
  IWallet,
  SendTransactionParams,
  SignMessageParams,
  SignTypedDataParams,
  ViemWallet,
  getEvmProvider,
} from 'flash-sdk';

const TIMEOUT = 60 * 60 * 1000; // 1h

const ABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address payable',
            name: 'to',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'value',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes',
          },
        ],
        internalType: 'struct SmartWallet.Transaction[]',
        name: 'txs',
        type: 'tuple[]',
      },
    ],
    name: 'batchExecuteStrict',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

class DelegatedWallet implements IWallet {
  private readonly wallet: IWallet;
  private readonly contractAddress: string;

  public constructor(wallet: IWallet, contractAddress: string) {
    this.wallet = wallet;
    this.contractAddress = contractAddress;
  }

  public signTypedData(params: SignTypedDataParams): Promise<string> {
    throw new Error('DelegatedWallet.signTypedData is not implemented');
  }

  public signMessage(params: SignMessageParams): Promise<string> {
    throw new Error('DelegatedWallet.signMessage is not implemented');
  }

  public async getAddress(): Promise<string> {
    return Promise.resolve(this.contractAddress);
  }

  public async sendTransaction(params: SendTransactionParams): Promise<string> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(ABI, 'batchExecuteStrict', [
      [[params.to, params.value ?? 0, params.data]],
    ]);
    const delegatedParams: SendTransactionParams = {
      tag: params.tag,
      chainId: params.chainId,
      from: await this.wallet.getAddress(),
      to: this.contractAddress,
      value: params.value,
      data: data,
    };
    return await this.wallet.sendTransaction(delegatedParams);
  }
}

test(
  'Delegated wallet test [on-chain]',
  async () => {
    const privateKey = process.env.TEST_ON_CHAIN_DELEGATED_WALLET_PRIVATE_KEY || process.env.TEST_ON_CHAIN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('No private key configured for delegated wallet test');
    }

    const walletContractAddress = process.env.TEST_ON_CHAIN_DELEGATED_WALLET_CONTRACT_ADDRESS;
    if (!walletContractAddress) {
      throw new Error('No wallet contract address configured for delegated wallet test');
    }

    const targetContractAddress = process.env.TEST_ON_CHAIN_DELEGATED_WALLET_TARGET_CONTRACT_ADDRESS;
    if (!targetContractAddress) {
      throw new Error('No target contract address configured for delegated wallet test');
    }

    const chainId = process.env.TEST_ON_CHAIN_DELEGATED_WALLET_CHAIN_ID;
    if (!chainId) {
      throw new Error('No chain id configured for delegated wallet test');
    }

    const callData = process.env.TEST_ON_CHAIN_DELEGATED_WALLET_CALL_DATA;
    if (!callData) {
      throw new Error('No call data configured for delegated wallet test');
    }

    const viemWallet = new ViemWallet({ privateKey });
    const wallet = new DelegatedWallet(viemWallet, walletContractAddress);
    const txid = await wallet.sendTransaction({
      tag: 'test-transaction',
      from: await wallet.getAddress(),
      to: targetContractAddress,
      data: callData,
      chainId: chainId,
    });
    console.log(`Delegated wallet test txid: ${txid}`);
  },
  TIMEOUT,
);
