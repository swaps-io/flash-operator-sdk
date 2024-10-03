export const TOKEN_PERMITTER_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token_',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount_',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'deadline_',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'r_',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'vs_',
        type: 'bytes32',
      },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token_',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'allowed_',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'deadline_',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'r_',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'vs_',
        type: 'bytes32',
      },
    ],
    name: 'permitDai',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token_',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount_',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'deadline_',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'signature_',
        type: 'bytes',
      },
    ],
    name: 'permitUniswap',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
