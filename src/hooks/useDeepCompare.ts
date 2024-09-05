/* eslint-disable @typescript-eslint/no-explicit-any */
import isEqual from 'lodash/isEqual';
import { useRef } from 'react';

const useDeepCompare = (value: any) => {
  const ref = useRef<any>(value);

  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};

export default useDeepCompare;
