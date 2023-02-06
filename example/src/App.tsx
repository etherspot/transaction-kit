import React, { useEffect, useState } from 'react';
import {
  EtherspotBatches,
  EtherspotBatch,
  EtherspotTransaction,
  useEtherspot,
  useEtherspotUi,
  IEstimatedBatches,
  EstimatedBatch, ISentBatches, SentBatch,
} from '@etherspot/transacion-kit';
import { ethers } from 'ethers';
import { Box, Button, Chip, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import { AiFillCaretDown, AiFillCaretRight } from 'react-icons/ai';

const walletAddressByName = {
  Alice: '0x3E3e21928AC037DFF9D4E82839eF691c0ca37664',
  Bob: '0xFCc46bD8186B90aF1d5a850b80017aB98EbE373d',
  Christie: '0x8D8Fa3c1db3c0195f98e693Bfa22eBc8bA914ef4',
}

const tabs = {
  SINGLE_TRANSACTION: 'SINGLE_TRANSACTION',
  MULTIPLE_TRANSACTIONS: 'MULTIPLE_TRANSACTIONS',
}

const CodePreview = ({ code }: { code: string }) => (
  <Paper>
    <pre style={{ margin: '40px 0 40px', padding: '0 15px' }}>
      <code>
        {code.replaceAll('\n      ', '\n')}
      </code>
    </pre>
  </Paper>
);

const exampleCode = {
  [tabs.SINGLE_TRANSACTION]: {
    preview: `
      <EtherspotBatches>
        <EtherspotBatch>
          <EtherspotTransaction to={bobAddress} value={'0.01'} />
        </EtherspotBatch>
      </EtherspotBatches>
    `,
    code: (
      <EtherspotBatches>
        <EtherspotBatch>
          <EtherspotTransaction to={walletAddressByName.Bob} value={'0.01'} />
        </EtherspotBatch>
      </EtherspotBatches>
    )
  },
  [tabs.MULTIPLE_TRANSACTIONS]: {
    preview: `
      <EtherspotBatches>
        <EtherspotBatch>
        <EtherspotTransaction to={bobAddress} value={'0.01'} />
        <EtherspotTransaction to={christieAddress} value={'0.01'} />
        </EtherspotBatch>
      </EtherspotBatches>
    `,
    code: (
      <EtherspotBatches>
        <EtherspotBatch>
          <EtherspotTransaction to={walletAddressByName.Bob} value={'0.01'} />
          <EtherspotTransaction to={walletAddressByName.Christie} value={'0.01'} />
        </EtherspotBatch>
      </EtherspotBatches>
    )
  },
};

const App = () => {
  const [activeTab, setActiveTab] = useState(tabs.SINGLE_TRANSACTION);
  const { batches, estimate, send } = useEtherspotUi();
  const { getSdkForChainId } = useEtherspot();
  const [balancePerAddress, setBalancePerAddress] = useState({
    [walletAddressByName.Alice]: '',
    [walletAddressByName.Bob]: '',
    [walletAddressByName.Christie]: '',
  });
  const [estimated, setEstimated] = useState<IEstimatedBatches[] | null>(null);
  const [sent, setSent] = useState<ISentBatches[] | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const batchesTreeView = batches.map((batchGroup, id1) => ({
    ...batchGroup,
    treeNodeId: `batch-group-${batchGroup.id ?? id1}`,
    batches: batchGroup.batches?.map((batch, id2) => ({
      ...batch,
      treeNodeId: `batch-${batch.id ?? id2}`,
      transactions: batch.transactions?.map((transaction, id3) => ({
        treeNodeId: `transaction-${transaction.id ?? id3}`,
        ...transaction
      })),
    })),
  }));

  const batchesTreeViewExpandedIds = batchesTreeView.reduce((ids: string[], batchGroup) => {
    let moreIds = [batchGroup.treeNodeId];

    batchGroup?.batches?.forEach((batch) => {
      moreIds = [...moreIds, batch.treeNodeId];
      batch?.transactions?.forEach((transaction) => {
        moreIds = [...moreIds, transaction.treeNodeId];
      });
    });

    return [...ids, ...moreIds];
  }, []);

  const [expanded, setExpanded] = React.useState<string[]>([]);

  useEffect(() => {
    setExpanded(batchesTreeViewExpandedIds);
  }, [batches]);

  const handleToggle = (event: React.SyntheticEvent, nodeIds: string[]) => setExpanded(nodeIds);

  useEffect(() => {
    setEstimated(null);
    setIsEstimating(false);
    setSent(null);
    setIsSending(false);
  }, [activeTab]);

  const onEstimateClick = async () => {
    setSent(null);
    setIsSending(false);
    setEstimated(null);
    setIsEstimating(true);
    const newEstimated = await estimate();
    setEstimated(newEstimated);
    setIsEstimating(false);
    setExpanded(batchesTreeViewExpandedIds);
  };

  const onSendClick = async () => {
    setSent(null);
    setEstimated(null);
    setIsSending(true);
    const newSent = await send();
    setSent(newSent);
    setIsSending(false);
    setExpanded(batchesTreeViewExpandedIds);
  };

  const refreshBalances = async () => {
    const sdk = getSdkForChainId(+(process.env.REACT_APP_CHAIN_ID as string));
    if (!sdk) return;

    const updatedBalances = {
      [walletAddressByName.Alice]: 'N/A',
      [walletAddressByName.Bob]: 'N/A',
      [walletAddressByName.Christie]: 'N/A',
    };

    await Promise.all(Object.values(walletAddressByName).map(async (address) => {
      const balances = await sdk?.getAccountBalances({ account: address });
      const balance = balances && balances.items.find(({ token }) => token === null);
      if (balance) updatedBalances[address] = ethers.utils.formatEther(balance.balance);
    }));

    setBalancePerAddress(updatedBalances);
  };

  useEffect(() => {
    refreshBalances();
  }, [getSdkForChainId]);

  const estimationFailed = estimated?.some((
    estimatedGroup,
  ) => estimatedGroup.estimatedBatches?.some((estimatedBatch) => estimatedBatch.errorMessage));

  return (
    <Container maxWidth={'sm'}>
      <Box sx={{ pt: 3, pb: 4 }}>
        <Typography mb={2}>
          <a href={'https://faucet.polygon.technology/'} target={'_blank'}>Mumbai MATIC Faucet</a>
        </Typography>
        {Object.keys(walletAddressByName).map((addressName: string) => {
          const address = walletAddressByName[addressName as keyof typeof walletAddressByName];
          const balancePart = `balance: ${balancePerAddress[address] ? `${balancePerAddress[address]} MATIC` : 'Loading...' }`;
          const chipLabel = `${addressName} ${balancePart}`;
          return (
            <Chip
              label={chipLabel}
              variant={'outlined'}
              style={{ marginRight: 10, marginTop: 10 }}
              key={address}
            />
          );
        })}
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(event, id) => setActiveTab(id)}>
          <Tab label={'Single transaction'} value={tabs.SINGLE_TRANSACTION} />
          <Tab label={'Multiple transactions'} value={tabs.MULTIPLE_TRANSACTIONS} />
        </Tabs>
      </Box>
      <Box>
        <CodePreview code={exampleCode[activeTab].preview} />
        <Button
          variant={'contained'}
          disabled={isEstimating}
          style={{ marginRight: 5 }}
          onClick={onEstimateClick}
        >
          {isEstimating ? 'Estimating...' : 'Estimate'}
        </Button>
        <Button
          variant={'contained'}
          disabled={!estimated || estimationFailed}
          onClick={onSendClick}
        >
          {isSending && 'Sending...'}
          {!isSending && (estimationFailed ? 'Cannot send: estimation failed' : 'Send')}
        </Button>
        {exampleCode[activeTab].code}
        <Box mt={4} mb={4}>
          <TreeView
            defaultExpandIcon={<AiFillCaretRight />}
            defaultCollapseIcon={<AiFillCaretDown />}
            expanded={expanded}
            onNodeToggle={handleToggle}
            disableSelection
          >
            <Typography variant={'h5'}>Transactions:</Typography>
            {batchesTreeView.map((batchGroup, id1) => (
              <TreeItem nodeId={batchGroup.treeNodeId} label={`Batch group ${id1 + 1}`} key={batchGroup.treeNodeId}>
                {batchGroup.batches?.map((batch, id2) => {
                  let estimatedBatch: EstimatedBatch | undefined;
                  let sentBatch: SentBatch | undefined;

                  estimated?.forEach((estimatedGroup) => {
                    estimatedBatch = estimatedGroup.estimatedBatches?.find(({ id }) => id === batch.id)
                  });

                  sent?.forEach((sentGroup) => {
                    sentBatch = sentGroup.sentBatches?.find(({ id }) => id === batch.id)
                  });

                  return (
                    <TreeItem nodeId={batch.treeNodeId} label={`Batch ${id2 + 1}`} key={batch.treeNodeId}>
                      {estimatedBatch?.cost && <Typography ml={1} fontWeight={800}>Batch estimated: {ethers.utils.formatEther(estimatedBatch.cost)} MATIC</Typography>}
                      {estimatedBatch?.errorMessage && <Typography ml={1} fontWeight={800}>Batch estimation error: {estimatedBatch.errorMessage}</Typography>}
                      {sentBatch?.batchHash && <Typography ml={1} fontWeight={800}>Sent batch hash: {sentBatch.batchHash}</Typography>}
                      {sentBatch?.errorMessage && <Typography ml={1} fontWeight={800}>Error on send: {sentBatch.errorMessage}</Typography>}
                      {batch.transactions?.map((transaction, id3) => {
                        let transactionValue = typeof transaction.value === 'string'
                          ? transaction.value
                          : '0.0';

                        if (ethers.BigNumber.isBigNumber(transaction.value)) {
                          transactionValue = ethers.utils.formatEther(transaction.value);
                        }

                        return (
                          <TreeItem nodeId={transaction.treeNodeId} label={`Transaction ${id3 + 1}`} key={transaction.treeNodeId}>
                            <Typography ml={1}>To: {transaction.to}</Typography>
                            <Typography ml={1}>Value: {transactionValue} MATIC</Typography>
                            <Typography ml={1}>Data: {transaction.data ?? 'None'}</Typography>
                          </TreeItem>
                        )
                      })}
                    </TreeItem>
                  )
                })}
              </TreeItem>
            ))}
          </TreeView>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
