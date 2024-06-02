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
  [Project.TOKEN_TEST_PROJECT_TESTNET]: ProjectType.SUPERTOKEN,
  [Project.BRIDGE_TEST_PROJECT_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.TOKEN1_TESTNET]: ProjectType.SUPERTOKEN,
  [Project.TEST2_TESTNET]: ProjectType.SUPERTOKEN,
  [Project.BRIDGE1_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.BRIDGE2_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.BRIDGE3_TESTNET]: ProjectType.SUPERBRIDGE,
  [Project.DF_TESTNET]: ProjectType.SUPERTOKEN,
};
