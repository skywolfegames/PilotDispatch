import { useEffect, useRef } from "react";
import { missionTarget, signedAngleTo } from "./mission";
import { useGame } from "./store";

export function MissionCompass() {
  const needle = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLParagraphElement>(null);
  const ofp = useGame((s) => s.ofp);
  const visitedSimbrief = useGame((s) => s.visitedSimbrief);
  const ivaoOnline = useGame((s) => s.ivaoOnline);
  const doorReleased = useGame((s) => s.doorReleased);
  const target = missionTarget({ ofp, visitedSimbrief, ivaoOnline, doorReleased });

  useEffect(() => {
    if (!target) return;
    let raf = 0;
    const tick = () => {
      const pos = window.__game?.getPos();
      const yaw = window.__game?.getCamYaw?.() ?? window.__game?.getYaw?.() ?? 0;
      if (pos && needle.current) {
        const ang = signedAngleTo(pos.x, pos.z, yaw, target.x, target.z);
        needle.current.style.transform = `rotate(${ang}rad)`;
        const dist = Math.hypot(target.x - pos.x, target.z - pos.z);
        if (label.current) label.current.textContent = `${target.label} · ${dist.toFixed(0)} m`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (!target) return null;

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center sm:bottom-10">
      <div
        ref={needle}
        className="grid size-14 place-items-center rounded-full border border-border bg-surface/90 shadow-lg"
        style={{ color: target.color }}
      >
        <svg viewBox="0 0 24 24" className="size-8" fill="currentColor" aria-hidden>
          <path d="M12 3.2 18.4 16.5 12 13.2 5.6 16.5 12 3.2Z" />
        </svg>
      </div>
      <p ref={label} className="mt-1.5 rounded-md bg-surface/90 px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-fg uppercase">
        {target.label}
      </p>
    </div>
  );
}
