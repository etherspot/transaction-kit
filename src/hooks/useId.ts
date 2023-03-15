import { useMemo } from 'react';
import * as _ from 'lodash';

const useId = () => {
  return useMemo(() => _.uniqueId(), []);
};

export default useId;
