import { ProjectType } from "../enum";
import { Project } from "./projects";

export const ProjectTypeMap: Record<Project, ProjectType> = {
  [Project.AEVO]: ProjectType.SUPERBRIDGE,
  [Project.AEVO_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.LYRA]: ProjectType.SUPERBRIDGE,
  [Project.LYRA_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.REYA_CRONOS]: ProjectType.SUPERBRIDGE,
  [Project.REYA]: ProjectType.SUPERBRIDGE,
  [Project.RAIN_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.SX_NETWORK_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.SPECTRAL_SIGNAL]: ProjectType.SUPERTOKEN,
  [Project.LEAF_TESTNET]: ProjectType.SUPERTOKEN,
  [Project.MIST_TESTNET]: ProjectType.SUPERTOKEN,
  [Project.SYNDR_SEPOLIA_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.TESTING_MAINNET]: ProjectType.SUPERTOKEN,
  [Project.AA_MAINNET]: ProjectType.SUPERTOKEN,
  [Project.SV_MAINNET]: ProjectType.SUPERTOKEN,
  [Project.ADG_MAINNET]: ProjectType.SUPERTOKEN,
  [Project.AAVEGOTCHI_MAINNET]: ProjectType.SUPERTOKEN,
  [Project.TIMESWAP_TEST_MAINNET]: ProjectType.SUPERTOKEN,
  [Project.TESTING_TESTNET]: ProjectType.SUPERTOKEN,
  [Project.MAGIC_MAINNET]: ProjectType.SUPERTOKEN,
  [Project.AAVEGOTCHI_BRIDGE_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.SOCKET_GHST_TESTNET]: ProjectType.SUPERTOKEN, //SGHST on Socket Testnet
  [Project.GEIST_BRIDGE_TESTNET]: ProjectType.SUPERBRIDGE, //USDC on Polter Testnet
  [Project.GEIST_BRIDGE_MAINNET]: ProjectType.SUPERBRIDGE, //USDC on Geist Mainnet
  [Project.SOCKET_GHST_MAINNET]: ProjectType.SUPERTOKEN, //SGHST on Geist Mainnet
};
