# !/bin/bash
npm install && npm run rollup:build
cd example && echo "REACT_APP_CHAIN_ID=$REACT_APP_CHAIN_ID" >> .env && echo "REACT_APP_DEMO_WALLET_PK=$REACT_APP_DEMO_WALLET_PK" >> .env && npm install && npm run build 
