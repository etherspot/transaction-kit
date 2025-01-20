import { uniqueId } from 'lodash';
import { useMemo } from 'react';

const useId = () => {
  return useMemo(() => uniqueId(), []);
};

export default useId;
