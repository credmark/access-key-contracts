# protocol-core-contracts

The smart contracts for allowing anonymous, scalable API and Infrastructure access on-chain

## Deployed addresses

Check [deploys.md](./deploys.md) for addresses of deployed contracts

## Environment

Environment variables can be passed via `.env` file ([dotenv](https://www.npmjs.com/package/dotenv)) or by command line. Hardhat requires the following env variables:

- `INFURA_API_KEY` (mandatory)
- `ETHERSCAN_API_KEY` (mandatory)
- `MAINNET_PRIVATE_KEY` (optional, required when deploying to mainnet)
- `RINKEBY_PRIVATE_KEY` (optional, required when deploying to rinkeby)
- `ROPSTEN_PRIVATE_KEY` (optional, required when deploying to ropsten)
- `GOERLI_PRIVATE_KEY` (optional, required when deploying to goerli)
- `KOVAN_PRIVATE_KEY` (optional, required when deploying to kovan)

## Scripts

- `npm run compile` -> Compiles all contracts to generates ABIs and typescript types
- `npm test` -> Runs all tests in test/ directory
- `npm run test:gas` -> Runs all tests in test/ directory and displays gas usage
- `npx hardhat run scripts/deployAll.ts --network <networkName>` -> Deploys all contracts
