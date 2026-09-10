import { useEffect, useState } from "react";
import { CloudSun, LoaderCircle, X } from "lucide-react";
import { fetchMetar, type ActiveRunway, type MetarRow } from "@/lib/ofp-api";
import { sanitizeIcao } from "./ofp";
import { useGame } from "./store";

export function MetarPanel() {
  const open = useGame((s) => s.metarOpen);
  const close = useGame((s) => s.closeMetar);
  const ofp = useGame((s) => s.ofp);
  const [icao, setIcao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MetarRow[]>([]);
  const [active, setActive] = useState<ActiveRunway | null>(null);

  useEffect(() => {
    if (!open) return;
    setIcao((prev) => prev || ofp?.origin || "");
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    window.setTimeout(() => document.getElementById("metar-icao")?.focus(), 30);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close, ofp?.origin]);

  async function consult(code: string) {
    const id = sanitizeIcao(code);
    if (id.length !== 4) {
      setError("Digite o ICAO com 4 letras.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMetar({ data: { icao: id } });
      if (!result.ok || !result.rows?.length) {
        setRows([]);
        setActive(null);
        setError(result.error ?? `Sem METAR para ${id}.`);
        return;
      }
      setRows(result.rows);
      setActive(result.activeRunway ?? null);
    } catch {
      setRows([]);
      setActive(null);
      setError("Não foi possível consultar o METAR agora.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-bg/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border-strong bg-raised shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-accent uppercase">Totem · METAR</p>
            <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
              <CloudSun className="size-4 text-accent" />
              Tempo no aeroporto
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid size-11 place-items-center rounded-md border border-border text-muted hover:text-fg"
            aria-label="Fechar METAR"
          >
            <X className="size-4" />
          </button>
        </header>

        <form
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void consult(icao);
          }}
        >
          <label className="block min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">ICAO</span>
            <input
              id="metar-icao"
              value={icao}
              maxLength={4}
              onChange={(e) => setIcao(sanitizeIcao(e.target.value))}
              placeholder="ICAO"
              className="h-11 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm tracking-wider text-fg outline-none focus:border-border-strong focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <button
            type="submit"
            disabled={loading || icao.length !== 4}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fg px-4 text-sm font-semibold text-accent-fg disabled:opacity-40"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Consultar
          </button>
        </form>

        <div className="border-t border-border px-5 py-4">
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          {!error && !rows.length ? (
            <p className="text-sm text-muted">Informe o ICAO de 4 letras e consulte o METAR ao vivo.</p>
          ) : null}
          {rows.map((row) => (
            <article key={row.rawOb ?? row.icaoId} className="space-y-3">
              <p className="font-mono text-xs tracking-wide text-ok uppercase">
                {row.icaoId} {row.fltCat ? `· ${row.fltCat}` : ""}
              </p>
              {row.name ? <p className="text-sm text-fg">{row.name}</p> : null}
              {row.rawOb ? (
                <p className="rounded-md bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-fg">{row.rawOb}</p>
              ) : null}
              <dl className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-3">
                {row.temp != null ? <Meta k="Temp" v={`${row.temp}°C`} /> : null}
                {row.dewp != null ? <Meta k="Dew" v={`${row.dewp}°C`} /> : null}
                {row.wdir != null || row.wspd != null ? (
                  <Meta k="Vento" v={`${row.wdir ?? "VRB"}/${row.wspd ?? 0} kt`} />
                ) : null}
                {row.visib != null ? <Meta k="Vis" v={String(row.visib)} /> : null}
                {row.altim != null ? <Meta k="QNH" v={`${row.altim} hPa`} /> : null}
                {row.cover ? <Meta k="Teto" v={row.cover} /> : null}
              </dl>
            </article>
          ))}
          {active ? <div className="mt-3"><RunwayCard data={active} /></div> : null}
        </div>
      </div>
    </div>
  );
}

function RunwayCard({ data }: { data: ActiveRunway }) {
  return (
    <div className="rounded-lg border border-ok/40 bg-surface px-3 py-3">
      <p className="font-mono text-[10px] tracking-[0.18em] text-ok uppercase">Pista ativa · pouso</p>
      {data.landing !== "—" ? (
        <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-fg">
          {data.landing}
          <span className="ml-2 text-sm font-medium text-muted">{data.pair}</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-fg">{data.pair}</p>
      )}
      {data.landing !== "—" ? (
        <p className="mt-1 font-mono text-xs text-muted">
          HDG {String(data.heading).padStart(3, "0")} · vento {data.windLabel} · frente {data.headwindKt} kt ·
          través {data.crosswindKt} kt
        </p>
      ) : (
        <p className="mt-1 font-mono text-xs text-muted">Vento {data.windLabel}</p>
      )}
      {data.candidates.length > 1 ? (
        <p className="mt-1 font-mono text-[11px] text-subtle">
          Alternativas: {data.candidates.slice(1).map((c) => `${c.id} (${c.headwindKt} kt)`).join(" · ")}
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-subtle">{data.note}</p>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1.5">
      <dt className="text-[10px] tracking-wide text-subtle uppercase">{k}</dt>
      <dd className="mt-0.5 text-fg">{v}</dd>
    </div>
  );
}
