### Deployment steps

- add project to Project enum in `src/enum.ts`
- add already deployed token addresses to `script/constants/existing-token-addresses.ts`
- add PROJECT_TYPE, PROJECT, TOKENS variables in `.env`
  - PROJECT_TYPE - `superbridge` or `supertoken`
  - PROJECT - project name. this should match the project name added in `src/enums.ts`
  - TOKENS - comma separated list of tokens. Useful for superbridge with multiple tokens.
  - DRY_RUN - for running configure and admin scripts, can use this variable to check the effect first before actually sending transaction.
- add project config in `script/constants/projectConstants/supertoken/` or `script/constants/projectConstants/superbridge/`.
- run command `npx ts-node script/deploy/deployAndConfigure.ts`.
