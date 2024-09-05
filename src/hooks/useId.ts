import uniqueId from 'lodash/uniqueId';
import { useMemo } from 'react';

const useId = () => {
  return useMemo(() => uniqueId(), []);
};

export default useId;
