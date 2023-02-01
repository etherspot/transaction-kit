<a href="https://etherspot.io"> <img src=".github/etherspot-logo.svg" alt="Etherspot Logo" style="width: 50%; height: auto; margin: auto;"></a>

[![License](https://img.shields.io/github/license/etherspot/react-etherspot-kit)](https://github.com/etherspot/react-etherspot-kit/LICENSE) 
[![npm](https://img.shields.io/npm/v/@etherspot/react-etherspot-kit)](https://www.npmjs.com/package/@etherspot/react-etherspot-kit) 
[![contributions](https://img.shields.io/github/contributors/etherspot/react-etherspot-kit)](https://github.com/etherspot/react-etherspot-kit/graphs/contributors) 
[![discord](https://img.shields.io/discord/996437599453450280)](https://discord.etherspot.io)

# Etherspot for React

- Website: [https://etherspot.io](https://etherspot.io)
- Documentation: [https://docs.etherspot.dev](https://docs.etherspot.dev)
- SDK Docs: [https://sdk.etherspot.dev](https://sdk.etherspot.dev)
- SDK Playground [https://try.etherspot.dev](https://try.etherspot.dev)

React Etherspot allows plug-and-play integration with the Etherspot SDK, allowing React dApps and developers to easily leverage the SDK in a highly customisable fashion.

## Prerequisites

Please ensure that you have the Editor Config plugin installed for VS Code:

```
Name: EditorConfig for VS Code
Id: EditorConfig.EditorConfig
Description: EditorConfig Support for Visual Studio Code
Version: 0.16.4
Publisher: EditorConfig
VS Marketplace Link: https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig
```

## Getting Started

Install React Etherspot using npm or yarn

```
npm i @etherspot/react-etherspot-kit
```
Plug in your dApp

```
// TBA
```

## Developing locally
You can set up React Etherspot locally and develop new features for it. Please follow the instructions below:

- First start with React project
- Then, checkout this repository
- In this repository directory: run `npm install && npm link`
- In this repository directory:: run `npm run rollup:watch` - this project is now being watched for code changes
- In the React project directory: run `npm install && npm link @etherspot/react-etherspot-kit`
- Run your React project

You can now make code changes in this repository and changes will be reflected in the Example dapp.

## Contributions

Follow [guide](./CONTRIBUTING.md)

## Security

To report security issues please follow [guide](./SECURITY.md)
## License
[MIT](./LICENSE)
