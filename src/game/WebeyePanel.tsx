import { useEffect } from "react";
import { Globe, X } from "lucide-react";
import { useGame } from "./store";

const WEBEYE_URL = "https://webeye.ivao.aero/";

export function WebeyePanel() {
  const open = useGame((s) => s.webeyeOpen);
  const close = useGame((s) => s.closeWebeye);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-bg/75 p-3 sm:p-6">
      <div className="flex h-full max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border-strong bg-[#071018] shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.2em] text-ok uppercase">Telão · IVAO</p>
            <h2 className="mt-0.5 flex items-center gap-2 text-base font-semibold tracking-tight">
              <Globe className="size-4 text-ok" />
              WebEye — rede ao vivo
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={WEBEYE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-11 items-center rounded-md border border-border px-3 text-sm text-fg sm:inline-flex"
            >
              Abrir em nova guia
            </a>
            <button
              type="button"
              onClick={close}
              className="grid size-11 place-items-center rounded-md border border-border text-muted hover:text-fg"
              aria-label="Fechar telão"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 bg-black">
          <iframe
            title="IVAO WebEye"
            src={WEBEYE_URL}
            className="absolute inset-0 h-full w-full border-0 bg-black"
            allow="fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="px-4 py-2 font-mono text-[10px] tracking-wide text-subtle uppercase">
          Mouse livre no mapa · Esc ou X fecha e volta ao terminal
        </p>
      </div>
    </div>
  );
}
