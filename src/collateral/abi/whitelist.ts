export const WHITELIST_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'protocol_',
        type: 'address',
      },
      {
        internalType: 'enum IProtocolWhitelistPerAccountEnums.Allowance',
        name: 'allowance_',
        type: 'uint8',
      },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
