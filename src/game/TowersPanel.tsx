import { useEffect, useMemo, useState } from "react";
import { ChevronDown, LoaderCircle, Radio, X } from "lucide-react";
import { fetchIvaoTowers, groupTowers, type IvaoTower } from "@/lib/ofp-api";
import { cn } from "@/lib/utils";
import { useGame } from "./store";

type Filters = {
  station: string;
  type: string;
  icao: string;
  freq: string;
  atis: "" | "yes" | "no";
};

const EMPTY_FILTERS: Filters = { station: "", type: "", icao: "", freq: "", atis: "" };

function matches(twr: IvaoTower, f: Filters): boolean {
  if (f.station && !twr.callsign.includes(f.station.trim().toUpperCase())) return false;
  if (f.type && twr.position !== f.type) return false;
  if (f.icao && !twr.icao.includes(f.icao.trim().toUpperCase())) return false;
  if (f.freq && !twr.frequency.replace(".", "").includes(f.freq.replace(".", ""))) return false;
  if (f.atis === "yes" && !twr.atis) return false;
  if (f.atis === "no" && twr.atis) return false;
  return true;
}

export function TowersPanel() {
  const open = useGame((s) => s.towersOpen);
  const close = useGame((s) => s.closeTowers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [towers, setTowers] = useState<IvaoTower[]>([]);
  const [atis, setAtis] = useState<IvaoTower | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const result = await fetchIvaoTowers();
      if (!result.ok) {
        setError(result.error ?? "Não foi possível listar as torres.");
        return;
      }
      setTowers(result.towers ?? []);
      setError(null);
    } catch {
      setError("Falha ao consultar a IVAO.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      setAtis(null);
      setFilters(EMPTY_FILTERS);
      setCollapsed({});
      return;
    }
    void load();
    const id = window.setInterval(() => void load(), 25000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setAtis((cur) => {
        if (cur) return null;
        close();
        return null;
      });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  const types = useMemo(() => {
    const set = new Set(towers.map((t) => t.position));
    return [...set].sort();
  }, [towers]);

  const filtered = useMemo(() => towers.filter((t) => matches(t, filters)), [towers, filters]);
  const groups = useMemo(() => groupTowers(filtered), [filtered]);
  const filtering = Boolean(filters.station || filters.type || filters.icao || filters.freq || filters.atis);

  function isOpen(name: string, index: number) {
    if (name in collapsed) return !collapsed[name];
    if (filtering) return true;
    return index === 0;
  }

  function toggle(name: string, index: number) {
    const currentlyOpen = isOpen(name, index);
    setCollapsed((prev) => ({ ...prev, [name]: currentlyOpen }));
  }

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-bg/75 p-3 sm:p-6">
      <div className="flex h-full max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.2em] text-ok uppercase">Telão · Torres IVAO</p>
            <h2 className="mt-0.5 flex items-center gap-2 text-base font-semibold tracking-tight">
              <Radio className="size-4 text-ok" />
              Torres / ATC online
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden font-mono text-xs text-muted sm:block">
              {filtered.length}/{towers.length} ATC
            </p>
            <button
              type="button"
              onClick={close}
              className="grid size-11 place-items-center rounded-md border border-border text-muted hover:text-fg"
              aria-label="Fechar torres"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-3 sm:grid-cols-5">
          <FilterField
            label="Estação"
            value={filters.station}
            onChange={(station) => setFilters((f) => ({ ...f, station: station.toUpperCase() }))}
            placeholder="SBGL_TWR"
          />
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] tracking-wide text-subtle uppercase">Tipo</span>
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              className="h-11 w-full rounded-md border border-border bg-raised px-2 font-mono text-xs text-fg outline-none"
            >
              <option value="">Todos</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <FilterField
            label="ICAO"
            value={filters.icao}
            onChange={(icao) => setFilters((f) => ({ ...f, icao: icao.toUpperCase() }))}
            placeholder="SBGL"
          />
          <FilterField
            label="Freq"
            value={filters.freq}
            onChange={(freq) => setFilters((f) => ({ ...f, freq }))}
            placeholder="118.2"
          />
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] tracking-wide text-subtle uppercase">ATIS</span>
            <select
              value={filters.atis}
              onChange={(e) => setFilters((f) => ({ ...f, atis: e.target.value as Filters["atis"] }))}
              className="h-11 w-full rounded-md border border-border bg-raised px-2 font-mono text-xs text-fg outline-none"
            >
              <option value="">Todos</option>
              <option value="yes">Com ATIS</option>
              <option value="no">Sem ATIS</option>
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {loading && !towers.length ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" />
              Consultando a rede IVAO…
            </p>
          ) : null}
          {error ? <p className="text-sm text-warn">{error}</p> : null}
          {!error && !loading && !towers.length ? (
            <p className="text-sm text-muted">Nenhuma torre online no momento.</p>
          ) : null}
          {!error && towers.length > 0 && !filtered.length ? (
            <p className="text-sm text-muted">Nenhum ATC com esses filtros.</p>
          ) : null}

          {groups.map((continent, index) => {
            const openSection = isOpen(continent.continent, index);
            const count = continent.regions.reduce((n, r) => n + r.towers.length, 0);
            return (
              <section key={continent.continent} className="mb-2 overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => toggle(continent.continent, index)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 bg-raised px-3 py-2 text-left"
                  aria-expanded={openSection}
                >
                  <span className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
                    {continent.continent}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted">{count}</span>
                    <ChevronDown className={cn("size-4 text-muted transition-transform", openSection ? "rotate-0" : "-rotate-90")} />
                  </span>
                </button>
                {openSection
                  ? continent.regions.map((region) => (
                      <div key={`${continent.continent}-${region.region}`} className="border-t border-border">
                        <p className="bg-surface px-3 py-1.5 font-mono text-[11px] tracking-wide text-muted uppercase">
                          Região {region.region}
                        </p>
                        <table className="w-full text-left text-sm">
                          <thead className="font-mono text-[10px] tracking-wide text-subtle uppercase">
                            <tr>
                              <th className="px-3 py-2 font-medium">Estação</th>
                              <th className="px-3 py-2 font-medium">Nome</th>
                              <th className="px-3 py-2 font-medium">Tipo</th>
                              <th className="px-3 py-2 font-medium">ICAO</th>
                              <th className="px-3 py-2 font-medium">Freq</th>
                              <th className="px-3 py-2 font-medium">ATIS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {region.towers.map((twr) => (
                              <tr key={twr.id} className="border-t border-border">
                                <td className="px-3 py-2 font-mono text-fg">{twr.callsign}</td>
                                <td className="max-w-48 px-3 py-2 text-fg">{twr.name}</td>
                                <td className="px-3 py-2">
                                  <span className="rounded-sm border border-border bg-raised px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-accent">
                                    {twr.position}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-mono text-muted">{twr.icao}</td>
                                <td className="px-3 py-2 font-mono text-fg">{twr.frequency}</td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    disabled={!twr.atis}
                                    onClick={() => setAtis(twr)}
                                    className="h-9 min-w-16 rounded-md border border-border bg-raised px-3 text-xs font-semibold text-fg disabled:opacity-35"
                                  >
                                    {twr.atis ? (twr.atisRevision ? `ATIS ${twr.atisRevision}` : "ATIS") : "—"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  : null}
              </section>
            );
          })}
        </div>
      </div>

      {atis ? (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-bg/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border-strong bg-raised p-5 shadow-xl">
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.2em] text-ok uppercase">ATIS · {atis.callsign}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">
                  {atis.icao} {atis.atisRevision ? `Info ${atis.atisRevision}` : ""}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-muted">{atis.frequency} MHz</p>
              </div>
              <button
                type="button"
                onClick={() => setAtis(null)}
                className="grid size-11 place-items-center rounded-md border border-border text-muted hover:text-fg"
                aria-label="Fechar ATIS"
              >
                <X className="size-4" />
              </button>
            </header>
            <pre className="max-h-[50dvh] overflow-auto whitespace-pre-wrap rounded-md bg-surface px-3 py-3 font-mono text-xs leading-relaxed text-fg">
              {atis.atis}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] tracking-wide text-subtle uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-border bg-raised px-2 font-mono text-xs text-fg outline-none placeholder:text-subtle"
      />
    </label>
  );
}
