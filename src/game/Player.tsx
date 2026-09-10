import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { MAP, getCameraColliders, getColliders, resolveCircleAabb, constrainCamera, dist2, nearCounter, nearWebeye, nearMetar, nearTowers } from "./colliders";
import { gameInput } from "./input";
import { PilotMesh } from "./PilotMesh";
import { useGame } from "./store";
import type { NearbyDesk } from "./types";

const WALK = 4.15;
const SPRINT = 7.05;
const CAM_DIST = 4.55;
const LOOK_SENS = 0.0022;
const PITCH_MIN = -0.62;
const PITCH_MAX = 0.28;

const tmpFwd = new Vector3();
const tmpRight = new Vector3();
const tmpCam = new Vector3();
const tmpLook = new Vector3();

type Probe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: Probe;
    __game?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPos: () => { x: number; z: number };
      getCam: () => { x: number; y: number; z: number };
      getCamYaw: () => number;
      setCamYaw: (yaw: number) => void;
      teleport: (x: number, z: number) => void;
      nearby: () => NearbyDesk;
      enter: () => void;
      injectTraining: () => void;
      confirmIvao: () => void;
      releaseDoor: () => void;
      replay: () => void;
      openSheet: () => void;
      nColliders: () => number;
      hits: () => { minX: number; maxX: number; minZ: number; maxZ: number }[];
    };
  }
}

function resetPilotPose(
  pos: { current: { x: number; z: number } },
  yaw: { current: number },
  camYaw: { current: number },
  camPitch: { current: number },
  speed: { current: number },
  group: { current: Group | null },
) {
  pos.current = { x: MAP.spawn.x, z: MAP.spawn.z };
  yaw.current = 0;
  camYaw.current = 0;
  camPitch.current = -0.18;
  speed.current = 0;
  if (group.current) {
    group.current.position.set(MAP.spawn.x, 0, MAP.spawn.z);
    group.current.rotation.y = Math.PI;
  }
}

export function Player() {
  const group = useRef<Group>(null);
  const pos = useRef<{ x: number; z: number }>({ x: MAP.spawn.x, z: MAP.spawn.z });
  const yaw = useRef(0);
  const camYaw = useRef(0);
  const camPitch = useRef(-0.18);
  const speed = useRef(0);
  const accum = useRef(0);
  const wasPlaying = useRef(false);
  const { camera, gl } = useThree();

  const phase = useGame((s) => s.phase);
  const spawnNonce = useGame((s) => s.spawnNonce);
  const ofp = useGame((s) => s.ofp);
  const ivaoOnline = useGame((s) => s.ivaoOnline);
  const doorReleased = useGame((s) => s.doorReleased);
  const setNearby = useGame((s) => s.setNearby);
  const pause = useGame((s) => s.pause);
  const doorOpen = Boolean(ofp) && (!ivaoOnline || doorReleased);
  const camBoxes = useMemo(() => getCameraColliders(doorOpen), [doorOpen]);

  useEffect(() => {
    resetPilotPose(pos, yaw, camYaw, camPitch, speed, group);
    wasPlaying.current = false;
  }, [spawnNonce]);

  useEffect(() => {
    gameInput.bind();
    gameInput.isPlaying = () => {
      const s = useGame.getState();
      return s.phase === "playing" && !s.simbriefSheet && !s.webeyeOpen && !s.metarOpen && !s.towersOpen;
    };
    gameInput.onFreeMouse = () => useGame.getState().setLookMode("drag");

    const probe: Probe = {
      getYaw: () => yaw.current,
      getSpeed: () => speed.current,
      setKeys: (codes) => gameInput.setKeys(codes),
    };
    window.__controlsTest = probe;
    window.__game = {
      getYaw: () => yaw.current,
      getSpeed: () => speed.current,
      getPos: () => ({ x: pos.current.x, z: pos.current.z }),
      getCam: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
      getCamYaw: () => camYaw.current,
      setCamYaw: (yawVal) => {
        camYaw.current = yawVal;
      },
      teleport: (x, z) => {
        pos.current = { x, z };
      },
      nearby: () => useGame.getState().nearby,
      enter: () => useGame.getState().enterTerminal(),
      injectTraining: () => useGame.getState().injectTrainingOfp(),
      confirmIvao: () => useGame.getState().confirmIvao(),
      releaseDoor: () => useGame.getState().releaseDoor(),
      replay: () => useGame.getState().replay(),
      openSheet: () => useGame.getState().openSimbriefSheet(),
      nColliders: () => {
        const s = useGame.getState();
        const open = Boolean(s.ofp) && (!s.ivaoOnline || s.doorReleased);
        return getColliders(open).length;
      },
      hits: () => {
        const s = useGame.getState();
        const open = Boolean(s.ofp) && (!s.ivaoOnline || s.doorReleased);
        const { x, z } = pos.current;
        const r = MAP.playerRadius;
        return getColliders(open).filter(
          (b) => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r,
        );
      },
    };
    return () => {
      if (window.__controlsTest === probe) delete window.__controlsTest;
    };
  }, [camera]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const playing = phase === "playing";

    if (!playing) {
      wasPlaying.current = false;
      const t = state.clock.elapsedTime;
      camera.position.set(-4.2 + Math.sin(t * 0.18) * 1.6, 2.85, 5.4 + Math.cos(t * 0.14) * 0.8);
      camera.lookAt(-7.2, 1.15, -3.4);
      return;
    }

    if (gameInput.consumePause()) pause();

    const st = useGame.getState();
    if (st.simbriefSheet || st.webeyeOpen || st.metarOpen || st.towersOpen) {
      gameInput.consumeLook();
      gameInput.consumeInteract();
      return;
    }

    const look = gameInput.consumeLook();
    camYaw.current -= look.x * LOOK_SENS;
    camPitch.current -= look.y * LOOK_SENS;
    if (camPitch.current < PITCH_MIN) camPitch.current = PITCH_MIN;
    if (camPitch.current > PITCH_MAX) camPitch.current = PITCH_MAX;

    accum.current += d;
    const STEP = 1 / 60;
    while (accum.current >= STEP) {
      stepMovement(STEP);
      accum.current -= STEP;
    }

    const px = pos.current.x;
    const pz = pos.current.z;
    const headY = 1.52;

    if (group.current) {
      group.current.position.set(px, 0, pz);
      group.current.rotation.y = yaw.current + Math.PI;
    }

    const cp = camPitch.current;
    const cy = camYaw.current;
    const lx = -Math.sin(cy) * Math.cos(cp);
    const ly = Math.sin(cp);
    const lz = -Math.cos(cy) * Math.cos(cp);

    tmpCam.set(px - lx * CAM_DIST, headY - ly * CAM_DIST + 0.95, pz - lz * CAM_DIST);
    const held = constrainCamera(px, headY + 0.35, pz, tmpCam.x, tmpCam.y, tmpCam.z, camBoxes);
    tmpCam.set(held.x, held.y, held.z);
    const justEntered = !wasPlaying.current;
    wasPlaying.current = true;
    const snap = justEntered || camera.position.distanceTo(tmpCam) > 7;
    if (snap) camera.position.copy(tmpCam);
    else camera.position.lerp(tmpCam, 1 - Math.exp(-12 * d));
    tmpLook.set(px, headY, pz);
    camera.lookAt(tmpLook);

    const live = useGame.getState();
    const nearDoor =
      live.ivaoOnline &&
      !live.doorReleased &&
      (dist2(px, pz, MAP.doorSwitch.x, MAP.doorSwitch.z) < MAP.doorSwitchRadius ** 2 ||
        dist2(px, pz, MAP.doorSwitch2.x, MAP.doorSwitch2.z) < MAP.doorSwitchRadius ** 2);
    const nearSim = nearCounter(px, pz, MAP.simbrief);
    const nearIvao = nearCounter(px, pz, MAP.ivao);
    const nearWeb = nearWebeye(px, pz);
    const nearMet = nearMetar(px, pz);
    const nearTwr = nearTowers(px, pz);
    const dIvao = dist2(px, pz, MAP.ivao.x, MAP.ivao.z);
    const dMetar = Math.min(
      dist2(px, pz, MAP.metar.x, MAP.metar.z),
      dist2(px, pz, MAP.ivaoMetar.x, MAP.ivaoMetar.z),
    );
    let next: NearbyDesk = nearDoor ? "door" : null;
    if (!next) {
      if (nearTwr) next = "towers";
      else if (nearSim) next = "simbrief";
      else if (nearIvao && nearMet) next = dMetar < dIvao ? "metar" : "ivao";
      else if (nearIvao) next = "ivao";
      else if (nearMet) next = "metar";
      else if (nearWeb) next = "webeye";
    }
    if (live.nearby !== next) setNearby(next);

    if (live.doorReleased && px < 12.6) {
      live.finishMission();
    }

    if (gameInput.consumeInteract()) {
      const s = useGame.getState();
      if (s.simbriefSheet || s.webeyeOpen || s.metarOpen || s.towersOpen) {
        /* already open */
      } else if (next === "simbrief") {
        s.openSimbriefSheet();
      } else if (next === "webeye") {
        s.openWebeye();
      } else if (next === "metar") {
        s.openMetar();
      } else if (next === "towers") {
        s.openTowers();
      } else if (next === "ivao" || next === "door") {
        window.dispatchEvent(new CustomEvent("galeao-interact"));
      }
    }
  });

  function stepMovement(dt: number) {
    const s = useGame.getState();
    const open = Boolean(s.ofp) && (!s.ivaoOnline || s.doorReleased);
    const boxes = getColliders(open);
    const keys = gameInput.held();
    const cy = camYaw.current;
    tmpFwd.set(-Math.sin(cy), 0, -Math.cos(cy));
    tmpRight.set(Math.cos(cy), 0, -Math.sin(cy));

    let ax = 0;
    let az = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      ax += tmpFwd.x;
      az += tmpFwd.z;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      ax -= tmpFwd.x;
      az -= tmpFwd.z;
    }
    if (keys.has("KeyD") || keys.has("ArrowRight")) {
      ax += tmpRight.x;
      az += tmpRight.z;
    }
    if (keys.has("KeyA") || keys.has("ArrowLeft")) {
      ax -= tmpRight.x;
      az -= tmpRight.z;
    }
    ax += tmpRight.x * gameInput.joyX + tmpFwd.x * -gameInput.joyY;
    az += tmpRight.z * gameInput.joyX + tmpFwd.z * -gameInput.joyY;

    const len = Math.hypot(ax, az);
    const sprint =
      keys.has("ShiftLeft") || keys.has("ShiftRight") || gameInput.sprintTouch;
    const target = len > 0.12 ? (sprint ? SPRINT : WALK) : 0;
    speed.current += (target - speed.current) * Math.min(1, dt * 9);

    if (len > 0.12) {
      ax /= len;
      az /= len;
      const desired = Math.atan2(-ax, -az);
      let diff = desired - yaw.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw.current += diff * Math.min(1, dt * 10);
      pos.current.x += ax * speed.current * dt;
      pos.current.z += az * speed.current * dt;
    } else {
      speed.current *= Math.max(0, 1 - dt * 8);
    }

    const resolved = resolveCircleAabb(pos.current.x, pos.current.z, MAP.playerRadius, boxes);
    pos.current.x = resolved.x;
    pos.current.z = resolved.z;
  }

  return (
    <group ref={group} position={[MAP.spawn.x, 0, MAP.spawn.z]}>
      <PilotMesh speedRef={speed} />
    </group>
  );
}
