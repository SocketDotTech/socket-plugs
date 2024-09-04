import { DeploymentMode } from "@socket.tech/dl-core";
import { Project } from "./enum";

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
import prod_ancient8_testnet2_addresses from "../deployments/superbridge/prod_ancient8-testnet2_addresses.json";
import prod_syndr_testnet_addresses from "../deployments/superbridge/prod_syndr-sepolia-l3_addresses.json";

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
