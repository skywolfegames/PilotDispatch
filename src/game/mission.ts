import { MAP } from "./colliders";
import type { NearbyDesk, OfpSummary } from "./types";

export type MissionTarget = {
  x: number;
  z: number;
  color: string;
  label: string;
  id: NearbyDesk;
};

export function missionTarget(state: {
  ofp: OfpSummary | null;
  visitedSimbrief: boolean;
  ivaoOnline: boolean;
  doorReleased: boolean;
}): MissionTarget | null {
  if (!state.ofp) {
    return { x: MAP.simbrief.x, z: MAP.simbrief.z + 1.6, color: "#8aa4b8", label: "SimBrief", id: "simbrief" };
  }
  if (!state.ivaoOnline) {
    return { x: MAP.ivao.x, z: MAP.ivao.z + 1.6, color: "#3d9a7a", label: "IVAO", id: "ivao" };
  }
  if (!state.doorReleased) {
    return { x: MAP.doorSwitch.x, z: MAP.doorSwitch.z, color: "#c4a574", label: "Porta", id: "door" };
  }
  return null;
}

export function signedAngleTo(px: number, pz: number, camYaw: number, tx: number, tz: number): number {
  const dx = tx - px;
  const dz = tz - pz;
  const fx = -Math.sin(camYaw);
  const fz = -Math.cos(camYaw);
  return Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz);
}
