import { createServerFn } from "@tanstack/react-start";
import type { IvaoWatchResult, OfpFetchResult, OfpSummary } from "@/game/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function digits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 12);
}

function xmlInner(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1] ?? "";
}

function xmlLeaf(xml: string, tag: string): string {
  const inner = xmlInner(xml, tag);
  if (!inner) return "";
  return inner
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[\s\S]*>/g, "")
    .trim();
}

function friendlySimbriefStatus(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes("no flight plan")) {
    return "Nenhum OFP neste Pilot ID. Gere o plano no SimBrief e volte ao balcão.";
  }
  if (lower.includes("unknown user") || lower.includes("invalid user") || lower.includes("not found")) {
    return "Pilot ID não encontrado no SimBrief.";
  }
  return status.replace(/^Error:\s*/i, "") || "OFP não encontrado.";
}

function formatAltitude(raw: string): string {
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1000) return `FL${String(Math.round(n / 100)).padStart(3, "0")}`;
  return `FL${String(n).padStart(3, "0")}`;
}

function formatEte(raw: string): string {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return "";
  const minutes = Math.round(n / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatNm(raw: string): string {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${Math.round(n)} NM`;
}

function formatEtaClock(unix: string, tz: string): string {
  const t = Number.parseInt(unix, 10);
  if (!Number.isFinite(t) || t < 1_000_000) return "";
  const offsetH = Number.parseFloat(tz);
  const shift = Number.isFinite(offsetH) ? offsetH * 3600 : 0;
  const d = new Date((t + shift) * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function parsePaxCount(weights: string, general: string): number {
  const raw =
    xmlLeaf(weights, "pax_count") ||
    xmlLeaf(weights, "pax_count_actual") ||
    xmlLeaf(general, "passengers");
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(999, n);
}

export function parseSimbriefXml(xml: string): OfpFetchResult {
  const fetchBlock = xmlInner(xml, "fetch");
  const fetchStatus = xmlLeaf(fetchBlock, "status") || xmlLeaf(xml, "status");
  if (!fetchStatus) return { ok: false, error: "XML do SimBrief sem bloco <fetch>." };
  if (!/^success$/i.test(fetchStatus)) {
    return { ok: false, fetchStatus, error: friendlySimbriefStatus(fetchStatus) };
  }

  const params = xmlInner(xml, "params");
  const general = xmlInner(xml, "general");
  const origin = xmlInner(xml, "origin");
  const destination = xmlInner(xml, "destination");
  const alternate = xmlInner(xml, "alternate");
  const aircraft = xmlInner(xml, "aircraft");
  const times = xmlInner(xml, "times");
  const atc = xmlInner(xml, "atc");
  const weights = xmlInner(xml, "weights");

  const originIcao = xmlLeaf(origin, "icao_code").toUpperCase();
  const destIcao = xmlLeaf(destination, "icao_code").toUpperCase();
  if (!originIcao || !destIcao) {
    return { ok: false, fetchStatus, error: "OFP incompleto (sem origem/destino)." };
  }

  const airline = (xmlLeaf(general, "icao_airline") || xmlLeaf(atc, "icao_airline")).toUpperCase();
  const flightNumber = xmlLeaf(general, "flight_number") || xmlLeaf(atc, "flight_number");
  const callsign = (
    xmlLeaf(atc, "callsign") || (airline && flightNumber ? `${airline}${flightNumber}` : "")
  ).toUpperCase();
  const aircraftIcao = (
    xmlLeaf(aircraft, "icaocode") ||
    xmlLeaf(aircraft, "icao_code") ||
    xmlLeaf(general, "aircraft")
  ).toUpperCase();
  const route = xmlLeaf(general, "route") || xmlLeaf(atc, "route") || "DCT";
  const requestId = xmlLeaf(params, "request_id") || `${originIcao}${destIcao}${callsign}`;
  const timeGenerated = xmlLeaf(params, "time_generated");
  const sid = xmlLeaf(general, "sid_ident");
  const sidTrans = xmlLeaf(general, "sid_trans");
  const star = xmlLeaf(general, "star_ident");
  const starTrans = xmlLeaf(general, "star_trans");
  const distanceNm = formatNm(xmlLeaf(general, "air_distance") || xmlLeaf(general, "route_distance"));
  const eteRaw = xmlLeaf(times, "est_time_enroute") || xmlLeaf(times, "sched_time_enroute");
  const ete = formatEte(eteRaw);
  const eta = formatEtaClock(xmlLeaf(times, "est_in") || xmlLeaf(times, "est_on"), xmlLeaf(times, "dest_timezone")) || ete;

  const ofp: OfpSummary = {
    requestId,
    timeGenerated,
    origin: originIcao,
    destination: destIcao,
    callsign: callsign || "N/A",
    aircraft: aircraftIcao || "A320",
    route,
    alternate: xmlLeaf(alternate, "icao_code").toUpperCase(),
    altitude: formatAltitude(xmlLeaf(general, "initial_altitude") || xmlLeaf(atc, "initial_alt")),
    ete,
    originName: xmlLeaf(origin, "name") || originIcao,
    destName: xmlLeaf(destination, "name") || destIcao,
    airline,
    flightNumber,
    cruiseTas: xmlLeaf(general, "cruise_tas") || xmlLeaf(atc, "tas"),
    personsOnBoard: parsePaxCount(weights, general),
    sid,
    sidTrans,
    star,
    starTrans,
    distanceNm,
    eta,
    source: "simbrief",
  };

  return { ok: true, fetchStatus, ofp };
}

export async function fetchSimbriefOfpBrowser(userid: string): Promise<OfpFetchResult> {
  const id = digits(userid);
  if (!id) return { ok: false, error: "Informe o Pilot ID numérico do SimBrief." };
  if (!/^\d{3,12}$/.test(id)) return { ok: false, error: "Pilot ID inválido. Use só números." };
  try {
    const res = await fetch(
      `https://www.simbrief.com/api/xml.fetcher.php?userid=${encodeURIComponent(id)}`,
      {
        headers: { accept: "application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(12000),
      },
    );
    const text = await res.text();
    const parsed = parseSimbriefXml(text);
    if (!res.ok && !parsed.ok) {
      return parsed.error ? parsed : { ok: false, error: `SimBrief ${res.status}` };
    }
    return parsed;
  } catch {
    return { ok: false, error: "Falha ao consultar o SimBrief." };
  }
}

export const fetchSimbriefOfp = createServerFn({ method: "GET" })
  .validator((data: { userid: string }) => {
    return { userid: digits(data?.userid) };
  })
  .handler(async ({ data }): Promise<OfpFetchResult> => {
    const userid = data.userid;
    if (!userid) return { ok: false, error: "Informe o Pilot ID numérico do SimBrief." };
    if (!/^\d{3,12}$/.test(userid)) {
      return { ok: false, error: "Pilot ID inválido. Use só números." };
    }

    const url = `https://www.simbrief.com/api/xml.fetcher.php?userid=${encodeURIComponent(userid)}`;
    try {
      const res = await fetch(url, {
        headers: { accept: "application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(12000),
      });
      const text = await res.text();
      const parsed = parseSimbriefXml(text);
      if (!res.ok && !parsed.ok) {
        return parsed.error ? parsed : { ok: false, error: `SimBrief ${res.status}` };
      }
      return parsed;
    } catch {
      return { ok: false, error: "Falha ao consultar o SimBrief." };
    }
  });

export const watchIvaoCallsign = createServerFn({ method: "GET" })
  .validator((data: { callsign: string }) => {
    const callsign = String(data?.callsign ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 12);
    return { callsign };
  })
  .handler(async ({ data }): Promise<IvaoWatchResult> => {
    const wanted = data.callsign;
    if (!wanted) return { ok: false, online: false, error: "Informe o callsign." };
    if (!/^[A-Z0-9]{2,12}$/.test(wanted)) {
      return { ok: false, online: false, error: "Callsign inválido." };
    }

    try {
      const res = await fetch("https://api.ivao.aero/v2/tracker/whazzup", {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return { ok: false, online: false, error: `IVAO ${res.status}` };
      const payload = asRecord(await res.json());
      const clients = asRecord(payload?.clients);
      const pilots = (clients?.pilots ?? payload?.pilots) as unknown;
      const list = Array.isArray(pilots) ? pilots : [];
      const hit = list
        .map((row) => asRecord(row))
        .find((row) => str(row?.callsign).toUpperCase() === wanted);

      if (!hit) return { ok: true, online: false, callsign: wanted };

      const fp = asRecord(hit.flightPlan);
      return {
        ok: true,
        online: true,
        callsign: str(hit.callsign, wanted),
        departure: str(fp?.departureId, fp?.departure).toUpperCase(),
        arrival: str(fp?.arrivalId, fp?.arrival).toUpperCase(),
      };
    } catch {
      return { ok: false, online: false, error: "Falha ao consultar a IVAO." };
    }
  });

export type IvaoTower = {
  id: number;
  callsign: string;
  name: string;
  icao: string;
  position: string;
  frequency: string;
  continent: string;
  continentOrder: number;
  region: string;
  atis: string;
  atisRevision: string;
};

const ICAO_CONTINENT: Record<string, { label: string; order: number }> = {
  S: { label: "América do Sul", order: 1 },
  C: { label: "América do Norte", order: 2 },
  K: { label: "América do Norte", order: 2 },
  P: { label: "América do Norte", order: 2 },
  M: { label: "América Central / Caribe", order: 3 },
  T: { label: "América Central / Caribe", order: 3 },
  E: { label: "Europa", order: 4 },
  L: { label: "Europa", order: 4 },
  B: { label: "Europa", order: 4 },
  D: { label: "África", order: 5 },
  F: { label: "África", order: 5 },
  G: { label: "África", order: 5 },
  H: { label: "África", order: 5 },
  O: { label: "Oriente Médio", order: 6 },
  R: { label: "Ásia", order: 7 },
  U: { label: "Ásia", order: 7 },
  V: { label: "Ásia", order: 7 },
  W: { label: "Ásia", order: 7 },
  Z: { label: "Ásia", order: 7 },
  N: { label: "Oceania", order: 8 },
  Y: { label: "Oceania", order: 8 },
  A: { label: "Oceania", order: 8 },
};

const ATC_TYPES = ["ATIS", "DEL", "GND", "TWR", "APP", "DEP", "CTR", "FSS", "RDR", "OBS"] as const;

type AirportRecord = { name: string; municipality: string };

let airportCatalogPromise: Promise<Map<string, AirportRecord>> | null = null;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function airportCatalog(): Promise<Map<string, AirportRecord>> {
  if (airportCatalogPromise) return airportCatalogPromise;
  airportCatalogPromise = fetch("https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv", {
    headers: { accept: "text/csv" },
    signal: AbortSignal.timeout(12000),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Airport catalog ${res.status}`);
      const lines = (await res.text()).split(/\r?\n/);
      const header = parseCsvLine(lines[0] ?? "");
      const identIndex = header.indexOf("ident");
      const nameIndex = header.indexOf("name");
      const municipalityIndex = header.indexOf("municipality");
      const result = new Map<string, AirportRecord>();
      if (identIndex < 0 || nameIndex < 0) return result;
      for (const line of lines.slice(1)) {
        if (!line) continue;
        const row = parseCsvLine(line);
        const ident = row[identIndex]?.trim().toUpperCase();
        const name = row[nameIndex]?.trim();
        if (ident && name) {
          result.set(ident, { name, municipality: row[municipalityIndex]?.trim() ?? "" });
        }
      }
      return result;
    })
    .catch(() => new Map<string, AirportRecord>());
  return airportCatalogPromise;
}

function displayAirportName(icao: string, record: AirportRecord | undefined): string {
  if (!record) return `Estação ${icao}`;
  const airport = record.name.replace(/\s+(Airport|Aerodrome)$/i, "").trim();
  if (!record.municipality || airport.toLowerCase().includes(record.municipality.toLowerCase())) return airport;
  return `${record.municipality} ${airport}`;
}

function atcType(position: string, callsign: string): string {
  if (ATC_TYPES.includes(position as (typeof ATC_TYPES)[number])) return position;
  const last = (callsign.split("_").pop() ?? "").toUpperCase();
  if (ATC_TYPES.includes(last as (typeof ATC_TYPES)[number])) return last;
  return position || last || "ATC";
}

function formatFreq(value: unknown): string {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toFixed(3);
}

function atisText(atis: Record<string, unknown> | null): { text: string; revision: string } {
  if (!atis) return { text: "", revision: "" };
  const revision = str(atis.revision);
  const lines = Array.isArray(atis.lines) ? atis.lines.map((l) => str(l)).filter(Boolean) : [];
  const bodyLines = lines.filter((l) => !/^ts-\d/i.test(l) && !/ivao\.aero/i.test(l));
  const body = bodyLines.join("\n").trim();
  return { text: body, revision };
}

export function groupTowers(list: IvaoTower[]): { continent: string; regions: { region: string; towers: IvaoTower[] }[] }[] {
  const continents = new Map<string, Map<string, IvaoTower[]>>();
  const order = new Map<string, number>();
  for (const twr of list) {
    order.set(twr.continent, twr.continentOrder);
    let regions = continents.get(twr.continent);
    if (!regions) {
      regions = new Map();
      continents.set(twr.continent, regions);
    }
    const rows = regions.get(twr.region) ?? [];
    rows.push(twr);
    regions.set(twr.region, rows);
  }
  return [...continents.entries()]
    .sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99) || a[0].localeCompare(b[0]))
    .map(([continent, regions]) => ({
      continent,
      regions: [...regions.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([region, towers]) => ({
          region,
          towers: towers.slice().sort((a, b) => a.position.localeCompare(b.position) || a.callsign.localeCompare(b.callsign)),
        })),
    }));
}

export const fetchIvaoTowers = createServerFn({ method: "GET" }).handler(async (): Promise<{
  ok: boolean;
  towers?: IvaoTower[];
  error?: string;
}> => {
  try {
    const res = await fetch("https://api.ivao.aero/v2/tracker/whazzup", {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { ok: false, error: `IVAO ${res.status}` };
    const payload = asRecord(await res.json());
    const clients = asRecord(payload?.clients);
    const raw = clients?.atcs ?? payload?.atcs;
    const list = Array.isArray(raw) ? raw : [];
    const towers: IvaoTower[] = [];
    const airports = await airportCatalog();
    for (const item of list) {
      const row = asRecord(item);
      if (!row) continue;
      const callsign = str(row.callsign).toUpperCase();
      if (!callsign) continue;
      const session = asRecord(row.atcSession);
      const position = atcType(str(session?.position).toUpperCase(), callsign);
      const icao = (callsign.split("_")[0] ?? callsign).replace(/[^A-Z]/g, "").slice(0, 4);
      const { text, revision } = atisText(asRecord(row.atis));
      const airportName = displayAirportName(icao, airports.get(icao));
      const letter = icao[0] ?? "";
      const continentInfo = ICAO_CONTINENT[letter] ?? { label: "Outras regiões", order: 9 };
      towers.push({
        id: typeof row.id === "number" ? row.id : towers.length,
        callsign,
        name: `${airportName} ${position}`,
        icao: icao || "ZZZZ",
        position: position || "ATC",
        frequency: formatFreq(session?.frequency),
        continent: continentInfo.label,
        continentOrder: continentInfo.order,
        region: icao.slice(0, 2) || "—",
        atis: text,
        atisRevision: revision,
      });
    }
    return { ok: true, towers };
  } catch {
    return { ok: false, error: "Falha ao consultar as torres da IVAO." };
  }
});

export type MetarRow = {
  icaoId?: string;
  name?: string;
  rawOb?: string;
  temp?: number;
  dewp?: number;
  wdir?: number | string;
  wspd?: number;
  visib?: string | number;
  altim?: number;
  fltCat?: string;
  cover?: string;
};

export type ActiveRunway = {
  landing: string;
  pair: string;
  heading: number;
  headwindKt: number;
  crosswindKt: number;
  windLabel: string;
  candidates: { id: string; pair: string; headwindKt: number }[];
  note: string;
};

type AirportRwy = { id: string; alignment: number };

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !/vrb/i.test(value)) {
    const n = Number.parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseAirportRunways(payload: unknown): AirportRwy[] {
  const list = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const first = asRecord(list[0]);
  const raw = first?.runways;
  if (!Array.isArray(raw)) return [];
  const out: AirportRwy[] = [];
  for (const row of raw) {
    const rec = asRecord(row);
    if (!rec) continue;
    const id = str(rec.id);
    const alignment = num(rec.alignment);
    if (!id.includes("/") || alignment == null) continue;
    out.push({ id: id.toUpperCase(), alignment });
  }
  return out;
}

export function pickLandingRunway(
  wdir: number | string | null | undefined,
  wspd: number | null | undefined,
  runways: AirportRwy[],
): ActiveRunway | null {
  if (!runways.length) return null;
  const dir = num(wdir);
  const spd = num(wspd) ?? 0;
  const windLabel =
    dir == null ? `VRB/${Math.round(spd)} kt` : `${Math.round(dir)}/${Math.round(spd)} kt`;

  if (dir == null || spd < 2) {
    return {
      landing: "—",
      pair: runways.map((r) => r.id).join(" · "),
      heading: 0,
      headwindKt: 0,
      crosswindKt: 0,
      windLabel,
      candidates: [],
      note: "Vento calmo ou variável. Confirme a pista no ATIS/TWR.",
    };
  }

  const scored: { id: string; pair: string; heading: number; headwind: number; cross: number }[] = [];
  for (const rwy of runways) {
    const [left, right] = rwy.id.split("/");
    const hdgA = ((rwy.alignment % 360) + 360) % 360;
    const hdgB = (hdgA + 180) % 360;
    const ends = [
      { id: left, heading: hdgA },
      { id: right, heading: hdgB },
    ];
    for (const end of ends) {
      if (!end.id) continue;
      const rad = ((dir - end.heading) * Math.PI) / 180;
      scored.push({
        id: end.id,
        pair: rwy.id,
        heading: Math.round(end.heading),
        headwind: spd * Math.cos(rad),
        cross: Math.abs(spd * Math.sin(rad)),
      });
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.headwind - a.headwind);
  const best = scored[0];
  const close = scored.filter((s) => best.headwind - s.headwind < 2.5).slice(0, 4);

  return {
    landing: best.id,
    pair: best.pair,
    heading: best.heading,
    headwindKt: Math.round(best.headwind),
    crosswindKt: Math.round(best.cross),
    windLabel,
    candidates: close.map((s) => ({
      id: s.id,
      pair: s.pair,
      headwindKt: Math.round(s.headwind),
    })),
    note: "Estimativa pelo vento do METAR. Confirme ATIS/TWR.",
  };
}

export const fetchMetar = createServerFn({ method: "GET" })
  .validator((data: { icao: string }) => ({
    icao: String(data?.icao ?? "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 4),
  }))
  .handler(async ({
    data,
  }): Promise<{ ok: boolean; rows?: MetarRow[]; activeRunway?: ActiveRunway | null; error?: string }> => {
    if (data.icao.length !== 4) return { ok: false, error: "Digite o ICAO com 4 letras." };
    try {
      const [metarRes, airportRes] = await Promise.all([
        fetch(
          `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(data.icao)}&format=json`,
          { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) },
        ),
        fetch(
          `https://aviationweather.gov/api/data/airport?ids=${encodeURIComponent(data.icao)}&format=json`,
          { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) },
        ),
      ]);
      if (!metarRes.ok) return { ok: false, error: `METAR ${metarRes.status}` };
      const payload = (await metarRes.json()) as unknown;
      const list = Array.isArray(payload) ? (payload as MetarRow[]) : [];
      if (!list.length) return { ok: false, error: `Sem METAR para ${data.icao}.` };

      let activeRunway: ActiveRunway | null = null;
      if (airportRes.ok) {
        try {
          const airportJson = (await airportRes.json()) as unknown;
          const runways = parseAirportRunways(airportJson);
          const row = list[0];
          activeRunway = pickLandingRunway(row?.wdir, row?.wspd ?? null, runways);
        } catch {
          activeRunway = null;
        }
      }
      return { ok: true, rows: list, activeRunway };
    } catch {
      return { ok: false, error: "Não foi possível consultar o METAR agora." };
    }
  });
