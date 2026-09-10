import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, Group } from "three";
import { MAP } from "./colliders";
import { Airliner } from "./Airliner";
import { PassengerMesh } from "./PilotMesh";
import { missionTarget } from "./mission";
import { useGame } from "./store";

function makeLabel(title: string, sub: string, bg: string, fg: string, w = 1024, h = 256) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, 0, 12, h);
  ctx.fillStyle = fg;
  ctx.font = "600 72px 'IBM Plex Sans', sans-serif";
  ctx.fillText(title, 48, 110);
  ctx.font = "500 36px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = "rgba(232,236,239,0.72)";
  ctx.fillText(sub, 48, 175);
  const tex = new CanvasTexture(c);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function makeFids() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0b1016";
  ctx.fillRect(0, 0, 1024, 640);
  ctx.fillStyle = "#8aa4b8";
  ctx.font = "600 36px 'IBM Plex Sans', sans-serif";
  ctx.fillText("SBGL  DEPARTURES", 40, 56);
  ctx.fillStyle = "rgba(232,236,239,0.35)";
  ctx.font = "500 22px 'IBM Plex Mono', monospace";
  ctx.fillText("FLIGHT    DEST     STD    GATE   STATUS", 40, 108);
  const rows = [
    ["TAM3740", "SBSP", "00:40", "A12", "BOARDING"],
    ["GLO1231", "SBRJ", "00:55", "B04", "ON TIME"],
    ["AZU4560", "SBCF", "01:10", "A07", "ON TIME"],
    ["TAM8092", "SBGR", "01:25", "A15", "DELAYED"],
    ["TAP123", "LPPT", "01:50", "C02", "ON TIME"],
    ["AAL960", "KMIA", "02:05", "C08", "GATE OPEN"],
  ];
  rows.forEach((row, i) => {
    const y = 160 + i * 70;
    ctx.fillStyle = i % 2 === 0 ? "rgba(138,164,184,0.06)" : "transparent";
    ctx.fillRect(24, y - 34, 976, 64);
    ctx.fillStyle = "#e8ecef";
    ctx.font = "600 28px 'IBM Plex Mono', monospace";
    ctx.fillText(row[0], 40, y);
    ctx.fillText(row[1], 250, y);
    ctx.fillText(row[2], 430, y);
    ctx.fillText(row[3], 600, y);
    ctx.fillStyle = row[4] === "BOARDING" ? "#3d9a7a" : row[4] === "DELAYED" ? "#c45c5c" : "#8aa4b8";
    ctx.fillText(row[4], 760, y);
  });
  const tex = new CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

function GlassMat() {
  return (
    <meshPhysicalMaterial
      color="#9eb4c6"
      transparent
      opacity={0.18}
      roughness={0.04}
      metalness={0.2}
      transmission={0.55}
      thickness={0.35}
    />
  );
}

function CeilingLights() {
  const spots: [number, number][] = [];
  for (let x = -13; x <= 33; x += 6) {
    for (const z of [-6.5, 0.5, 7.5]) {
      if (x > 12.5 && x < 16.8) continue;
      spots.push([x, z]);
    }
  }
  return (
    <group>
      {spots.map(([x, z], i) => (
        <mesh key={i} position={[x, 6.72, z]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.28, 0.08, 10]} />
          <meshStandardMaterial color="#d7dee6" emissive="#c5d0da" emissiveIntensity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Columns() {
  const coords: [number, number][] = [
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
  ];
  return (
    <group>
      {coords.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 3.35, 0]} castShadow>
            <boxGeometry args={[0.7, 6.7, 0.7]} />
            <meshStandardMaterial color="#cfd5dc" roughness={0.35} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.95, 0.24, 0.95]} />
            <meshStandardMaterial color="#9aa3ad" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Desk({
  position,
  title,
  sub,
  accent,
  active,
}: {
  position: [number, number, number];
  title: string;
  sub: string;
  accent: string;
  active: boolean;
}) {
  const tex = useMemo(() => makeLabel(title, sub, "#121820", "#e8ecef"), [title, sub]);
  const screen = useMemo(() => makeLabel("OFP", title, "#0b1520", accent, 512, 320), [title, accent]);
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.2, 1.1, 2.4]} />
        <meshStandardMaterial color="#1a222c" roughness={0.45} metalness={0.18} />
      </mesh>
      <mesh position={[0, 1.14, -0.85]}>
        <boxGeometry args={[5.8, 0.08, 0.55]} />
        <meshStandardMaterial color="#0e141c" roughness={0.3} />
      </mesh>
      <mesh position={[-1.4, 1.55, -0.82]} rotation={[-0.18, 0, 0]}>
        <planeGeometry args={[1.6, 0.95]} />
        <meshStandardMaterial map={screen} emissive={accent} emissiveIntensity={active ? 0.55 : 0.18} />
      </mesh>
      <mesh position={[1.4, 1.55, -0.82]} rotation={[-0.18, 0, 0]}>
        <planeGeometry args={[1.6, 0.95]} />
        <meshStandardMaterial map={screen} emissive={accent} emissiveIntensity={active ? 0.4 : 0.12} />
      </mesh>
      <mesh position={[0, 2.55, -1.05]}>
        <planeGeometry args={[4.6, 0.9]} />
        <meshStandardMaterial map={tex} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 1.35]}>
        <boxGeometry args={[6.4, 0.04, 0.7]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={active ? 0.9 : 0.25} />
      </mesh>
      <pointLight position={[0, 2.4, 0.4]} color={accent} intensity={active ? 4.5 : 1.6} distance={8} />
    </group>
  );
}

function Seating({ position, seats = [1, 0, 1] }: { position: [number, number, number]; seats?: number[] }) {
  return (
    <group position={position}>
      {[0, 0.7, 1.4].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh position={[0, 0.28, 0]} castShadow>
            <boxGeometry args={[1.5, 0.12, 0.55]} />
            <meshStandardMaterial color="#2a3340" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.58, -0.22]}>
            <boxGeometry args={[1.5, 0.55, 0.1]} />
            <meshStandardMaterial color="#243040" roughness={0.7} />
          </mesh>
          {seats[i] ? (
            <group position={[0, 0.28, 0.06]}>
              <PassengerMesh seed={Math.abs(Math.round(position[0] * 10 + i * 17 + 3))} seated />
            </group>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function MetarTotem({ position, active }: { position: [number, number, number]; active: boolean }) {
  const plate = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 768;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#101820";
    ctx.fillRect(0, 0, 512, 768);
    ctx.fillStyle = active ? "#3d9a7a" : "#8aa4b8";
    ctx.fillRect(0, 0, 512, 18);
    ctx.fillStyle = "#e8ecef";
    ctx.font = "700 72px 'IBM Plex Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("METAR", 256, 160);
    ctx.font = "500 32px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = "rgba(232,236,239,0.7)";
    ctx.fillText("AVIAÇÃO · NOAA", 256, 220);
    ctx.fillStyle = active ? "#c4a574" : "#3d9a7a";
    ctx.beginPath();
    ctx.arc(256, 360, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101820";
    ctx.font = "700 88px 'IBM Plex Sans', sans-serif";
    ctx.fillText("E", 256, 392);
    ctx.fillStyle = "#e8ecef";
    ctx.font = "600 28px 'IBM Plex Sans', sans-serif";
    ctx.fillText("CONSULTAR", 256, 520);
    ctx.fillStyle = "rgba(232,236,239,0.55)";
    ctx.font = "500 24px 'IBM Plex Sans', sans-serif";
    ctx.fillText("ICAO 4 LETRAS", 256, 570);
    const tex = new CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, [active]);

  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.55, 1.8, 0.4]} />
        <meshStandardMaterial color="#1a222c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.15, 0.06]}>
        <boxGeometry args={[0.95, 1.4, 0.12]} />
        <meshStandardMaterial color="#0d141c" roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.15, 0.13]}>
        <planeGeometry args={[0.86, 1.28]} />
        <meshStandardMaterial map={plate} emissive={active ? "#3d9a7a" : "#8aa4b8"} emissiveIntensity={active ? 0.35 : 0.12} />
      </mesh>
    </group>
  );
}

function WaypointBeacon({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = 2.15 + Math.sin(t * 3.2) * 0.18;
    ref.current.rotation.y = t * 1.4;
  });
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.1, 1.35, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      <group ref={ref}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.28, 0.7, 5]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.16, 0.38, 5]} />
          <meshBasicMaterial color="#e8ecef" />
        </mesh>
      </group>
    </group>
  );
}

function MissionBeacon() {
  const ofp = useGame((s) => s.ofp);
  const visitedSimbrief = useGame((s) => s.visitedSimbrief);
  const ivaoOnline = useGame((s) => s.ivaoOnline);
  const doorReleased = useGame((s) => s.doorReleased);
  const target = missionTarget({ ofp, visitedSimbrief, ivaoOnline, doorReleased });
  if (!target) return null;
  return <WaypointBeacon position={[target.x, 0, target.z]} color={target.color} />;
}

function makeWebeyePreview() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 576;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#071018";
  ctx.fillRect(0, 0, 1024, 576);
  ctx.strokeStyle = "rgba(61,154,122,0.18)";
  ctx.lineWidth = 1;
  for (let x = 40; x < 1024; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 48);
    ctx.lineTo(x, 576);
    ctx.stroke();
  }
  for (let y = 48; y < 576; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#0d1c24";
  ctx.fillRect(0, 0, 1024, 48);
  ctx.fillStyle = "#3d9a7a";
  ctx.font = "700 22px 'IBM Plex Sans', sans-serif";
  ctx.fillText("IVAO  ·  WEBEYE  ·  REDE AO VIVO", 28, 32);
  ctx.fillStyle = "rgba(138,164,184,0.85)";
  ctx.font = "500 14px 'IBM Plex Sans', sans-serif";
  ctx.fillText("PRESSIONE E PARA NAVEGAR", 760, 32);
  ctx.strokeStyle = "rgba(61,154,122,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(180, 340);
  ctx.bezierCurveTo(280, 220, 420, 260, 510, 300);
  ctx.bezierCurveTo(620, 350, 740, 240, 880, 280);
  ctx.stroke();
  const dots: [number, number][] = [
    [220, 300],
    [360, 250],
    [510, 300],
    [640, 318],
    [790, 262],
    [430, 400],
    [300, 430],
  ];
  for (const [x, y] of dots) {
    ctx.fillStyle = "#c4a574";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(196,165,116,0.25)";
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function WebeyeBoard({ active }: { active: boolean }) {
  const tex = useMemo(() => makeWebeyePreview(), []);
  return (
    <group position={[MAP.webeye.x, 0, 11.12]}>
      <mesh position={[0, 3.35, 0]}>
        <boxGeometry args={[9.6, 4.7, 0.22]} />
        <meshStandardMaterial color="#121820" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 3.35, -0.13]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[9.05, 4.15]} />
        <meshStandardMaterial
          map={tex}
          emissive="#3d9a7a"
          emissiveIntensity={active ? 0.28 : 0.12}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 5.55, -0.02]}>
        <boxGeometry args={[4.8, 0.16, 0.12]} />
        <meshStandardMaterial
          color={active ? "#3d9a7a" : "#2a3340"}
          emissive={active ? "#3d9a7a" : "#000000"}
          emissiveIntensity={active ? 0.7 : 0}
        />
      </mesh>
    </group>
  );
}

function makeTowersPreview() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 640);
  g.addColorStop(0, "#0a221c");
  g.addColorStop(0.45, "#07140f");
  g.addColorStop(1, "#050d0b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 640);
  ctx.fillStyle = "rgba(61,154,122,0.12)";
  for (let y = 0; y < 640; y += 4) ctx.fillRect(0, y, 1024, 1);

  ctx.fillStyle = "#10241c";
  ctx.fillRect(0, 0, 1024, 86);
  ctx.fillStyle = "#3d9a7a";
  ctx.beginPath();
  ctx.arc(48, 43, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9ee0c4";
  ctx.beginPath();
  ctx.arc(48, 43, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8ecef";
  ctx.font = "700 42px 'IBM Plex Sans', sans-serif";
  ctx.fillText("ATC ONLINE", 78, 56);
  ctx.fillStyle = "#3d9a7a";
  ctx.font = "600 18px 'IBM Plex Mono', monospace";
  ctx.fillText("IVAO  ·  LIVE", 430, 54);
  ctx.fillStyle = "rgba(61,154,122,0.9)";
  ctx.fillRect(0, 86, 1024, 4);

  const rows = [
    ["TWR", "SBGL_TWR", "118.200"],
    ["APP", "SBGL_APP", "119.000"],
    ["CTR", "SBAO_CTR", "128.300"],
    ["GND", "SBSP_GND", "121.900"],
    ["TWR", "SBGR_TWR", "127.350"],
  ];
  rows.forEach((row, i) => {
    const y = 150 + i * 86;
    ctx.fillStyle = i % 2 === 0 ? "rgba(61,154,122,0.1)" : "rgba(61,154,122,0.04)";
    ctx.fillRect(28, y - 36, 968, 74);
    ctx.fillStyle = "#3d9a7a";
    ctx.font = "700 22px 'IBM Plex Mono', monospace";
    ctx.fillText(row[0], 52, y);
    ctx.fillStyle = "#e8ecef";
    ctx.font = "600 30px 'IBM Plex Mono', monospace";
    ctx.fillText(row[1], 170, y + 6);
    ctx.fillStyle = "#9ee0c4";
    ctx.font = "500 26px 'IBM Plex Mono', monospace";
    ctx.fillText(row[2], 620, y + 6);
  });
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function TowersBoard({ active }: { active: boolean }) {
  const tex = useMemo(() => makeTowersPreview(), []);
  return (
    <group position={[-15.78, 0, MAP.towers.z]}>
      <mesh position={[0, 3.15, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[6.2, 4.1, 0.2]} />
        <meshStandardMaterial color="#121820" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0.12, 3.15, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[5.75, 3.65]} />
        <meshStandardMaterial
          map={tex}
          emissive="#3d9a7a"
          emissiveIntensity={active ? 0.55 : 0.42}
          roughness={0.28}
        />
      </mesh>
      <mesh position={[0.14, 5.12, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[5.75, 0.08, 0.06]} />
        <meshStandardMaterial color="#3d9a7a" emissive="#3d9a7a" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0.8, 3.2, 0]} color="#3d9a7a" intensity={active ? 8 : 5} distance={9} />
    </group>
  );
}

function Stars() {
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const n = 500;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 80 + Math.random() * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = 0.15 + Math.random() * 1.1;
      arr[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      arr[i * 3 + 1] = Math.cos(phi) * r + 18;
      arr[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    g.setAttribute("position", new Float32BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#dfe7ef" size={0.35} sizeAttenuation />
    </points>
  );
}

function Npc({
  path,
  seed,
  speed = 1.4,
}: {
  path: [number, number][];
  seed: number;
  speed?: number;
}) {
  const ref = useRef<Group>(null);
  const yaw = useRef(0);
  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const t = (state.clock.elapsedTime * speed) % path.length;
    const i = Math.floor(t);
    const f = t - i;
    const a = path[i];
    const b = path[(i + 1) % path.length];
    const x = a[0] + (b[0] - a[0]) * f;
    const z = a[1] + (b[1] - a[1]) * f;
    const desired = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
    let diff = desired - yaw.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    yaw.current += diff * Math.min(1, d * 4);
    if (ref.current) {
      ref.current.position.set(x, 0, z);
      ref.current.rotation.y = yaw.current + Math.PI;
    }
  });
  return (
    <group ref={ref}>
      <PassengerMesh seed={seed} walking speed={speed * 2.4} />
    </group>
  );
}

function makeButtonPlate(on: boolean) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = on ? "#1a2418" : "#141a20";
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = on ? "#c4a574" : "#3a4450";
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 228, 292);
  ctx.fillStyle = on ? "#e8ecef" : "#6a7380";
  ctx.font = "700 132px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("E", 128, 168);
  ctx.font = "600 26px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = on ? "#c4a574" : "#8aa4b8";
  ctx.fillText("ABRIR PORTA", 128, 248);
  const tex = new CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function SlidingDoor() {
  const ofp = Boolean(useGame((s) => s.ofp));
  const ivaoOnline = useGame((s) => s.ivaoOnline);
  const doorReleased = useGame((s) => s.doorReleased);
  const open = ofp && (!ivaoOnline || doorReleased);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const amount = useRef(open ? 1 : 0);
  useFrame((_, delta) => {
    amount.current += ((open ? 1 : 0) - amount.current) * Math.min(1, delta * 3);
    const slide = amount.current * 1.85;
    if (left.current) left.current.position.z = -slide;
    if (right.current) right.current.position.z = slide;
  });
  return (
    <group position={[15, 0, 0]}>
      <mesh position={[0, 4.35, 0]}>
        <boxGeometry args={[0.5, 0.35, 4.1]} />
        <meshStandardMaterial
          color={open ? "#3d9a7a" : "#c45c5c"}
          emissive={open ? "#3d9a7a" : "#c45c5c"}
          emissiveIntensity={0.7}
        />
      </mesh>
      <group ref={left} position={[0, 2.1, -0.95]}>
        <mesh>
          <boxGeometry args={[0.12, 4.2, 1.9]} />
          <GlassMat />
        </mesh>
      </group>
      <group ref={right} position={[0, 2.1, 0.95]}>
        <mesh>
          <boxGeometry args={[0.12, 4.2, 1.9]} />
          <GlassMat />
        </mesh>
      </group>
    </group>
  );
}

function DoorButton() {
  const ivaoOnline = useGame((s) => s.ivaoOnline);
  const doorReleased = useGame((s) => s.doorReleased);
  const nearby = useGame((s) => s.nearby);
  const armed = ivaoOnline && !doorReleased;
  const tex = useMemo(() => makeButtonPlate(armed), [armed]);
  const glow = armed ? (nearby === "door" ? 1.2 : 0.7) : 0;
  return (
    <group>
      {([-2.7, 2.7] as const).map((z) => (
        <group key={z} position={[16.48, 1.52, z]}>
          <mesh>
            <boxGeometry args={[0.22, 1.18, 0.9]} />
            <meshStandardMaterial
              color={armed ? "#2a2418" : "#1a222c"}
              metalness={0.3}
              roughness={0.35}
              emissive={armed ? "#c4a574" : "#000000"}
              emissiveIntensity={armed ? 0.18 : 0}
            />
          </mesh>
          <mesh position={[0.12, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.72, 1]} />
            <meshStandardMaterial
              map={tex}
              emissive={armed ? "#c4a574" : "#000000"}
              emissiveIntensity={glow}
            />
          </mesh>
          {armed ? (
            <pointLight position={[0.55, 0.15, 0]} color="#c4a574" intensity={nearby === "door" ? 5 : 2.4} distance={7} />
          ) : null}
        </group>
      ))}
    </group>
  );
}

function GlowRing({ x, z, color, on }: { x: number; z: number; color: string; on: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const s = on ? 1 + Math.sin(state.clock.elapsedTime * 3) * 0.06 : 0.92;
    ref.current.scale.set(s, 1, s);
  });
  return (
    <group ref={ref} position={[x, 0.03, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1.12, 28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={on ? 1.1 : 0.25} />
      </mesh>
    </group>
  );
}

function Walls() {
  const plaster = "#d5dbe3";
  const dark = "#12181f";
  return (
    <group>
      <mesh position={[-1, 3.4, -9.95]}>
        <boxGeometry args={[30.4, 6.8, 0.16]} />
        <GlassMat />
      </mesh>
      <mesh position={[-1, 3.4, 11.95]}>
        <boxGeometry args={[30.4, 6.8, 0.4]} />
        <meshStandardMaterial color={plaster} roughness={0.55} />
      </mesh>
      <mesh position={[-16, 3.4, 1]}>
        <boxGeometry args={[0.4, 6.8, 22.4]} />
        <meshStandardMaterial color={plaster} roughness={0.55} />
      </mesh>
      <mesh position={[13.9, 3.4, -6.15]}>
        <boxGeometry args={[0.4, 6.8, 7.5]} />
        <meshStandardMaterial color={plaster} roughness={0.5} />
      </mesh>
      <mesh position={[13.9, 3.4, 7.15]}>
        <boxGeometry args={[0.4, 6.8, 9.5]} />
        <meshStandardMaterial color={plaster} roughness={0.5} />
      </mesh>
      <mesh position={[26, 3.4, -9.95]}>
        <boxGeometry args={[20.5, 6.8, 0.16]} />
        <GlassMat />
      </mesh>
      <mesh position={[26, 3.4, 11.95]}>
        <boxGeometry args={[20.5, 6.8, 0.4]} />
        <meshStandardMaterial color={plaster} roughness={0.55} />
      </mesh>
      <mesh position={[36, 3.4, 1]}>
        <boxGeometry args={[0.4, 6.8, 22.4]} />
        <meshStandardMaterial color={plaster} roughness={0.55} />
      </mesh>
      <mesh position={[16.1, 3.4, -6.15]}>
        <boxGeometry args={[0.4, 6.8, 7.5]} />
        <meshStandardMaterial color={dark} roughness={0.5} />
      </mesh>
      <mesh position={[16.1, 3.4, 7.15]}>
        <boxGeometry args={[0.4, 6.8, 9.5]} />
        <meshStandardMaterial color={dark} roughness={0.5} />
      </mesh>
      {[-13, -7, -1, 5, 10].map((x) => (
        <mesh key={`mull-a-${x}`} position={[x, 3.4, -9.88]}>
          <boxGeometry args={[0.14, 6.8, 0.22]} />
          <meshStandardMaterial color="#8b949e" metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
      {[20, 26, 32].map((x) => (
        <mesh key={`mull-b-${x}`} position={[x, 3.4, -9.88]}>
          <boxGeometry args={[0.14, 6.8, 0.22]} />
          <meshStandardMaterial color="#8b949e" metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function World() {
  const ofp = useGame((s) => s.ofp);
  const nearby = useGame((s) => s.nearby);
  const fids = useMemo(() => makeFids(), []);
  const hallASign = useMemo(
    () => makeLabel("CHECK-IN  /  DISPATCH", "BALCÃO SIMBRIEF", "#10161c", "#e8ecef"),
    [],
  );
  const hallBSign = useMemo(
    () => makeLabel("FLIGHT OPS", "BALCÃO IVAO", "#10161c", "#e8ecef"),
    [],
  );

  return (
    <group>
      <color attach="background" args={["#070b10"]} />
      <fog attach="fog" args={["#0d141c", 45, 160]} />
      <hemisphereLight args={["#c5d4e2", "#2a241c", 0.85]} />
      <directionalLight
        position={[28, 42, 18]}
        intensity={0.9}
        color="#e4ebf2"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <ambientLight intensity={0.38} />
      <pointLight position={[-2, 5.6, 2]} color="#f2eee6" intensity={28} distance={24} />
      <pointLight position={[26, 5.6, 2]} color="#e4eef6" intensity={22} distance={22} />
      <Stars />

      <mesh position={[-38, 6, -70]} rotation={[0, 0.4, 0]}>
        <coneGeometry args={[7, 18, 5]} />
        <meshStandardMaterial color="#0a0e13" roughness={1} />
      </mesh>
      <mesh position={[-28, 4.2, -74]} rotation={[0, 0.2, 0]}>
        <coneGeometry args={[5, 12, 5]} />
        <meshStandardMaterial color="#0c1116" roughness={1} />
      </mesh>
      <mesh position={[48, 3, -80]}>
        <boxGeometry args={[40, 6, 6]} />
        <meshStandardMaterial color="#10151c" roughness={1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, -0.02, -28]} receiveShadow>
        <planeGeometry args={[140, 70]} />
        <meshStandardMaterial color="#2a2f35" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0.01, -34]}>
        <planeGeometry args={[90, 6.5]} />
        <meshStandardMaterial color="#3b4046" roughness={0.85} />
      </mesh>
      {[-36, -24, -12, 0, 12, 24, 36].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -34]}>
          <planeGeometry args={[4.2, 0.55]} />
          <meshStandardMaterial color="#dfe4ea" roughness={0.4} />
        </mesh>
      ))}
      {[-18, -6, 8, 22].map((x, i) => (
        <mesh key={`edge-${x}`} position={[x, 0.03, -22 - (i % 2) * 3]}>
          <boxGeometry args={[0.18, 0.08, 1.1]} />
          <meshStandardMaterial color="#c4a574" emissive="#c4a574" emissiveIntensity={0.8} />
        </mesh>
      ))}

      <Airliner position={[-18, 0, -20]} heading={0.15} fuselage="#1c2a3a" tail="#c45c5c" />
      <Airliner position={[4, 0, -22.5]} heading={-0.08} fuselage="#d8dce0" tail="#e07a32" />
      <Airliner position={[26, 0, -19]} heading={0.22} fuselage="#143a6b" tail="#3d7ad6" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1, 0, 1]} receiveShadow>
        <planeGeometry args={[30.4, 22.2]} />
        <meshStandardMaterial color="#2a3440" roughness={0.32} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[26, 0, 1]} receiveShadow>
        <planeGeometry args={[20.6, 22.2]} />
        <meshStandardMaterial color="#182028" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, 0, 0]}>
        <planeGeometry args={[3.2, 4.2]} />
        <meshStandardMaterial color="#151c24" roughness={0.35} />
      </mesh>

      <Walls />
      <Columns />
      <CeilingLights />
      <SlidingDoor />
      <DoorButton />

      <mesh position={[-1, 6.86, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[29, 21]} />
        <meshBasicMaterial color="#6d7b88" />
      </mesh>
      <mesh position={[26, 6.86, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[19, 21]} />
        <meshBasicMaterial color="#62707c" />
      </mesh>

      <Desk
        position={[MAP.simbrief.x, 0, MAP.simbrief.z]}
        title="SIMBRIEF"
        sub="PLANEJAMENTO DE VOO  ·  PRESSIONE E"
        accent="#8aa4b8"
        active={nearby === "simbrief"}
      />
      <Desk
        position={[MAP.ivao.x, 0, MAP.ivao.z]}
        title="IVAO"
        sub="ATIVAÇÃO DO PLANO  ·  PRESSIONE E"
        accent="#3d9a7a"
        active={nearby === "ivao"}
      />

      <mesh position={[-1, 4.8, -9.1]}>
        <planeGeometry args={[7.4, 0.9]} />
        <meshStandardMaterial map={hallASign} />
      </mesh>
      <mesh position={[26, 4.8, -9.1]}>
        <planeGeometry args={[7.4, 0.9]} />
        <meshStandardMaterial map={hallBSign} />
      </mesh>

      <mesh position={[0, 2.6, -7.4]}>
        <boxGeometry args={[4.4, 2.8, 0.18]} />
        <meshStandardMaterial map={fids} emissive="#8aa4b8" emissiveIntensity={0.16} />
      </mesh>

      <WebeyeBoard active={nearby === "webeye"} />
      <TowersBoard active={nearby === "towers"} />
      <MetarTotem position={[MAP.metar.x, 0, MAP.metar.z]} active={nearby === "metar"} />
      <MetarTotem position={[MAP.ivaoMetar.x, 0, MAP.ivaoMetar.z]} active={nearby === "metar"} />
      <WaypointBeacon position={[MAP.metar.x, 0, MAP.metar.z]} color="#8aa4b8" />
      <WaypointBeacon position={[MAP.ivaoMetar.x, 0, MAP.ivaoMetar.z]} color="#8aa4b8" />
      <MissionBeacon />

      <Seating position={[-12.3, 0, 3.6]} seats={[1, 0, 1]} />
      <Seating position={[-2.5, 0, 3.6]} seats={[1, 1, 0]} />
      <Seating position={[5.3, 0, 3.6]} seats={[0, 1, 1]} />
      <Seating position={[21.5, 0, 3.6]} seats={[1, 0, 1]} />
      <Seating position={[32.3, 0, 3.6]} seats={[1, 1, 0]} />

      <GlowRing x={MAP.simbrief.x} z={MAP.simbrief.z + 1.7} color="#8aa4b8" on={nearby === "simbrief"} />
      <GlowRing x={MAP.ivao.x} z={MAP.ivao.z + 1.7} color="#3d9a7a" on={nearby === "ivao" && Boolean(ofp)} />
      <GlowRing x={MAP.doorSwitch.x} z={MAP.doorSwitch.z} color="#c4a574" on={nearby === "door"} />
      <GlowRing x={MAP.webeye.x} z={MAP.webeye.z} color="#3d9a7a" on={nearby === "webeye"} />
      <GlowRing x={MAP.towers.x} z={MAP.towers.z} color="#8aa4b8" on={nearby === "towers"} />
      <GlowRing x={MAP.metar.x} z={MAP.metar.z} color="#8aa4b8" on={nearby === "metar"} />
      <GlowRing x={MAP.ivaoMetar.x} z={MAP.ivaoMetar.z} color="#8aa4b8" on={nearby === "metar"} />

      <Npc
        seed={11}
        speed={0.38}
        path={[
          [-11, 8.2],
          [7, 8.2],
          [7, -1.4],
          [-11, -1.4],
        ]}
      />
      <Npc
        seed={23}
        speed={0.3}
        path={[
          [6.5, 9.1],
          [-7, 9.1],
          [-7, 0.4],
          [6.5, 0.4],
        ]}
      />
      <Npc
        seed={37}
        speed={0.34}
        path={[
          [22, 8.1],
          [33, 8.1],
          [33, -1.6],
          [22, -1.6],
        ]}
      />
      <Npc
        seed={41}
        speed={0.26}
        path={[
          [-13, 6.4],
          [9, 6.4],
          [9, 9.4],
          [-13, 9.4],
        ]}
      />
      <Npc
        seed={53}
        speed={0.29}
        path={[
          [19.5, 9.2],
          [34, 9.2],
          [34, 0.6],
          [19.5, 0.6],
        ]}
      />
      <Npc
        seed={67}
        speed={0.22}
        path={[
          [2.2, -1.2],
          [11.2, -1.2],
          [11.2, 8.6],
          [2.2, 8.6],
        ]}
      />
      <Npc
        seed={79}
        speed={0.33}
        path={[
          [24.4, -1.1],
          [31.6, -1.1],
          [31.6, 6.8],
          [24.4, 6.8],
        ]}
      />
    </group>
  );
}
