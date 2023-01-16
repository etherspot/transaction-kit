import React, { Children } from 'react';

// types
import { IBatch, IBatchGroup, ITransaction } from '../types/EtherspotUi';

enum EtherspotComponentType {
  EtherspotBatches = 'EtherspotBatches',
  EtherspotBatch = 'EtherspotBatch',
  EtherspotTransaction = 'EtherspotTransaction',
}

const isEtherspotComponentTypeName = (
  typeName: string,
) => Object.keys(EtherspotComponentType).some((name) => name === typeName);

const getEtherspotComponentTypeName = (
  child: React.ReactNode,
): undefined | string => React.isValidElement(child)
  && typeof child.type !== 'string'
  && isEtherspotComponentTypeName(child.type.name)
    ? child.type.name
    : undefined;

export const findTransactions = (
  children: React.ReactNode,
): ITransaction[] => {
  let childrenArray = Children.toArray(children);
  let transactions: ITransaction[] = [];

  childrenArray.forEach((child) => {
    // check if not valid element
    if (!React.isValidElement(child)) return;

    const etherspotComponentType = getEtherspotComponentTypeName(child);
    const isEtherspotTransactionComponent = etherspotComponentType === EtherspotComponentType.EtherspotTransaction;

    const { to, data, value }: ITransaction = { ...child.props };
    const moreChildren = child.props.children ?? [];

    if (isEtherspotTransactionComponent && moreChildren?.length) {
      throw new Error(`No children components allowed within <EtherspotTransaction />`)
    }

    if (isEtherspotTransactionComponent) {
      transactions = [
        ...transactions,
        {
          to,
          data,
          value ,
        },
      ];
    }
  });

  return transactions;
}

export const findSingleBatches = (
  children: React.ReactNode,
  insideEtherspotBatch?: boolean,
): IBatch[] => {
  let childrenArray = Children.toArray(children);
  let batches: IBatch[] = [];

  childrenArray.forEach((child) => {
    // check if not valid element
    if (!React.isValidElement(child)) return;

    const etherspotComponentType = getEtherspotComponentTypeName(child);
    const isEtherspotBatchComponent = etherspotComponentType === EtherspotComponentType.EtherspotBatch;

    if (insideEtherspotBatch && isEtherspotBatchComponent) {
      throw new Error(`<EtherspotBatch /> cannot be inside <EtherspotBatch />`)
    }

    if (insideEtherspotBatch && etherspotComponentType === EtherspotComponentType.EtherspotBatches) {
      throw new Error(`<EtherspotBatches /> cannot be inside <EtherspotBatch />`)
    }

    const { gasTokenAddress, transactions = [], chainId }: IBatch = { ...child.props };
    const moreChildren = child.props.children ?? [];

    if (isEtherspotBatchComponent) {
      batches = [
        ...batches,
        {
          gasTokenAddress,
          chainId,
          transactions: [
            ...transactions,
            ...findTransactions(moreChildren),
          ],
        },
      ];
    }

    batches = [
      ...batches,
      ...findSingleBatches(moreChildren, insideEtherspotBatch || isEtherspotBatchComponent),
    ];
  });

  return batches;
}

export const findGroupedBatches = (
  children: React.ReactNode,
  insideEtherspotBatches?: boolean,
): IBatchGroup[] => {
  let childrenArray = Children.toArray(children);
  let groupedBatches: IBatchGroup[] = [];

  childrenArray.forEach((child) => {
    // check if not valid element
    if (!React.isValidElement(child)) return;

    const etherspotComponentType = getEtherspotComponentTypeName(child);
    const isEtherspotBatchesComponent = etherspotComponentType === EtherspotComponentType.EtherspotBatches;

    if (insideEtherspotBatches && isEtherspotBatchesComponent) {
      throw new Error(`<EtherspotBatches /> cannot be inside <EtherspotBatches />`)
    }

    const { skip, batches = [] }: IBatchGroup = { ...child.props };
    const moreChildren = child.props.children ?? [];

    if (isEtherspotBatchesComponent) {
      groupedBatches = [
        ...groupedBatches,
        {
          skip,
          batches: [
            ...batches,
            ...findSingleBatches(moreChildren),
          ]
        },
      ];
    }

    groupedBatches = [
      ...groupedBatches,
      ...findGroupedBatches(moreChildren, insideEtherspotBatches || isEtherspotBatchesComponent),
    ];
  });

  return groupedBatches;
}
