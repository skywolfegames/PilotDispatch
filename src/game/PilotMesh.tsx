import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

type WalkProps = {
  walking?: boolean;
  speed?: number;
  speedRef?: { current: number };
};

function useWalk(speed: number, speedRef: { current: number } | undefined, walking: boolean) {
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const body = useRef<Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const spd = speedRef?.current ?? speed;
    const isWalk = walking || spd > 0.35;
    const amp = isWalk ? Math.min(0.72, 0.2 + spd * 0.11) : 0.03;
    const rate = isWalk ? 8.2 + spd * 0.7 : 1.4;
    const swing = Math.sin(t * rate) * amp;
    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
    if (leftLeg.current) leftLeg.current.rotation.x = -swing * 0.95;
    if (rightLeg.current) rightLeg.current.rotation.x = swing * 0.95;
    if (body.current) body.current.position.y = isWalk ? Math.abs(Math.sin(t * rate)) * 0.03 : 0;
  });
  return { leftArm, rightArm, leftLeg, rightLeg, body };
}

export function PilotMesh({ walking = false, speed = 0, speedRef }: WalkProps) {
  const walk = useWalk(speed, speedRef, walking);
  const skin = "#c9a888";
  const navy = "#152033";
  const shirt = "#f4f1ea";
  const gold = "#c9a24a";
  const visor = "#0c0d10";
  const pants = "#121826";

  return (
    <group ref={walk.body}>
      <group ref={walk.leftLeg} position={[-0.11, 0.58, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <capsuleGeometry args={[0.068, 0.4, 4, 8]} />
          <meshStandardMaterial color={pants} roughness={0.62} />
        </mesh>
        <mesh position={[0, -0.54, 0.04]}>
          <boxGeometry args={[0.12, 0.055, 0.2]} />
          <meshStandardMaterial color="#0b0c0e" roughness={0.45} />
        </mesh>
      </group>
      <group ref={walk.rightLeg} position={[0.11, 0.58, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <capsuleGeometry args={[0.068, 0.4, 4, 8]} />
          <meshStandardMaterial color={pants} roughness={0.62} />
        </mesh>
        <mesh position={[0, -0.54, 0.04]}>
          <boxGeometry args={[0.12, 0.055, 0.2]} />
          <meshStandardMaterial color="#0b0c0e" roughness={0.45} />
        </mesh>
      </group>

      <mesh position={[0, 0.58, 0.01]}>
        <boxGeometry args={[0.3, 0.06, 0.16]} />
        <meshStandardMaterial color="#0e1116" roughness={0.5} />
      </mesh>

      <mesh position={[0, 0.98, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.5, 6, 12]} />
        <meshStandardMaterial color={navy} roughness={0.48} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.78, 0.175]}>
        <boxGeometry args={[0.22, 0.34, 0.04]} />
        <meshStandardMaterial color="#101826" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.14, 0.16]}>
        <boxGeometry args={[0.18, 0.12, 0.05]} />
        <meshStandardMaterial color={shirt} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.92, 0.195]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.045, 0.28, 0.02]} />
        <meshStandardMaterial color="#141414" roughness={0.4} />
      </mesh>
      <mesh position={[0.12, 0.86, 0.2]}>
        <boxGeometry args={[0.07, 0.03, 0.02]} />
        <meshStandardMaterial color={gold} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-0.12, 1.0, 0.2]}>
        <boxGeometry args={[0.08, 0.035, 0.018]} />
        <meshStandardMaterial color={gold} roughness={0.28} metalness={0.75} />
      </mesh>

      <mesh position={[-0.21, 1.22, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.09, 0.05, 0.16]} />
        <meshStandardMaterial color={navy} roughness={0.45} />
      </mesh>
      <mesh position={[0.21, 1.22, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.09, 0.05, 0.16]} />
        <meshStandardMaterial color={navy} roughness={0.45} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i}>
          <mesh position={[-0.215, 1.205 + i * 0.012, 0]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[0.08, 0.007, 0.15]} />
            <meshStandardMaterial color={gold} roughness={0.25} metalness={0.8} />
          </mesh>
          <mesh position={[0.215, 1.205 + i * 0.012, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.08, 0.007, 0.15]} />
            <meshStandardMaterial color={gold} roughness={0.25} metalness={0.8} />
          </mesh>
        </group>
      ))}

      <group ref={walk.leftArm} position={[-0.28, 1.16, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.36, 4, 8]} />
          <meshStandardMaterial color={navy} roughness={0.48} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <torusGeometry args={[0.052, 0.01, 6, 10]} />
          <meshStandardMaterial color={gold} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.43, 0]}>
          <sphereGeometry args={[0.042, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>
      <group ref={walk.rightArm} position={[0.28, 1.16, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.05, 0.36, 4, 8]} />
          <meshStandardMaterial color={navy} roughness={0.48} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <torusGeometry args={[0.052, 0.01, 6, 10]} />
          <meshStandardMaterial color={gold} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, -0.43, 0]}>
          <sphereGeometry args={[0.042, 8, 8]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>

      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.155, 14, 14]} />
        <meshStandardMaterial color={skin} roughness={0.68} />
      </mesh>
      <mesh position={[0, 1.5, -0.02]}>
        <sphereGeometry args={[0.15, 10, 8, 0, Math.PI * 2, 0, 1.15]} />
        <meshStandardMaterial color="#1a1614" roughness={0.7} />
      </mesh>
      <mesh position={[-0.05, 1.42, 0.13]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#1c1612" roughness={0.4} />
      </mesh>
      <mesh position={[0.05, 1.42, 0.13]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#1c1612" roughness={0.4} />
      </mesh>

      <group position={[0, 1.56, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.155, 0.17, 0.1, 16]} />
          <meshStandardMaterial color="#f2f0ea" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.0, 0]}>
          <cylinderGeometry args={[0.172, 0.172, 0.045, 16]} />
          <meshStandardMaterial color={navy} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.01, 0.12]} rotation={[-0.55, 0, 0]}>
          <boxGeometry args={[0.26, 0.025, 0.12]} />
          <meshStandardMaterial color={visor} roughness={0.25} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0.01, 0.17]}>
          <circleGeometry args={[0.028, 12]} />
          <meshStandardMaterial color={gold} roughness={0.25} metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

const SKINS = ["#c9a888", "#8d5a3c", "#e0b89a", "#5c3a28", "#d8c0a8", "#a06b48"];
const HAIRS = ["#1a1410", "#3b2416", "#6b4a2a", "#111111", "#c4b48a", "#4a2a1c"];
const TOPS = ["#2b3c4f", "#6b2d32", "#1f6b5a", "#3d4a78", "#cfc6b8", "#1c1c1c", "#8a5a2a", "#4a6d8a"];
const BOTTOMS = ["#1c2430", "#3a4654", "#2a221c", "#4a5560", "#1a1a1a"];
const BAGS = ["#1e242c", "#6a3b28", "#2c4a3a", "#3a3a40"];

function pick<T>(list: T[], n: number): T {
  return list[Math.abs(n) % list.length];
}

export type PassengerLook = {
  seed: number;
  seated?: boolean;
  walking?: boolean;
  speed?: number;
};

export function PassengerMesh({ seed, seated = false, walking = false, speed = 1 }: PassengerLook) {
  const walk = useWalk(seated ? 0 : speed, undefined, walking && !seated);
  const skin = pick(SKINS, seed);
  const hair = pick(HAIRS, seed * 3 + 2);
  const top = pick(TOPS, seed * 5 + 1);
  const bottom = pick(BOTTOMS, seed * 7 + 4);
  const bag = pick(BAGS, seed * 11);
  const hairStyle = seed % 5;
  const accessory = seed % 4;
  const scale = 0.94 + (seed % 7) * 0.018;

  return (
    <group scale={scale}>
      <group ref={walk.body} position={seated ? [0, -0.12, 0.04] : [0, 0, 0]}>
        <group ref={walk.leftLeg} position={[-0.1, seated ? 0.42 : 0.56, 0]} rotation={seated ? [1.15, 0, 0] : [0, 0, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.36, 4, 8]} />
            <meshStandardMaterial color={bottom} roughness={0.7} />
          </mesh>
          <mesh position={[0, seated ? -0.48 : -0.5, seated ? 0.02 : 0.03]}>
            <boxGeometry args={[0.11, 0.05, 0.18]} />
            <meshStandardMaterial color="#222226" roughness={0.55} />
          </mesh>
        </group>
        <group ref={walk.rightLeg} position={[0.1, seated ? 0.42 : 0.56, 0]} rotation={seated ? [1.15, 0, 0] : [0, 0, 0]}>
          <mesh position={[0, -0.28, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.36, 4, 8]} />
            <meshStandardMaterial color={bottom} roughness={0.7} />
          </mesh>
          <mesh position={[0, seated ? -0.48 : -0.5, seated ? 0.02 : 0.03]}>
            <boxGeometry args={[0.11, 0.05, 0.18]} />
            <meshStandardMaterial color="#222226" roughness={0.55} />
          </mesh>
        </group>

        <mesh position={[0, seated ? 0.82 : 0.94, 0]} castShadow>
          <capsuleGeometry args={[0.19, 0.46, 5, 10]} />
          <meshStandardMaterial color={top} roughness={0.62} />
        </mesh>

        <group ref={walk.leftArm} position={[-0.26, seated ? 0.98 : 1.12, 0]} rotation={seated ? [0.7, 0, 0.15] : [0, 0, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.32, 4, 8]} />
            <meshStandardMaterial color={top} roughness={0.62} />
          </mesh>
        </group>
        <group ref={walk.rightArm} position={[0.26, seated ? 0.98 : 1.12, 0]} rotation={seated ? [0.7, 0, -0.15] : [0, 0, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.32, 4, 8]} />
            <meshStandardMaterial color={top} roughness={0.62} />
          </mesh>
        </group>

        <mesh position={[0, seated ? 1.24 : 1.36, 0]} castShadow>
          <sphereGeometry args={[0.145, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>

        {hairStyle === 0 && (
          <mesh position={[0, seated ? 1.34 : 1.46, -0.01]}>
            <sphereGeometry args={[0.15, 10, 8, 0, Math.PI * 2, 0, 1.2]} />
            <meshStandardMaterial color={hair} roughness={0.75} />
          </mesh>
        )}
        {hairStyle === 1 && (
          <mesh position={[0, seated ? 1.36 : 1.48, 0]}>
            <sphereGeometry args={[0.155, 10, 10]} />
            <meshStandardMaterial color={hair} roughness={0.75} />
          </mesh>
        )}
        {hairStyle === 2 && (
          <>
            <mesh position={[0, seated ? 1.34 : 1.46, -0.02]}>
              <sphereGeometry args={[0.148, 10, 8, 0, Math.PI * 2, 0, 1.1]} />
              <meshStandardMaterial color={hair} roughness={0.75} />
            </mesh>
            <mesh position={[0, seated ? 1.18 : 1.3, -0.16]} rotation={[0.5, 0, 0]}>
              <capsuleGeometry args={[0.04, 0.18, 4, 8]} />
              <meshStandardMaterial color={hair} roughness={0.75} />
            </mesh>
          </>
        )}
        {hairStyle === 3 && (
          <mesh position={[0, seated ? 1.38 : 1.5, 0]}>
            <cylinderGeometry args={[0.16, 0.17, 0.08, 12]} />
            <meshStandardMaterial color={pick(TOPS, seed + 3)} roughness={0.55} />
          </mesh>
        )}
        {hairStyle === 4 && (
          <mesh position={[0, seated ? 1.32 : 1.44, -0.02]}>
            <sphereGeometry args={[0.12, 8, 8, 0, Math.PI * 2, 0, 1.0]} />
            <meshStandardMaterial color={hair} roughness={0.8} />
          </mesh>
        )}

        {!seated && accessory === 1 && (
          <mesh position={[0, 1.02, -0.16]} castShadow>
            <boxGeometry args={[0.28, 0.34, 0.12]} />
            <meshStandardMaterial color={bag} roughness={0.6} />
          </mesh>
        )}
        {!seated && accessory === 2 && (
          <group position={[0.22, 0.28, -0.18]}>
            <mesh castShadow>
              <boxGeometry args={[0.16, 0.38, 0.28]} />
              <meshStandardMaterial color={bag} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <torusGeometry args={[0.05, 0.012, 6, 10]} />
              <meshStandardMaterial color="#c9cdd2" roughness={0.35} metalness={0.4} />
            </mesh>
          </group>
        )}
        {!seated && accessory === 3 && (
          <mesh position={[-0.2, 0.78, 0.02]} rotation={[0, 0.4, 0.2]}>
            <boxGeometry args={[0.08, 0.22, 0.16]} />
            <meshStandardMaterial color={bag} roughness={0.55} />
          </mesh>
        )}
      </group>
    </group>
  );
}
