### Deployment steps

- add project to Project enum in `src/enum.ts`
- add already deployed token addresses to `script/constants/existing-token-addresses.ts`
- add PROJECT_TYPE, PROJECT, TOKENS variables in `.env`
- add project config in `script/constants/projectConstants/supertoken/` or `script/constants/projectConstants/supertoken/`.
- run command `npx ts-node script/deploy/deployAndConfigure.ts`.
