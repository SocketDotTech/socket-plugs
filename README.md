### Setup

Clone project and install dependencies.

```bash=
# clone the repository
git clone https://github.com/SocketDotTech/socket-plugs

# move to repository folder
cd socket-plugs

# install forge dependencies
forge install

# install node dependencies
yarn install
```

### Test

Tests are run using the [Forge](https://github.com/foundry-rs/foundry/tree/master/forge) tool of [Foundry](https://github.com/foundry-rs/foundry).

```bash=
forge test
```

### Deployment

- update the @socket.tech/dl-core package to latest version - `yarn add @socket.tech/dl-core`
- run setup config script and provide project information - `npx ts-node script/setup.ts`.
- add necessary variables in .env (rpcs, private key)
- run command `npx ts-node script/deploy.ts`.

If want to update configuration, can check the configuration file under
`script/constants/projectConstants/${projectType}/` folder with your project name. Can add/remove chains, update rate limits, add tokens, etc. Read the guide below before making any changes.

### Project Constants Help Guide

- **Vault Chains** - The chains where token contract is already deployed, and token will be locked/unlocked for bridging.

  - For superbridge, we will have >=1 vault chains where we will bridge from.
  - For supertoken , if the token is already deployed on a chain, then that chain will be vault chain. If it is a fresh supertoken deployment (token does not exist on any chain), there will be no vault chains. Therefore for supertoken, no of vault chains <=1.

- **Controller Chains** - The chains where token is minted/burned.

  - For superbridge, this will be the new chain where users are bridging. There will be only 1 controller chain (app chain) for superbridge.
  - For supertoken, all the chains (except the one where token is deployed) are controller chains, as token is minted/burned. No of controller chains >=1.
  - Note : If you are not able to find your chain in the list of chains during setup, check if the chain already have socket core contracts deployed, and if you have updated the @socket.tech/dl-core package.

- **Hooks** - Hooks are plugins that can be added for extra functionality. We have 2 options for hook right now -

  - **LIMIT_HOOK** - This hook enforces daily send and receive limits for a token. It makes sure that in case of a hack, the flow of funds is rate limited. It also checks before withdrawal whether the destination chain have enough funds for successful bridging, and reverts on source chain to avoid bad UX of stuck funds. This is the recommended hook. With this hook, we need to specify sending and receving limit for each token and each supported chain.

  - **LIMIT_EXECUTION_HOOK** - This hook extends the capability of LIMIT_HOOK and allows for arbitrary payload execution on destination after bridge is successful.

- **Rate Limits** - You can specify per token daily sending and receiving limits.

  - The limits are specified in formatted (ETH) values, ie. use 1000 for 1000 USDC limit. - Limit specified is the max daily limit.
  - When a user bridges, the current limit is reduced, and is regenerated per second (rate - max_limit / 86400 per sec) till it reaches max limit again. If a user bridges an amount which is greater than current limit, then current limit amount of tokens are sent to user, and the rest are stored as pending, which are released as limit regenerates.
  - There are view functions on the LIMIT_HOOK contract to fetch the max limit, current limit, rate of increase, etc.
  - Rate limits help to reduce the attack surface in case of a hack by limited the throughput of the bridge.

- **Integration Types** - we have 3 options for integration types (Recommended : FAST)
  - FAST: This is the default integrationType. It uses socket's 1/n security model to verify messages. Bridging time ~2 mins.
  - OPTIMISTIC - This integration Type uses optimistic security model, where messages are executed after 2 hours.
  - NATIVE_BRIDGE - This uses the native messaging bridge of underlying chains. This provides security of NATIVE bridges.
- **Pool Count** - this only applies for superbridge. normally we dont need to specify this and have a default value of 0.
  - When we are bridging out from an App chain(controller chain), we check if the destination chain have enough liquidity to allow user to bridge successfully. This accounting is done in poolPlugin.
  - We support different paths for bridging, ie FAST, OPTIMISTIC and NATIVE_BRIDGE. If a user bridges to chain using the NATIVE_BRIDGE path, and wants to withdraw using FAST path, we can allow the user to do that by keeping the poolCount for both paths as same. If we don't want to allow this, we can restrict this behavior by keeping poolId different.

### Test tokens faucets

- [arbitrum sepolia](https://sepolia.arbiscan.io/address/0x406c77947d91f965f09b458c07a66a033c3efea4)
- [optimism sepolia](https://sepolia-optimism.etherscan.io/address/0xbebfcb5a41836490c6449ce755c8dc361c175aa3)
