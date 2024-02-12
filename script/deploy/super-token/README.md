# SUPER TOKEN DEPLOYMENT AND SETUP

### PROJECT SETUP

- Clone the Repo and checkout to branch `main`
- Install dependencies: `yarn`
- Install contract dependencies: `forge install`
- Environment variables: copy `.env.example` to `.env`.
  - Fill in the needed RPCs, others can be ignored.
  - Update `SOCKET_SIGNER_KEY` and `SOCKET_OWNER_ADDRESS`.
  - Add `TOKEN_PROJECT` with the token name
- Compile: `yarn build`

### DEPLOYMENT

- Setup Config file: To configure the token, add a file inside `script/constants/token-constants` with the same name as `TOKEN_PROJECT` in your .env.
  Add following things in the file. (You can refer test file for more or just copy and edit it)

  - type - Select super token type with or without execution payload
  - projectName - Name of project
  - tokenName - Token Name
  - tokenSymbol - Token Symbol
  - tokenDecimal - Number of decimals (should be same on all chains)
  - owner - owner of the contracts (controls limits, admin settings and rescue of funds)
  - initialSupply - Initial supply of token (should be zero if a token is already deployed on one chain)
  - initialSupplyOwner - Initial supply if any will be minted to this address
  - superTokenChains - Array of chains where a token needs to be bridged and is not already deployed
  - vaultTokens - List of tokens already deployed on chain (a vault will be deployed there to lock unlock tokens for bridging)

  ```
  For example: {
      [ChainSlug.SEPOLIA]: "0xFD093e2a4d3190b2020C95846dBe5fD073721e89"
  }
  ```

  - integrationType - You can select from these Integration types: fast, native and optimistic
  - bridgeLimit - Maximum amount allowed to be bridged in 24 hours
  - bridgeRate - Per second rate - corresponding to bridge max limit

- Deploy the contracts: Run the command `npx hardhat run script/deploy/super-token/deploy.ts`. This will deploy the contracts and store them in `deployments/super-token/` folder present in the root.
- Configure and connect the contracts: Run the command `npx hardhat run script/deploy/super-token/configure.ts`. This will configure the contracts and connect them with each other on all chains.

### Bridge Tokens

- If you want to Bridge the tokens from vault chain to a super token chain,

  - In file `script/deploy/super-token/bridge/bridgeFromVault.ts`, update the src chain, dst chain and amount to bridge (src chain is chain having SuperTokenVault).
  - run this script: `npx hardhat run script/deploy/super-token/bridge/bridgeFromVault.ts`
  - This is an example txn from vault: https://prod.dlapi.socket.tech/messages-from-tx?srcChainSlug=11155111&srcTxHash=0x638cc80e15722caed0681a5c440794ad33b87664b45010ec6b307e5b78b6e663

- If you want to Bridge the tokens from super token chain to a vault chain,
  - In file `script/deploy/super-token/bridge/bridgeSuperToken.ts`, update the src chain, dst chain and amount to bridge (src chain is chain having SuperToken).
  - run this script: `npx hardhat run script/deploy/super-token/bridge/bridgeSuperToken.ts`
  - This is an example txn from vault: https://prod.dlapi.socket.tech/messages-from-tx?srcChainSlug=421614&srcTxHash=0xd543779cedada6f386f3038836ef6685eeceeb2851bc1c8ddda7b96e69b6cb13

On running the scripts, you will get the socket dl tracking API url which can be used track the message execution status.
