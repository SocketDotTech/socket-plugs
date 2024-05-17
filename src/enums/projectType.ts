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
  [Project.KINTO]: ProjectType.SUPERBRIDGE,
  [Project.KINTO_MAINNET]: ProjectType.SUPERBRIDGE,
};
