import { useEffect, useRef, useState } from "react";
import { Check, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGame } from "./store";

const STEPS = [
  { at: 12, label: "Inicializando WebGL" },
  { at: 28, label: "Saguão e iluminação" },
  { at: 44, label: "Pátio e aeronaves" },
  { at: 60, label: "Pilotos e passageiros" },
  { at: 76, label: "Colisão e câmera" },
  { at: 90, label: "Sistemas de briefing" },
  { at: 100, label: "Terminal pronto" },
];

export function BootScreen() {
  const canvasReady = useGame((s) => s.bootCanvasReady);
  const [percent, setPercent] = useState(0);
  const [dots, setDots] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const fallback = window.setTimeout(() => useGame.getState().finishBoot(), 14000);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let value = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cap = canvasReady ? 100 : 92;
      const rate = canvasReady ? 55 : 28;
      value = Math.min(cap, value + dt * rate);
      setPercent(Math.floor(value));
      if (value >= 100 && canvasReady && !done.current) {
        done.current = true;
        window.setTimeout(() => useGame.getState().finishBoot(), 420);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canvasReady]);

  useEffect(() => {
    const id = window.setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => window.clearInterval(id);
  }, []);

  const current = [...STEPS].reverse().find((s) => percent >= s.at) ?? STEPS[0];
  const status = canvasReady && percent < 100 ? "Compilando cena" : current.label;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] tracking-[0.22em] text-accent uppercase">SBGL · Terminal 2</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Pilot Dispatch</h1>
        <p className="mt-2 text-sm text-muted">Preparando o saguão operacional.</p>

        <div className="relative mx-auto mt-8 grid size-28 place-items-center">
          <span className="boot-ring absolute inset-0 rounded-full border border-border" />
          <span className="boot-ring-spin absolute inset-1 rounded-full border-2 border-transparent border-t-accent border-r-accent/40" />
          <span className="boot-pulse absolute inset-4 rounded-full bg-accent/15" />
          <Plane className="relative size-8 text-accent" />
        </div>

        <div className="mt-8">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-mono text-xs tracking-wide text-fg uppercase">
              {status}
              <span className="text-subtle">{"".padEnd(dots, ".")}</span>
            </p>
            <p className="font-mono text-sm tabular-nums text-accent">{percent}%</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 ease-smooth-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <ul className="mt-6 space-y-2">
          {STEPS.map((step) => {
            const doneStep = percent >= step.at;
            const active = current.label === step.label && percent < 100;
            return (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full border",
                    doneStep ? "border-ok bg-ok text-accent-fg" : active ? "border-accent text-accent" : "border-border text-subtle",
                  )}
                >
                  {doneStep ? <Check className="size-2.5" strokeWidth={3} /> : active ? <span className="boot-pulse size-1.5 rounded-full bg-accent" /> : null}
                </span>
                <span className={doneStep ? "text-fg" : active ? "text-fg" : "text-subtle"}>{step.label}</span>
                {active ? (
                  <span className="ml-auto font-mono text-[10px] tracking-wide text-accent uppercase">em curso</span>
                ) : doneStep ? (
                  <span className="ml-auto font-mono text-[10px] tracking-wide text-ok uppercase">ok</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
