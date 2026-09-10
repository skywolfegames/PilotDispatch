import { useEffect, useMemo, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { findAircraft, SIMBRIEF_AIRCRAFT } from "./aircraft";
import {
  buildSimbriefCustomUrl,
  sanitizeAltitude,
  sanitizeIcao,
  simbriefDraftReady,
  splitCallsign,
} from "./ofp";
import { useGame } from "./store";

export function SimbriefSheet() {
  const open = useGame((s) => s.simbriefSheet);
  const draft = useGame((s) => s.draft);
  const callsign = useGame((s) => s.ivaoCallsign);
  const patch = useGame((s) => s.patchDraft);
  const close = useGame((s) => s.closeSimbriefSheet);

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
    window.setTimeout(() => document.getElementById("sb-orig")?.focus(), 30);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  if (!open) return null;

  const split = splitCallsign(callsign);
  const ready = simbriefDraftReady(draft) && Boolean(split.airline && split.fltnum);
  const url = ready ? buildSimbriefCustomUrl({ ...draft, airline: split.airline, fltnum: split.fltnum }) : "";

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-bg/70 p-4">
      <div className="relative w-full max-w-md">
        <div className="max-h-[90dvh] overflow-y-auto rounded-lg border border-border-strong bg-raised shadow-xl">
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">Prancheta</p>
              <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
                <ClipboardList className="size-4 text-accent" />
                Briefing SimBrief
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="grid size-11 place-items-center rounded-md border border-border text-muted hover:text-fg"
              aria-label="Fechar prancheta"
            >
              <X className="size-4" />
            </button>
          </header>

          <form
            className="grid gap-3 px-5 py-4 sm:grid-cols-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <ClipField
              id="sb-orig"
              label="Origem"
              hint="ICAO"
              value={draft.orig}
              placeholder="ICAO"
              onChange={(v) => patch({ orig: sanitizeIcao(v) })}
            />
            <ClipField
              id="sb-dest"
              label="Destino"
              hint="ICAO"
              value={draft.dest}
              placeholder="ICAO"
              onChange={(v) => patch({ dest: sanitizeIcao(v) })}
            />
            <AircraftField
              value={draft.type}
              onChange={(v) => patch({ type: v })}
            />
            <ClipField
              id="sb-alt"
              label="Altitude"
              hint="FL"
              value={draft.altitude}
              placeholder="FL360"
              className="sm:col-span-2"
              onChange={(v) => patch({ altitude: sanitizeAltitude(v) })}
            />
          </form>

          <div className="border-t border-border px-5 py-3">
            <p className="font-mono text-[10px] tracking-wide text-subtle uppercase">Do callsign inicial</p>
            {split.airline && split.fltnum ? (
              <p className="mt-1 font-mono text-sm text-fg">
                {callsign} · cia {split.airline} · voo {split.fltnum}
              </p>
            ) : (
              <p className="mt-1 text-sm text-warn">
                Digite o callsign na tela inicial (ex. TAM1234) para preencher cia e número.
              </p>
            )}
          </div>

          <div className="border-t border-border px-5 py-4">
            <p className="font-mono text-[10px] tracking-wide text-subtle uppercase">Link custom</p>
            <p className="mt-1 break-all font-mono text-xs leading-relaxed text-muted">
              {ready
                ? url
                : "Preencha origem, destino e aeronave. Cia e voo vêm do callsign."}
            </p>
            {ready ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => useGame.getState().armOfpWatch()}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-fg text-sm font-semibold tracking-wide text-accent-fg uppercase hover:opacity-90"
              >
                Gerar link URL
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-fg text-sm font-semibold tracking-wide text-accent-fg uppercase opacity-40"
              >
                Gerar link URL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AircraftField({
  value,
  onChange,
}: {
  value: string;
  onChange: (icao: string) => void;
}) {
  const selected = findAircraft(value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = query.trim().toUpperCase();
    if (!s) return SIMBRIEF_AIRCRAFT.slice(0, 40);
    return SIMBRIEF_AIRCRAFT.filter(
      (a) => a.icao.includes(s) || a.name.toUpperCase().includes(s),
    ).slice(0, 40);
  }, [query]);

  return (
    <div className="relative sm:col-span-2">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">Aeronave</span>
        <span className="font-mono text-[10px] text-subtle uppercase">SimBrief type</span>
      </span>
      <input
        id="sb-type"
        value={open ? query : selected ? `${selected.icao} · ${selected.name}` : value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 160)}
        placeholder="Buscar A320, B738, E190…"
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-11 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm tracking-wider text-fg placeholder:text-subtle outline-none",
          "focus:border-border-strong focus:ring-2 focus:ring-accent/30",
        )}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border-strong bg-surface py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Nenhum tipo encontrado.</li>
          ) : (
            filtered.map((a) => (
              <li key={a.icao}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(a.icao);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-10 w-full items-center justify-between gap-3 px-3 text-left text-sm",
                    a.icao === value ? "bg-raised text-fg" : "text-fg hover:bg-raised",
                  )}
                >
                  <span className="font-mono tracking-wider">{a.icao}</span>
                  <span className="truncate text-muted">{a.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function ClipField({
  id,
  label,
  hint,
  value,
  placeholder,
  onChange,
  className,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
        <span className="font-mono text-[10px] text-subtle uppercase">{hint}</span>
      </span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-11 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm tracking-wider text-fg placeholder:text-subtle outline-none",
          "focus:border-border-strong focus:ring-2 focus:ring-accent/30",
        )}
      />
    </label>
  );
}
