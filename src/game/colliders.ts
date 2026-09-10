export type AABB = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const MAP = {
  spawn: { x: 1.15, z: 1.7 },
  simbrief: { x: -8, z: -4.4 },
  ivao: { x: 27.2, z: -4.4 },
  metar: { x: -2.65, z: -1.15 },
  ivaoMetar: { x: 21.85, z: -1.15 },
  webeye: { x: 0.2, z: 8.6 },
  towers: { x: -14.35, z: -3.6 },
  doorSwitch: { x: 17.2, z: -2.7 },
  doorSwitch2: { x: 17.2, z: 2.7 },
  interactRadius: 5.4,
  doorSwitchRadius: 1.35,
  playerRadius: 0.42,
  waypointRadius: 1.35,
  door: { minX: 14.05, maxX: 15.95, minZ: -2.25, maxZ: 2.25 },
} as const;

const WALLS: AABB[] = [
  // Hall A
  { minX: -16.4, maxX: 14.2, minZ: -10.35, maxZ: -9.55 },
  { minX: -16.4, maxX: 14.2, minZ: 11.55, maxZ: 12.35 },
  { minX: -16.45, maxX: -15.55, minZ: -10.3, maxZ: 12.3 },
  { minX: 13.7, maxX: 14.15, minZ: -10.3, maxZ: -2.25 },
  { minX: 13.7, maxX: 14.15, minZ: 2.25, maxZ: 12.3 },
  // Hall B
  { minX: 15.75, maxX: 36.45, minZ: -10.35, maxZ: -9.55 },
  { minX: 15.75, maxX: 36.45, minZ: 11.55, maxZ: 12.35 },
  { minX: 35.55, maxX: 36.45, minZ: -10.3, maxZ: 12.3 },
  { minX: 15.85, maxX: 16.3, minZ: -10.3, maxZ: -2.25 },
  { minX: 15.85, maxX: 16.3, minZ: 2.25, maxZ: 12.3 },
];

const FURNITURE: AABB[] = [
  { minX: -11.15, maxX: -4.85, minZ: -5.7, maxZ: -3.15 },
  { minX: 24.05, maxX: 30.35, minZ: -5.7, maxZ: -3.15 },
  { minX: -13.2, maxX: -11.4, minZ: 3.4, maxZ: 7.2 },
  { minX: -3.4, maxX: -1.6, minZ: 3.4, maxZ: 7.2 },
  { minX: 4.4, maxX: 6.2, minZ: 3.4, maxZ: 7.2 },
  { minX: 20.6, maxX: 22.4, minZ: 3.4, maxZ: 7.2 },
  { minX: 31.4, maxX: 33.2, minZ: 3.4, maxZ: 7.2 },
  { minX: -1.6, maxX: 1.6, minZ: -8.6, maxZ: -6.6 },
  { minX: 32.28, maxX: 32.82, minZ: -1.38, maxZ: -0.9 },
];

const COLUMNS: AABB[] = [
  [-12, 2.2],
  [2.5, 2.2],
  [10.2, 2.2],
  [21.4, 2.2],
  [32.2, 2.2],
  [-12, -7.4],
  [2.5, -7.4],
  [10.2, -7.4],
  [21.4, -7.4],
  [32.2, -7.4],
].map(([x, z]) => ({
  minX: x - 0.42,
  maxX: x + 0.42,
  minZ: z - 0.42,
  maxZ: z + 0.42,
}));

export function nearMetar(px: number, pz: number): boolean {
  return nearWaypoint(px, pz, MAP.metar) || nearWaypoint(px, pz, MAP.ivaoMetar);
}

export function nearWebeye(px: number, pz: number): boolean {
  return nearWaypoint(px, pz, MAP.webeye);
}

export function nearTowers(px: number, pz: number): boolean {
  return nearWaypoint(px, pz, MAP.towers);
}

export function nearCounter(px: number, pz: number, desk: { x: number; z: number }): boolean {
  return nearWaypoint(px, pz, { x: desk.x, z: desk.z + 1.7 });
}

export function nearWaypoint(px: number, pz: number, waypoint: { x: number; z: number }): boolean {
  return dist2(px, pz, waypoint.x, waypoint.z) <= MAP.waypointRadius ** 2;
}

export function getColliders(doorOpen: boolean): AABB[] {
  const list = [...WALLS, ...FURNITURE, ...COLUMNS];
  if (!doorOpen) list.push({ ...MAP.door });
  return list;
}

export function getCameraColliders(doorOpen: boolean): AABB[] {
  const list = [...WALLS, ...COLUMNS];
  if (!doorOpen) list.push({ ...MAP.door });
  return list;
}

function pointHits(x: number, z: number, radius: number, boxes: AABB[]): boolean {
  for (const box of boxes) {
    if (
      x > box.minX - radius &&
      x < box.maxX + radius &&
      z > box.minZ - radius &&
      z < box.maxZ + radius
    ) {
      return true;
    }
  }
  return false;
}

export function constrainCamera(
  ox: number,
  oy: number,
  oz: number,
  cx: number,
  cy: number,
  cz: number,
  boxes: AABB[],
): { x: number; y: number; z: number } {
  const radius = 0.32;
  const maxY = 6.05;
  const minY = 1.28;
  cy = Math.min(maxY, Math.max(minY, cy));
  const dx = cx - ox;
  const dy = cy - oy;
  const dz = cz - oz;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.001) return { x: ox, y: oy + 1.6, z: oz };

  const steps = Math.max(10, Math.ceil(dist / 0.1));
  let x = ox;
  let y = oy;
  let z = oz;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = ox + dx * t;
    const ny = oy + dy * t;
    const nz = oz + dz * t;
    if (ny > maxY || ny < minY || pointHits(nx, nz, radius, boxes)) break;
    x = nx;
    y = ny;
    z = nz;
  }

  const vx = x - ox;
  const vy = y - oy;
  const vz = z - oz;
  const mag = Math.hypot(vx, vy, vz);
  if (mag > 0.55) {
    const s = (mag - 0.12) / mag;
    return { x: ox + vx * s, y: oy + vy * s, z: oz + vz * s };
  }
  if (mag < 0.45) {
    return { x: ox, y: Math.min(maxY, oy + 1.55), z: oz };
  }
  return { x, y, z };
}

export function resolveCircleAabb(
  x: number,
  z: number,
  radius: number,
  boxes: AABB[],
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const box of boxes) {
    const minX = box.minX - radius;
    const maxX = box.maxX + radius;
    const minZ = box.minZ - radius;
    const maxZ = box.maxZ + radius;
    if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
      const dxL = px - minX;
      const dxR = maxX - px;
      const dzB = pz - minZ;
      const dzF = maxZ - pz;
      const m = Math.min(dxL, dxR, dzB, dzF);
      if (m === dxL) px = minX;
      else if (m === dxR) px = maxX;
      else if (m === dzB) pz = minZ;
      else pz = maxZ;
    }
  }
  return { x: px, z: pz };
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}
