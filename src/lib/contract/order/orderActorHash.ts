import { getEvmProvider } from 'flash-sdk';

export const calcOrderActorHash = async (orderHash: string, actor: string): Promise<string> => {
  const evm = getEvmProvider();
  const orderActorHashData = await evm.abiEncode(['bytes32', 'address'], [orderHash, actor]);
  const orderActorHash = await evm.keccak256(orderActorHashData);
  return orderActorHash;
};
