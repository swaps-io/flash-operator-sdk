import { SendTransactionParams } from 'flash-sdk';

import { TransactionDataMainV0 } from '../api/gen/main-v0';

export const mapTransactionParams = (
  tx: TransactionDataMainV0,
  operation: string | undefined,
  tag: string,
): SendTransactionParams => {
  const txParams: SendTransactionParams = {
    operation,
    tag,
    chainId: tx.chain_id,
    from: tx.from_address,
    to: tx.to_address,
    data: tx.data,
    value: tx.value ?? undefined,
  };
  return txParams;
};
