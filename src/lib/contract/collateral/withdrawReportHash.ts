import { getEvmProvider } from 'flash-sdk';

import { WithdrawReport } from './withdrawReport';

export const calcWithdrawReportHash = async (report: WithdrawReport): Promise<string> => {
  const evm = getEvmProvider();
  const reportHashData = await evm.abiEncode(
    [
      'uint256', // variant
      'uint256', // lockChain
      'uint256', // unlockChain
      'address', // account
      'uint256', // lockCounter
      'uint256', // amount
      'uint256', // nonce
    ],
    [
      report.variant,
      report.lockChain,
      report.unlockChain,
      report.account,
      report.lockCounter,
      report.amount,
      report.nonce,
    ],
  );
  const reportHash = await evm.keccak256(reportHashData);
  return reportHash;
};
