# !/bin/bash
npm install && npm run rollup:build
cd example && echo "REACT_APP_CHAIN_ID=$CHAIN_ID" >> .env && echo "REACT_APP_DEMO_WALLET_PK=$DEMO_WALLET_PK" >> .env && echo "--------env" && cat .env && npm install && npm run build 
