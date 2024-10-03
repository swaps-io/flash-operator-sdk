interface TokenPermitBase {
  owner: string;
  token: string;
  deadline: bigint;
  signature: string;
}

export interface TokenPermitDefault extends TokenPermitBase {
  type?: 'default';
  amount: bigint;
}

export interface TokenPermitDai extends TokenPermitBase {
  type: 'dai';
  allowed: boolean;
}

export interface TokenPermitUniswap extends TokenPermitBase {
  type: 'uniswap';
  amount: bigint;
}

export type TokenPermit = TokenPermitDefault | TokenPermitDai | TokenPermitUniswap;
