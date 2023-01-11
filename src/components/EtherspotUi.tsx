import React, { Children, useMemo } from 'react';
import { WalletProviderLike } from 'etherspot';
import EtherspotSdkContextProvider from '@etherspot/react-etherspot';

// contexts
import EtherspotUiContext from '../contexts/EtherspotUiContext';

interface EtherspotUiProps extends React.PropsWithChildren<any>{
  provider?: WalletProviderLike | null | undefined;
  chainId?: number | undefined;
}

export interface IBatch {
  transactions: any[],
}

export interface IBatchGroup {
  batches: IBatch[],
  skip?: boolean,
}

const filterChildrenByType = (
  children: React.ReactNode,
  type: string,
): React.ReactNode[] => {
  let childrenArray = Children.toArray(children);

  return childrenArray.filter((child) => React.isValidElement(child)
    && typeof child.type !== 'string'
    && typeof child.type.name === type)
}

const findGroupedBatchesWithTransactions = (
  children: React.ReactNode,
  isInsideBatchesGroup = false,
) => {
  let childrenArray = Children.toArray(children);
  let groupedBatches: IBatchGroup[] = [];

  childrenArray.forEach((child) => {
    // not valid element
    if (!React.isValidElement(child)) return;

    const isBatchesGroup = typeof child.type !== 'string' && child.type.name === 'EtherspotBatches';
    if (isBatchesGroup && isInsideBatchesGroup) {
      throw new Error('<Batches /> cannot be inside <Batches />')
    }

    const props = { ...child.props };

    if (isBatchesGroup) {
      groupedBatches = [
        ...groupedBatches,
        { skip: !!props?.skip, batches: [] },
      ];
    }

    groupedBatches = [
      ...groupedBatches,
      ...findGroupedBatchesWithTransactions(props.children ?? [], isBatchesGroup),
    ];
  });

  return groupedBatches;
}


const EtherspotUi = ({ children, provider, chainId = 1 }: EtherspotUiProps) => {
  const groupedBatches = findGroupedBatchesWithTransactions(children);

  const contextData = useMemo(
    () => ({
      batches: groupedBatches,
      chainId,
    }),
    [
      chainId
    ],
  );

  return (
    <EtherspotSdkContextProvider provider={provider} chainId={chainId}>
      <EtherspotUiContext.Provider value={{ data: contextData }}>
        {children}
      </EtherspotUiContext.Provider>
    </EtherspotSdkContextProvider>
  );
}

export default EtherspotUi;
