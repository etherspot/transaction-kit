// types
import { TypePerId } from '../types/Helper';

export const getObjectSortedByKeys = (
  object: TypePerId<any>,
) => Object.keys(object).sort().map((key) => object[key]);
