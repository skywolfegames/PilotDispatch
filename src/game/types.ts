export type GamePhase = "boot" | "start" | "playing" | "paused" | "complete";

export type NearbyDesk = "simbrief" | "ivao" | "door" | "webeye" | "metar" | "towers" | null;

export type LookMode = "lock" | "drag";

export interface OfpSummary {
  requestId: string;
  timeGenerated: string;
  origin: string;
  destination: string;
  callsign: string;
  aircraft: string;
  route: string;
  alternate: string;
  altitude: string;
  ete: string;
  originName: string;
  destName: string;
  airline: string;
  flightNumber: string;
  cruiseTas: string;
  personsOnBoard: number;
  sid: string;
  sidTrans: string;
  star: string;
  starTrans: string;
  distanceNm: string;
  eta: string;
  source: "simbrief" | "training";
}

export interface OfpFetchResult {
  ok: boolean;
  ofp?: OfpSummary;
  error?: string;
  fetchStatus?: string;
}

export interface IvaoWatchResult {
  ok: boolean;
  online: boolean;
  callsign?: string;
  departure?: string;
  arrival?: string;
  error?: string;
}
