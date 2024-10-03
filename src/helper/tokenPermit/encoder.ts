import { getEvmProvider } from 'flash-sdk';

import { TOKEN_PERMITTER_ABI } from './abi';
import { TokenPermit, TokenPermitDai, TokenPermitDefault, TokenPermitUniswap } from './model';

export class TokenPermitDataEncoder {
  public async encode(permit: TokenPermit): Promise<string> {
    switch (permit.type) {
      case undefined:
      case 'default':
        return await this.encodeDefault(permit);
      case 'dai':
        return await this.encodeDai(permit);
      case 'uniswap':
        return await this.encodeUniswap(permit);
    }
  }

  private async encodeDefault(permit: TokenPermitDefault): Promise<string> {
    const evm = getEvmProvider();
    const signature = await evm.convertSignature(permit.signature);
    const data = await evm.functionDataEncode(TOKEN_PERMITTER_ABI, 'permit', [
      permit.owner,
      permit.token,
      permit.amount,
      permit.deadline,
      signature.r,
      signature.vs,
    ]);
    return data;
  }

  private async encodeDai(permit: TokenPermitDai): Promise<string> {
    const evm = getEvmProvider();
    const signature = await evm.convertSignature(permit.signature);
    const data = await evm.functionDataEncode(TOKEN_PERMITTER_ABI, 'permitDai', [
      permit.owner,
      permit.token,
      permit.allowed,
      permit.deadline,
      signature.r,
      signature.vs,
    ]);
    return data;
  }

  private async encodeUniswap(permit: TokenPermitUniswap): Promise<string> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(TOKEN_PERMITTER_ABI, 'permitDai', [
      permit.owner,
      permit.token,
      permit.amount,
      permit.deadline,
      permit.signature,
    ]);
    return data;
  }
}
