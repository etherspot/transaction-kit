# !/bin/bash
cd example && sed -i.bak "s#process.env.REACT_APP_CHAIN_ID#\"$CHAIN_ID\"#g" src/App.tsx && sed -i.bak "s#process.env.REACT_APP_CHAIN_ID#\"$CHAIN_ID\"#g" src/index.tsx && sed -i.bak "s#process.env.REACT_APP_DEMO_WALLET_PK#\"$DEMO_WALLET_PK\"#g" src/index.tsx && npm install && npm run build 
