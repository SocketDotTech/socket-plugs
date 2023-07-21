# DataLayer Usage Examples

### Prereqs

- Foundry

### Setup

Clone project and install dependencies.

```bash=
# clone the repository
git clone https://github.com/SocketDotTech/socketDL-examples

# move to repository folder
cd socketDL-examples

# install forge dependencies
forge install
```

### Test

Tests are run using the [Forge](https://github.com/foundry-rs/foundry/tree/master/forge) tool of [Foundry](https://github.com/foundry-rs/foundry).

```bash=
forge test
```

### Deploy

Deployments use [Hardhat](https://github.com/NomicFoundation/hardhat)

Local deployments:

1. Copy `.env.example` and add the values
2. Run command to load env: `source .env`
3. To deploy

```bash=
forge create --rpc-url $ETHEREUM_RPC_URL --private-key $PRIVATE_KEY --etherscan-api-key $ETHERSCAN_API_KEY src/Counter.sol:Counter --constructor-args <SOCKET_ADDRESS>
```
