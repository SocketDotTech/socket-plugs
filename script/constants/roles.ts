import { id } from "ethers/lib/utils";

export const LIMIT_UPDATER_ROLE = id("LIMIT_UPDATER_ROLE");
export const RESCUE_ROLE = id("RESCUE_ROLE");
export const CONTROLLER_ROLE = id("CONTROLLER_ROLE");
export const MINTER_ROLE = id("MINTER_ROLE");
export const SOCKET_RELAYER_ROLE = id("SOCKET_RELAYER_ROLE");
export const ALL_ROLES = {
  LIMIT_UPDATER_ROLE: LIMIT_UPDATER_ROLE,
  RESCUE_ROLE: RESCUE_ROLE,
  // CONTROLLER_ROLE is only used on SuperToken
  CONTROLLER_ROLE: CONTROLLER_ROLE,
  // MINTER_ROLE is only used on yield-token
  MINTER_ROLE: MINTER_ROLE,
  SOCKET_RELAYER_ROLE: SOCKET_RELAYER_ROLE,
};
