function Engine({ x, z = 0.55 }: { x: number; z?: number }) {
  return (
    <group position={[x, 1.08, z]}>
      <mesh position={[0, 0.42, 0.1]}>
        <boxGeometry args={[0.16, 0.48, 0.7]} />
        <meshStandardMaterial color="#6d7680" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.38, 2.15, 18]} />
        <meshStandardMaterial color="#c8d0d6" roughness={0.26} metalness={0.58} />
      </mesh>
      <mesh position={[0, 0, 1.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.44, 0.14, 18]} />
        <meshStandardMaterial color="#9aa3ad" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 18]} />
        <meshStandardMaterial color="#151b22" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 1.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.1, 10]} />
        <meshStandardMaterial color="#dfe4ea" roughness={0.3} metalness={0.65} />
      </mesh>
      <mesh position={[0, 0, -1.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.28, 0.38, 12]} />
        <meshStandardMaterial color="#3a4450" roughness={0.4} metalness={0.35} />
      </mesh>
    </group>
  );
}

function Gear({ x, z, dual = false }: { x: number; z: number; dual?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.12, 8]} />
        <meshStandardMaterial color="#2a3038" roughness={0.5} metalness={0.4} />
      </mesh>
      {(dual ? [-0.16, 0.16] : [0]).map((ox) => (
        <mesh key={ox} position={[ox, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.11, 14]} />
          <meshStandardMaterial color="#141618" roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

function Wing({ side }: { side: 1 | -1 }) {
  const s = side;
  return (
    <group position={[0.15 * s, 1.78, 0.15]} rotation={[0.035 * s, 0.38 * s, 0.06 * s]}>
      <mesh position={[3.15 * s, 0, 0]} castShadow>
        <boxGeometry args={[6.3, 0.11, 2.35]} />
        <meshStandardMaterial color="#d8dee4" roughness={0.3} metalness={0.38} />
      </mesh>
      <mesh position={[6.55 * s, 0.04, -0.28]} castShadow>
        <boxGeometry args={[2.15, 0.09, 1.45]} />
        <meshStandardMaterial color="#cfd6dc" roughness={0.32} metalness={0.36} />
      </mesh>
      <mesh position={[7.55 * s, 0.48, -0.42]} rotation={[0, 0, 1.22 * s]}>
        <boxGeometry args={[0.08, 0.92, 0.52]} />
        <meshStandardMaterial color="#d8dee4" roughness={0.3} metalness={0.35} />
      </mesh>
      <mesh position={[2.2 * s, -0.02, 0.95]}>
        <boxGeometry args={[2.4, 0.04, 0.42]} />
        <meshStandardMaterial color="#b7c0c8" roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Airliner({
  position,
  heading,
  fuselage,
  tail,
}: {
  position: [number, number, number];
  heading: number;
  fuselage: string;
  tail: string;
}) {
  return (
    <group position={position} rotation={[0, heading, 0]} scale={1.12}>
      <mesh position={[0, 2.05, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.92, 0.92, 11.6, 24]} />
        <meshStandardMaterial color={fuselage} roughness={0.28} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.98, 6.85]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.92, 2.5, 24]} />
        <meshStandardMaterial color={fuselage} roughness={0.28} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.0, -6.7]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.92, 2.4, 20]} />
        <meshStandardMaterial color={fuselage} roughness={0.3} metalness={0.38} />
      </mesh>

      <mesh position={[0, 2.28, 6.55]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[1.05, 0.22, 0.95]} />
        <meshStandardMaterial color="#0c1218" roughness={0.2} metalness={0.55} />
      </mesh>
      <mesh position={[0.9, 2.18, 0.45]}>
        <boxGeometry args={[0.03, 0.08, 8.4]} />
        <meshStandardMaterial color="#0c1218" roughness={0.25} metalness={0.4} emissive="#9eb4c4" emissiveIntensity={0.16} />
      </mesh>
      <mesh position={[-0.9, 2.18, 0.45]}>
        <boxGeometry args={[0.03, 0.08, 8.4]} />
        <meshStandardMaterial color="#0c1218" roughness={0.25} metalness={0.4} emissive="#9eb4c4" emissiveIntensity={0.16} />
      </mesh>
      <mesh position={[0.93, 1.72, 0.3]}>
        <boxGeometry args={[0.04, 0.12, 10.2]} />
        <meshStandardMaterial color={tail} roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[-0.93, 1.72, 0.3]}>
        <boxGeometry args={[0.04, 0.12, 10.2]} />
        <meshStandardMaterial color={tail} roughness={0.4} metalness={0.15} />
      </mesh>

      <Wing side={-1} />
      <Wing side={1} />
      <Engine x={-3.45} />
      <Engine x={3.45} />

      <mesh position={[0, 3.55, -6.55]} rotation={[0.48, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 3.15, 1.7]} />
        <meshStandardMaterial color={tail} roughness={0.36} metalness={0.22} />
      </mesh>
      <mesh position={[0.07, 3.72, -6.4]} rotation={[0.48, 0, 0]}>
        <boxGeometry args={[0.02, 1.55, 0.85]} />
        <meshStandardMaterial color={fuselage} roughness={0.3} metalness={0.32} />
      </mesh>
      <mesh position={[0, 3.28, -7.15]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[5.2, 0.09, 1.25]} />
        <meshStandardMaterial color="#d8dee4" roughness={0.32} metalness={0.35} />
      </mesh>

      <Gear x={0} z={4.45} />
      <Gear x={-1.12} z={-0.2} dual />
      <Gear x={1.12} z={-0.2} dual />
    </group>
  );
}
