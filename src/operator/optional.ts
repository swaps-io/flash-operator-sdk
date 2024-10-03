import { Dynamic, Nullish, OptionalValue } from 'flash-sdk';

import { FlashOperatorError } from './error';

export class FlashOperatorOptionalValue<T> {
  private readonly optional: OptionalValue<T>;

  public constructor(value: Nullish<Dynamic<Nullish<T>>>) {
    this.optional = new OptionalValue(value);
  }

  public async getValue(error: string): Promise<T> {
    const value = await this.optional.getValue({
      onMissing: () => {
        throw new FlashOperatorError(error);
      },
    });
    return value;
  }
}
