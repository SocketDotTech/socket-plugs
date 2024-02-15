## Setup

- Clone the repository https://github.com/SocketDotTech/socket-plugs.
- Install node dependancies `yarn install`.
- Install forge dependancies `forge install`.

## Adding new token support to existing project

### Env setup

Add following environment variables. Can be added to .env file at project root or can be exported as variables in terminal.
- `DEPLOYMENT_MODE` - defines the version of socket-dl to use. Use value `prod`. Other modes are used only for internal testing.
- `PROJECT` - defines the project for which deployment needs to be done. Options can be found under `Project` enum in `src/types.ts`.
- `TOKEN` - defines the token which support is being added. Options can be found under `Tokens` enum in `src/types.ts`.
- RPCs - RPC url needs to be added for every chain where transactions are expected to be made. They are of format `<chain name>_RPC`. All options can be found in `.env.example` file.
- `SOCKET_SIGNER_KEY` - private key of the deployer.
- `SOCKET_OWNER_ADDRESS` - address of the deployer.

### Project details setup
__Project constants__
- The details like integration type, chain pairs, limits for each project are defined in their file under `script/constants/project-constants`. Modify the relavant file to add new token details.
- `isFiatTokenV2_1` option should be set true only for circle's standard compatible USDC contract on app chain. 
- `depositLimit` and `withdrawLimit` should be set to maximum bridgeable amount in a day.
- `depositRate` and `withdrawRate` should be `limit/86400`.
- `poolCount` should be set to 0 for standard deployment. Should be changed if there are multiple vaults on source chain mapping to same asset on app chain.

__Project addresses__
- All contract addresses for a project are defined in the relevant file under `deployments/superbridge`.
- In this file, add the details for new token that is being deployed.
- `isAppChain` should be set true for the app chain and false for other source chains.
- `MintableToken` should be set for app chain.
- `NonMintableToken` should be set as token on source chains.
- Other addresses will be populated automatically when contracts are deployed.

### Run scripts
- Run `npx hardhat run script/deploy/super-bridge/deploy.ts` to deploy the contracts.
- Run `npx hardhat run script/deploy/super-bridge/configure.ts` to configure and connect the deployed contracts.
