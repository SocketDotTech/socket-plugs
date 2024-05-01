import { BigNumberish } from "ethers";
import { IntegrationTypes, ChainSlug, DeploymentMode } from "../../src";
import dotenv from "dotenv";

dotenv.config();
export const deploymentMode = process.env.DEPLOYMENT_MODE as DeploymentMode;

export type SummaryObj = {
  chain: ChainSlug;
  siblingChain?: ChainSlug;
  nonce: number;
  currentTripStatus: boolean;
  newTripStatus: boolean;
  signature: string;
  hasRole: boolean;
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  type?: number;
};

/**
 * Usable flags

 * --chains         Run only for specified chains.
 *                  Default is all chains.
 *                  Eg. npx --chains=10,2999 ts-node scripts/admin/<scriptName>.ts
 *
 * --connector_status specify whether to activate or deactivate the connectors.
 *                  Value required if updating connector status.
 *                  Values -> active,inactive
 *                  Eg. npx --connector_status=active ts-node scripts/admin/updateConnectorStatus.ts
 *
 * --sibling_chains Run only for specified sibling chains. 
 *                  Default is all sibling chains.
 *                  Eg. npx --sibling_chains=10,2999 ts-node scripts/admin/<scriptName>.ts
 *
 */

export const integrationType = (
  process.env.npm_config_integration
    ? process.env.npm_config_integration.toUpperCase()
    : IntegrationTypes.fast
) as IntegrationTypes;

export const filterChains = process.env.npm_config_chains
  ? process.env.npm_config_chains.split(",").map((c) => Number(c))
  : undefined;

export const connectorStatus = process.env.npm_config_connector_status;

export const siblingFilterChains = process.env.npm_config_sibling_chains
  ? process.env.npm_config_sibling_chains.split(",").map((c) => Number(c))
  : undefined;
