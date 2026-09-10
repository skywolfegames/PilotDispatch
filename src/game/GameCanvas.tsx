import { Canvas } from "@react-three/fiber";
import { gameInput } from "./input";
import { Player } from "./Player";
import { World } from "./World";
import { useGame } from "./store";

export function GameCanvas() {
  const phase = useGame((s) => s.phase);
  const lookMode = useGame((s) => s.lookMode);
  const sheet = useGame((s) => s.simbriefSheet);
  const webeye = useGame((s) => s.webeyeOpen);
  const metar = useGame((s) => s.metarOpen);
  const towers = useGame((s) => s.towersOpen);
  const uiLock = sheet || webeye || metar || towers;
  const setLookMode = useGame((s) => s.setLookMode);

  const requestLook = () => {
    const s = useGame.getState();
    if (s.phase !== "playing" || s.simbriefSheet || s.webeyeOpen || s.metarOpen || s.towersOpen) return;
    document.querySelector("canvas")?.requestPointerLock?.();
  };

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      camera={{ fov: 58, near: 0.1, far: 220, position: [-4, 2.9, 5.5] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={() => {
        document.addEventListener("pointerlockchange", () => {
          if (useGame.getState().simbriefSheet || useGame.getState().webeyeOpen || useGame.getState().metarOpen || useGame.getState().towersOpen) {
            if (document.pointerLockElement) document.exitPointerLock?.();
            setLookMode("drag");
            return;
          }
          setLookMode(document.pointerLockElement ? "lock" : "drag");
        });
        document.addEventListener("pointerlockerror", () => setLookMode("drag"));
        useGame.getState().markCanvasReady();
      }}
      onPointerDown={(e) => {
        const s = useGame.getState();
        if (s.phase !== "playing" || s.simbriefSheet || s.webeyeOpen || s.metarOpen || s.towersOpen) return;
        gameInput.onPointerDown(e);
        if (e.pointerType === "mouse") requestLook();
      }}
      onPointerMove={(e) => gameInput.onPointerMove(e)}
      onPointerUp={(e) => gameInput.onPointerUp(e)}
      onPointerCancel={(e) => gameInput.onPointerUp(e)}
      style={{
        touchAction: "none",
        position: "absolute",
        inset: 0,
        cursor: phase === "playing" && lookMode === "lock" && !uiLock ? "none" : "default",
        pointerEvents: phase === "playing" && !uiLock ? "auto" : "none",
      }}
    >
      <World />
      <Player />
    </Canvas>
  );
}
