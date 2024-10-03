import { BaseError, getEvmProvider, isArray } from 'flash-sdk';

import { TokenPermit, TokenPermitDataEncoder } from '../tokenPermit';

import { MULTICALL_ABI } from './abi';

export class MulticallEncoderError extends BaseError {
  public constructor(message: string) {
    super('MulticallEncoderError', message);
  }
}

export type MulticallDataEncoder<T> = (element: T) => Promise<string>;

export interface IMulticallElement {
  data(): Promise<string>;
}

export class MulticallDataElement implements IMulticallElement {
  private readonly data_: string;

  public constructor(data: string) {
    this.data_ = data;
  }

  public data(): Promise<string> {
    return Promise.resolve(this.data_);
  }
}

export class MulticallEncodableElement<T> implements IMulticallElement {
  private readonly element: T;
  private readonly encoder: MulticallDataEncoder<T>;

  public constructor(element: T, encoder: MulticallDataEncoder<T>) {
    this.element = element;
    this.encoder = encoder;
  }

  public async data(): Promise<string> {
    return await this.encoder(this.element);
  }
}

export class MulticallPermitElement implements IMulticallElement {
  private readonly permit: TokenPermit;

  public constructor(permit: TokenPermit) {
    this.permit = permit;
  }

  public async data(): Promise<string> {
    const permitEncoder = new TokenPermitDataEncoder();
    const permitData = await permitEncoder.encode(this.permit);
    return permitData;
  }
}

export class MulticallEncoder {
  public async encode(elements: IMulticallElement | IMulticallElement[]): Promise<string> {
    const normalizedElements = this.normalizeElements(elements);
    const dataList = await this.getElementsData(normalizedElements);
    const data = await this.encodeDataList(dataList);
    return data;
  }

  private normalizeElements(elements: IMulticallElement | IMulticallElement[]): IMulticallElement[] {
    if (!isArray(elements)) {
      return [elements];
    }

    if (elements.length === 0) {
      throw new MulticallEncoderError('Array to encode multicall function data for must contain at least one element');
    }

    return elements;
  }

  private async getElementsData(elements: IMulticallElement[]): Promise<string[]> {
    const dataList = await Promise.all(elements.map((e) => e.data()));
    return dataList;
  }

  private async encodeDataList(dataList: string[]): Promise<string> {
    if (dataList.length === 0) {
      throw new MulticallEncoderError('Data list to encode multicall must contain at least one element');
    }

    if (dataList.length === 1) {
      return dataList[0];
    }

    const data = await this.encodeMulticall(dataList);
    return data;
  }

  private async encodeMulticall(dataList: string[]): Promise<string> {
    const evm = getEvmProvider();
    const data = await evm.functionDataEncode(MULTICALL_ABI, 'multicall', [dataList]);
    return data;
  }
}
