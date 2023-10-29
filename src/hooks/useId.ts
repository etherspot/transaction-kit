import { useMemo } from 'react';
import uniqueId from 'lodash/uniqueId';

const useId = () => {
  return useMemo(() => uniqueId(), []);
};

export default useId;
