# SUPER TOKEN DEPLOYMENT AND SETUP

### PROJECT SETUP

- Clone the Repo and checkout to branch `looks-supertoken`
- Install dependencies: `yarn`
- Install contract dependencies: `forge install`
- Environment variables: copy `.env.example` to `.env` and fill in the needed RPCs. Rest can be ignored. Also update `SOCKET_SIGNER_KEY` and `SOCKET_OWNER_ADDRESS`.
- Compile: `yarn build`

### DEPLOYMENT

    - Setup Config file: To configure the token, update the `config.ts` file present in this folder.
    - Deploy the contracts: Run the command `npx hardhat run script/deploy/super-token/deploy.ts`. This will deploy the contracts and store them in `deployments/super-token/` folder present in the root.
    - Configure and connect the contracts: Run the command `npx hardhat run script/deploy/super-token/configure.ts`. This will configure the contracts and connect them with each other on all chains.

### Bridge Tokens

    - In the file `script/deploy/super-token/config.ts`, set the src chain, dest chain and amount of tokens to be bridged.
    - If you want to Bridge the tokens from vault chain to a super token chain, run this script:
    `npx ts-node script/deploy/super-token/bridge/toSuperTokenChain.ts`
    - If you want to Bridge the tokens from super token chain to a vault chain, run this script:
    `npx ts-node script/deploy/super-token/bridge/toVaultChain.ts`

    On running the scripts, you will get the socket dl tracking API url which can be used track the message execution status.
