export const parseEtherspotErrorMessage = (
  e: Error | unknown,
  defaultMessage: string
): string => {
  return (e instanceof Error && e.message) || defaultMessage;
};

/**
 * Debug utility to log messages
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (message: string, data?: any, debugMode?: boolean): void => {
  if (debugMode) {
    // eslint-disable-next-line no-console
    console.log(`[EtherspotTransactionKit] ${message}`, data || '');
  }
};
