// types
import { TypePerId } from '../types/Helper';

export const getObjectSortedByKeys = (
  object: TypePerId<any>,
) => Object.keys(object).sort().map((key) => object[key]);

export const parseEtherspotErrorMessageIfAvailable = (errorMessage: string): string => {
  let etherspotErrorMessage;

  try {
    // parsing etherspot estimate error based on return scheme
    const errorMessageJson = JSON.parse(errorMessage.trim());
    etherspotErrorMessage = Object.values(errorMessageJson[0].constraints)[0] as string;
  } catch (e) {
    // unable to parse etherspot json
  }

  return etherspotErrorMessage ?? errorMessage;
};
