import { BaseError, getEvmProvider } from 'flash-sdk';

import { MULTICALL_ABI } from './abi';

export class MulticallDecoderError extends BaseError {
  public constructor(message: string) {
    super('MulticallDecoderError', message);
  }
}

export type MulticallDataDecoder<T> = (data: string) => Promise<T>;

export class MulticallDecoder<T> {
  private readonly decoder: MulticallDataDecoder<T>;

  public constructor(decoder: MulticallDataDecoder<T>) {
    this.decoder = decoder;
  }

  public async decode(data: string, numberOfResults: number): Promise<T[]> {
    if (numberOfResults < 1) {
      throw new MulticallDecoderError('Function result data to decode multicall must contain at least one element');
    }

    let results: T[];
    if (numberOfResults === 1) {
      const result = await this.decoder(data);
      results = [result];
    } else {
      results = await this.decodeMulticall(data, numberOfResults);
    }
    return results;
  }

  private async decodeMulticall(data: string, numberOfResults: number): Promise<T[]> {
    const evm = getEvmProvider();
    const multicallDataList: string[] = await evm.functionResultDecode(MULTICALL_ABI, 'multicall', data);
    if (multicallDataList.length !== numberOfResults) {
      throw new MulticallDecoderError(
        `Unexpected number of multicall decode results: ` +
          `${numberOfResults} elements expected, got ${multicallDataList.length}`,
      );
    }

    const results = await Promise.all(multicallDataList.map((d) => this.decoder(d)));
    return results;
  }
}
