import type { OfpSummary } from "./types";

export const DEMO_OFP: OfpSummary = {
  requestId: "training-sbgl-sbsp",
  timeGenerated: "0",
  origin: "SBGL",
  destination: "SBSP",
  callsign: "TAM3740",
  aircraft: "A320",
  route: "DCT UPKAT UZ6 ANISE DCT",
  alternate: "SBGR",
  altitude: "FL360",
  ete: "00:55",
  originName: "Galeão / Antonio Carlos Jobim",
  destName: "Congonhas",
  airline: "TAM",
  flightNumber: "3740",
  cruiseTas: "447",
  personsOnBoard: 150,
  sid: "POKE1A",
  sidTrans: "POKE1",
  star: "UGOGU1A",
  starTrans: "UGOGU",
  distanceNm: "196 NM",
  eta: "00:55",
  source: "training",
};

const WAKE: Record<string, string> = {
  C172: "L",
  C208: "L",
  E170: "M",
  E190: "M",
  E195: "M",
  BCS3: "M",
  A319: "M",
  A320: "M",
  A321: "M",
  A20N: "M",
  A21N: "M",
  B737: "M",
  B738: "M",
  B38M: "M",
  A332: "H",
  A339: "H",
  B77W: "H",
  B789: "H",
};

function secondsFromMidnightUtc(offsetMin = 40): number {
  const now = new Date();
  return now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + offsetMin * 60;
}

export function buildIvaoFlightPlanUrl(ofp: OfpSummary): string {
  const tas = Number.parseInt(ofp.cruiseTas || "450", 10);
  const altNum = Number.parseInt(ofp.altitude.replace(/\D/g, "") || "360", 10);
  const dof = formatDof();
  const payload = {
    callsign: ofp.callsign,
    flightRules: "I",
    flightType: "S",
    aircraftNumber: 1,
    aircraftId: ofp.aircraft,
    aircraftWakeTurbulence: WAKE[ofp.aircraft] ?? "M",
    aircraftEquipments: ["S", "D", "E2", "E3", "F", "G", "I", "R", "W", "Y"],
    aircraftTransponderTypes: ["H"],
    departureId: ofp.origin,
    departureTime: secondsFromMidnightUtc(),
    cruisingSpeedType: "N",
    cruisingSpeed: Number.isFinite(tas) ? tas : 450,
    altitudeType: "F",
    altitude: Number.isFinite(altNum) ? altNum : 360,
    route: ofp.route || "DCT",
    arrivalId: ofp.destination,
    eet: hhmmToSeconds(ofp.ete || "0100"),
    alternativeId: ofp.alternate || undefined,
    remarks: `DOF/${dof}`,
    endurance: hhmmToSeconds("0300"),
    pob: ofp.personsOnBoard > 0 ? ofp.personsOnBoard : 150,
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  const b64 = btoa(bin);
  return `https://fpl.ivao.aero/flight-plans/create?flightPlan=${encodeURIComponent(b64)}`;
}

function hhmmToSeconds(raw: string): number {
  const digits = raw.replace(/\D/g, "").padStart(4, "0").slice(0, 4);
  const hours = Number.parseInt(digits.slice(0, 2), 10);
  const minutes = Number.parseInt(digits.slice(2, 4), 10);
  return ((Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)) * 60;
}

function formatDof(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export const SIMBRIEF_DISPATCH = "https://www.simbrief.com/system/dispatch.php";
export const SIMBRIEF_CUSTOM = "https://dispatch.simbrief.com/options/custom";
export const SIMBRIEF_LATEST = "https://www.simbrief.com/system/dispatch.php?editflight=0";

export type SimbriefDraft = {
  orig: string;
  dest: string;
  type: string;
  altitude: string;
  airline: string;
  fltnum: string;
};

export const EMPTY_SIMBRIEF_DRAFT: SimbriefDraft = {
  orig: "",
  dest: "",
  type: "",
  altitude: "",
  airline: "",
  fltnum: "",
};

export function sanitizeIcao(value: string, max = 4): string {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, max);
}

export function sanitizeAltitude(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) return "";
  const letters = cleaned.replace(/[^A-Z]/g, "");
  const digits = cleaned.replace(/[^0-9]/g, "");
  if (!digits) return "";
  const safeDigits = digits.slice(0, 5);
  if (letters.includes("F") || cleaned.startsWith("FL")) return `FL${safeDigits}`;
  return `FL${safeDigits}`;
}

export function simbriefAltitudeParam(value: string): string {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 5);
  if (!digits) return "";
  return `${Number.parseInt(digits, 10) * 100}`.slice(0, 6);
}

export function sanitizeAcType(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
}

export function sanitizeAirline(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
}

export function sanitizeFltnum(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
}

export function simbriefDraftReady(draft: SimbriefDraft): boolean {
  return draft.orig.length === 4 && draft.dest.length === 4 && draft.type.length >= 2;
}

export function buildSimbriefCustomUrl(draft: SimbriefDraft): string {
  const params = new URLSearchParams();
  params.set("orig", draft.orig);
  params.set("dest", draft.dest);
  params.set("type", draft.type);
  const simbriefAlt = simbriefAltitudeParam(draft.altitude);
  if (simbriefAlt) params.set("fl", simbriefAlt);
  if (draft.airline) params.set("airline", draft.airline);
  if (draft.fltnum) params.set("fltnum", draft.fltnum);
  return `${SIMBRIEF_CUSTOM}?${params.toString()}`;
}

export function splitCallsign(callsign: string): { airline: string; fltnum: string } {
  const raw = callsign.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = raw.match(/^([A-Z]{2,3})(\d{1,8})$/);
  if (!m) return { airline: "", fltnum: "" };
  return { airline: m[1], fltnum: m[2] };
}

export function draftFromOfp(ofp: OfpSummary | null, callsign: string): Partial<SimbriefDraft> {
  const split = splitCallsign(callsign || ofp?.callsign || "");
  return {
    orig: ofp?.origin || "",
    dest: ofp?.destination || "",
    type: ofp?.aircraft || "",
    altitude: ofp?.altitude || "",
    airline: ofp?.airline || split.airline,
    fltnum: ofp?.flightNumber || split.fltnum,
  };
}
