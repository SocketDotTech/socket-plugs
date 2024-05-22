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
};
