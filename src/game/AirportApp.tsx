import { useEffect } from "react";
import { GameCanvas } from "./GameCanvas";
import { Overlay } from "./Overlay";
import { gameInput } from "./input";
import { useGame } from "./store";

export function AirportApp() {
  useEffect(() => {
    gameInput.bind();
    useGame.getState().hydrate();
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg touch-none">
      <GameCanvas />
      <Overlay />
    </main>
  );
}
