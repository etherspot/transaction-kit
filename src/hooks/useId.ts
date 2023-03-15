import { useMemo } from 'react';
import { uniqueId } from 'lodash';

const useId = () => {
  return useMemo(() => uniqueId(), []);
};

export default useId;
