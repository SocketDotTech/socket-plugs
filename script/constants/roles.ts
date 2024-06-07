import { id } from "ethers/lib/utils";

export const LIMIT_UPDATER_ROLE = id("LIMIT_UPDATER_ROLE");
export const RESCUE_ROLE = id("RESCUE_ROLE");
export const CONTROLLER_ROLE = id("CONTROLLER_ROLE");
export const MINTER_ROLE = id("MINTER_ROLE");
export const SOCKET_RELAYER_ROLE = id("SOCKET_RELAYER_ROLE");
export const ALL_ROLES = [
  {
    name: "LIMIT_UPDATER_ROLE",
    hash: LIMIT_UPDATER_ROLE,
  },
  {
    name: "RESCUE_ROLE",
    hash: RESCUE_ROLE,
  },
  {
    name: "CONTROLLER_ROLE",
    hash: CONTROLLER_ROLE,
  },
  {
    name: "MINTER_ROLE",
    hash: MINTER_ROLE,
  },
  {
    name: "SOCKET_RELAYER_ROLE",
    hash: SOCKET_RELAYER_ROLE,
  },
];
