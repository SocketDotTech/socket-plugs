import { DeploymentMode } from "@socket.tech/dl-core";
import { Project, ProjectAddresses } from "./types";

import dev_aevo_testnet_addresses from "../deployments/superbridge/dev_aevo-testnet_addresses.json";
import dev_lyra_testnet_address from "../deployments/superbridge/dev_lyra-testnet_addresses.json";
import dev_socket_dev_address from "../deployments/superbridge/dev_socket-dev_addresses.json";
import prod_aevo_testnet_addresses from "../deployments/superbridge/prod_aevo-testnet_addresses.json";
import prod_lyra_testnet_address from "../deployments/superbridge/prod_lyra-testnet_addresses.json";
import prod_sxn_testnet_addresses from "../deployments/superbridge/prod_sx-network-testnet_addresses.json";
import prod_mode_testnet_addresses from "../deployments/superbridge/prod_mode-testnet_addresses.json";
import prod_viction_testnet_addresses from "../deployments/superbridge/prod_viction-testnet_addresses.json";
import prod_aevo_addresses from "../deployments/superbridge/prod_aevo_addresses.json";
import prod_lyra_address from "../deployments/superbridge/prod_lyra_addresses.json";
import prod_ancient8_testnet_addresses from "../deployments/superbridge/prod_ancient8-testnet_addresses.json";

// export const getSuperbridgeAddresses = async (
//   mode: DeploymentMode,
//   project: Project
// ): Promise<ProjectAddresses> => {
//   try {
//     // path relative to its position in final published package
//     return (await import(
//       `../deployments/superbridge/${mode}_${project}_addresses.json`
//     )) as ProjectAddresses;
//   } catch (e) {
//     throw new Error(`addresses not found, mode: ${mode}, project: ${project}`);
//   }
// };

export const getSuperBridgeAddresses = async (
  deploymentMode: DeploymentMode,
  project: Project
): Promise<ProjectAddresses> => {
  try {
    if (deploymentMode === DeploymentMode.DEV) {
      if (project === Project.AEVO_TESTNET)
        return dev_aevo_testnet_addresses as ProjectAddresses;
      if (project === Project.LYRA_TESTNET)
        return dev_lyra_testnet_address as ProjectAddresses;
      if (project === Project.SOCKET_DEV)
        return dev_socket_dev_address as ProjectAddresses;
      throw new Error();
    } else if (deploymentMode === DeploymentMode.PROD) {
      if (project === Project.SX_NETWORK_TESTNET)
        return prod_sxn_testnet_addresses as ProjectAddresses;
      if (project === Project.LYRA_TESTNET)
        return prod_lyra_testnet_address as ProjectAddresses;
      if (project === Project.AEVO_TESTNET)
        return prod_aevo_testnet_addresses as ProjectAddresses;
      if (project === Project.MODE_TESTNET)
        return prod_mode_testnet_addresses as ProjectAddresses;
      if (project === Project.VICTION_TESTNET)
        return prod_viction_testnet_addresses as ProjectAddresses;
      if (project === Project.AEVO)
        return prod_aevo_addresses as ProjectAddresses;
      if (project === Project.LYRA)
        return prod_lyra_address as ProjectAddresses;
      if (project === Project.ANCIENT8_TESTNET)
        return prod_ancient8_testnet_addresses as ProjectAddresses;
      throw new Error();
    } else throw new Error();
  } catch (e) {
    throw new Error(`address mode: ${deploymentMode}, project: ${project}`);
  }
};
