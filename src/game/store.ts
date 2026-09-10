import { create } from "zustand";
import { DEMO_OFP, EMPTY_SIMBRIEF_DRAFT, splitCallsign, type SimbriefDraft } from "./ofp";
import { gameInput } from "./input";
import type { GamePhase, LookMode, NearbyDesk, OfpSummary } from "./types";

const SAVE_KEY = "galeao-dispatch-v3";

type PersistSlice = {
  version: number;
  simbriefUser: string;
  ivaoCallsign: string;
  rememberPilot: boolean;
  trainingMode: boolean;
  draft: SimbriefDraft;
};

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 12);
}

function asDraft(value: unknown): SimbriefDraft {
  const row = value && typeof value === "object" ? (value as Partial<SimbriefDraft>) : {};
  return {
    orig: String(row.orig ?? EMPTY_SIMBRIEF_DRAFT.orig)
      .toUpperCase()
      .slice(0, 4),
    dest: String(row.dest ?? "")
      .toUpperCase()
      .slice(0, 4),
    type: String(row.type ?? "")
      .toUpperCase()
      .slice(0, 6),
    altitude: String(row.altitude ?? "")
      .toUpperCase()
      .slice(0, 6),
    airline: String(row.airline ?? "")
      .toUpperCase()
      .slice(0, 3),
    fltnum: String(row.fltnum ?? "")
      .toUpperCase()
      .slice(0, 8),
  };
}

function loadPersist(): PersistSlice {
  const fallback: PersistSlice = {
    version: 3,
    simbriefUser: "",
    ivaoCallsign: "",
    rememberPilot: false,
    trainingMode: false,
    draft: { ...EMPTY_SIMBRIEF_DRAFT },
  };
  try {
    const raw =
      localStorage.getItem(SAVE_KEY) ??
      localStorage.getItem("galeao-dispatch-v2") ??
      localStorage.getItem("galeao-dispatch-v1");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistSlice>;
    return {
      ...fallback,
      ...parsed,
      version: 3,
      simbriefUser: digitsOnly(parsed.simbriefUser),
      ivaoCallsign: String(parsed.ivaoCallsign ?? "")
        .toUpperCase()
        .slice(0, 12),
      rememberPilot: Boolean(parsed.rememberPilot),
      trainingMode: Boolean(parsed.trainingMode),
      draft: asDraft(parsed.draft),
    };
  } catch {
    return fallback;
  }
}

function savePersist(state: PersistSlice) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, version: 3 }));
  } catch {
    /* private mode */
  }
}

export interface GameStore {
  phase: GamePhase;
  lookMode: LookMode;
  simbriefUser: string;
  ivaoCallsign: string;
  rememberPilot: boolean;
  trainingMode: boolean;
  nearby: NearbyDesk;
  visitedSimbrief: boolean;
  visitedIvao: boolean;
  ofp: OfpSummary | null;
  pollingOfp: boolean;
  ofpArmed: boolean;
  ofpBaseline: { requestId: string; timeGenerated: string } | null;
  ofpError: string | null;
  pollingIvao: boolean;
  ivaoOnline: boolean;
  ivaoError: string | null;
  doorReleased: boolean;
  banner: string | null;
  simbriefSheet: boolean;
  webeyeOpen: boolean;
  metarOpen: boolean;
  towersOpen: boolean;
  promptDismissed: boolean;
  draft: SimbriefDraft;
  setSimbriefUser: (v: string) => void;
  setIvaoCallsign: (v: string) => void;
  setRememberPilot: (v: boolean) => void;
  setTrainingMode: (v: boolean) => void;
  enterTerminal: () => void;
  pause: () => void;
  resume: () => void;
  setNearby: (v: NearbyDesk) => void;
  markSimbriefVisit: () => void;
  armOfpWatch: () => void;
  captureOfpBaseline: (ofp: OfpSummary | null) => void;
  markIvaoVisit: () => void;
  setOfp: (ofp: OfpSummary) => void;
  setOfpError: (error: string | null) => void;
  setPollingOfp: (v: boolean) => void;
  setPollingIvao: (v: boolean) => void;
  setIvaoOnline: (v: boolean) => void;
  setIvaoError: (error: string | null) => void;
  injectTrainingOfp: () => void;
  confirmIvao: () => void;
  releaseDoor: () => void;
  finishMission: () => void;
  replay: () => void;
  logout: () => void;
  setLookMode: (v: LookMode) => void;
  setBanner: (v: string | null) => void;
  openSimbriefSheet: () => void;
  closeSimbriefSheet: () => void;
  openWebeye: () => void;
  closeWebeye: () => void;
  openMetar: () => void;
  closeMetar: () => void;
  openTowers: () => void;
  closeTowers: () => void;
  dismissPrompt: () => void;
  patchDraft: (patch: Partial<SimbriefDraft>) => void;
  finishBoot: () => void;
  hydrate: () => void;
  spawnNonce: number;
  bootCanvasReady: boolean;
  markCanvasReady: () => void;
}

function persistFrom(s: GameStore) {
  savePersist({
    version: 3,
    simbriefUser: s.rememberPilot ? s.simbriefUser : "",
    ivaoCallsign: s.rememberPilot ? s.ivaoCallsign : "",
    rememberPilot: s.rememberPilot,
    trainingMode: s.trainingMode,
    draft: s.draft,
  });
}

export const useGame = create<GameStore>((set, get) => ({
  phase: "boot",
  lookMode: "drag",
  simbriefUser: "",
  ivaoCallsign: "",
  rememberPilot: false,
  trainingMode: false,
  nearby: null,
  visitedSimbrief: false,
  visitedIvao: false,
  ofp: null,
  pollingOfp: false,
  ofpArmed: false,
  ofpBaseline: null,
  ofpError: null,
  pollingIvao: false,
  ivaoOnline: false,
  ivaoError: null,
  doorReleased: false,
  banner: null,
  simbriefSheet: false,
  webeyeOpen: false,
  metarOpen: false,
  towersOpen: false,
  promptDismissed: false,
  spawnNonce: 0,
  bootCanvasReady: false,
  draft: { ...EMPTY_SIMBRIEF_DRAFT },

  setSimbriefUser: (v) => {
    const simbriefUser = digitsOnly(v);
    set({ simbriefUser });
    persistFrom(get());
  },
  setIvaoCallsign: (v) => {
    const ivaoCallsign = v.toUpperCase();
    const split = splitCallsign(ivaoCallsign);
    set({
      ivaoCallsign,
      draft: { ...get().draft, airline: split.airline, fltnum: split.fltnum },
    });
    persistFrom(get());
  },
  setRememberPilot: (v) => {
    set({ rememberPilot: v });
    persistFrom(get());
  },
  setTrainingMode: (v) => {
    set({ trainingMode: v });
    persistFrom(get());
  },
  enterTerminal: () => {
    const split = splitCallsign(get().ivaoCallsign);
    set({
      phase: "playing",
      banner: null,
      simbriefSheet: false,
      webeyeOpen: false,
      metarOpen: false,
      towersOpen: false,
      promptDismissed: false,
      spawnNonce: get().spawnNonce + 1,
      draft: {
        orig: "",
        dest: "",
        type: "",
        altitude: "",
        airline: split.airline,
        fltnum: split.fltnum,
      },
    });
    persistFrom(get());
  },
  pause: () => {
    if (get().phase === "playing") {
      document.exitPointerLock?.();
      set({ phase: "paused", simbriefSheet: false, webeyeOpen: false, metarOpen: false, towersOpen: false, lookMode: "drag" });
    }
  },
  resume: () => {
    if (get().phase === "paused") set({ phase: "playing" });
  },
  setNearby: (v) => {
    const cur = get().nearby;
    if (v === cur) return;
    set({ nearby: v, promptDismissed: false });
  },
  markSimbriefVisit: () => set({ visitedSimbrief: true, ofpError: null }),
  armOfpWatch: () => {
    const current = get().ofp;
    set({
      ofpArmed: true,
      pollingOfp: true,
      ofpError: null,
      ofpBaseline: current
        ? { requestId: current.requestId, timeGenerated: current.timeGenerated }
        : null,
      banner: "Gere o OFP no SimBrief. Só um plano novo será detectado.",
    });
  },
  captureOfpBaseline: (ofp) => {
    if (get().ofpBaseline) return;
    set({
      ofpBaseline: ofp
        ? { requestId: ofp.requestId, timeGenerated: ofp.timeGenerated }
        : { requestId: "", timeGenerated: "" },
      ofpError: ofp ? "Aguardando um OFP novo…" : "Aguardando OFP…",
    });
  },
  markIvaoVisit: () => set({ visitedIvao: true, pollingIvao: true, ivaoError: null }),
  setOfp: (ofp) => {
    if (!ofp.origin || !ofp.destination) return;
    if (!get().ofpArmed) return;

    const base = get().ofpBaseline;
    if (!base) {
      get().captureOfpBaseline(ofp);
      return;
    }
    const sameBaseline = base.requestId === ofp.requestId && base.timeGenerated === ofp.timeGenerated;
    if (sameBaseline) return;

    const prev = get().ofp;
    const same =
      prev &&
      prev.requestId === ofp.requestId &&
      prev.timeGenerated === ofp.timeGenerated;
    if (same) return;

    const replacing = Boolean(prev);
    const watch = ofp.source === "simbrief";
    const typed = get().ivaoCallsign;
    const keepTyped = Boolean(typed && typed !== prev?.callsign);

    set({
      ofp,
      pollingOfp: watch,
      ofpError: null,
      banner: replacing ? "Novo OFP gerado" : "Plano detectado",
      ivaoCallsign: keepTyped ? typed : ofp.callsign,
      visitedIvao: replacing ? false : get().visitedIvao,
      pollingIvao: replacing ? false : get().pollingIvao,
      ivaoOnline: replacing ? false : get().ivaoOnline,
      ivaoError: replacing ? null : get().ivaoError,
      doorReleased: replacing ? false : get().doorReleased,
      phase: replacing && get().phase === "complete" ? "playing" : get().phase,
      simbriefSheet: false,
      webeyeOpen: false,
      metarOpen: false,
      towersOpen: false,
    });
  },
  setOfpError: (error) => set({ ofpError: error }),
  setPollingOfp: (v) => set({ pollingOfp: v }),
  setPollingIvao: (v) => set({ pollingIvao: v }),
  setIvaoOnline: (v) => {
    if (v) {
      set({
        ivaoOnline: true,
        pollingIvao: false,
        ivaoError: null,
        banner: "Plano enviado. Aperte E no botão da porta.",
      });
    } else {
      set({ ivaoOnline: false });
    }
  },
  setIvaoError: (error) => set({ ivaoError: error }),
  injectTrainingOfp: () => {
    const callsign = get().ivaoCallsign || DEMO_OFP.callsign;
    set({ ofpArmed: true, ofpBaseline: { requestId: "", timeGenerated: "" } });
    get().setOfp({ ...DEMO_OFP, callsign, requestId: `training-${Date.now()}` });
  },
  confirmIvao: () => get().setIvaoOnline(true),
  releaseDoor: () => {
    if (!get().ivaoOnline || get().doorReleased) return;
    set({
      doorReleased: true,
      banner: "Porta aberta — pode cruzar os saguões",
    });
  },
  finishMission: () => {
    if (get().phase === "complete" || !get().doorReleased) return;
    document.exitPointerLock?.();
    set({ phase: "complete", banner: null, lookMode: "drag", simbriefSheet: false });
  },
  replay: () => {
    document.exitPointerLock?.();
    gameInput.reset();
    const s = get();
    const split = splitCallsign(s.ivaoCallsign);
    set({
      phase: "playing",
      lookMode: "drag",
      nearby: null,
      visitedSimbrief: false,
      visitedIvao: false,
      ofp: null,
      pollingOfp: false,
      ofpArmed: false,
      ofpBaseline: null,
      ofpError: null,
      pollingIvao: false,
      ivaoOnline: false,
      ivaoError: null,
      doorReleased: false,
      banner: null,
      simbriefSheet: false,
      webeyeOpen: false,
      metarOpen: false,
      towersOpen: false,
      promptDismissed: false,
      spawnNonce: s.spawnNonce + 1,
      draft: {
        orig: "",
        dest: "",
        type: "",
        altitude: "",
        airline: split.airline,
        fltnum: split.fltnum,
      },
    });
  },
  logout: () => {
    document.exitPointerLock?.();
    gameInput.reset();
    const s = get();
    const split = splitCallsign(s.ivaoCallsign);
    set({
      phase: "start",
      lookMode: "drag",
      nearby: null,
      visitedSimbrief: false,
      visitedIvao: false,
      ofp: null,
      pollingOfp: false,
      ofpArmed: false,
      ofpBaseline: null,
      ofpError: null,
      pollingIvao: false,
      ivaoOnline: false,
      ivaoError: null,
      doorReleased: false,
      banner: null,
      simbriefSheet: false,
      webeyeOpen: false,
      metarOpen: false,
      towersOpen: false,
      promptDismissed: false,
      spawnNonce: s.spawnNonce + 1,
      draft: {
        orig: "",
        dest: "",
        type: "",
        altitude: "",
        airline: split.airline,
        fltnum: split.fltnum,
      },
    });
  },
  setLookMode: (v) => set({ lookMode: v }),
  setBanner: (v) => set({ banner: v }),
  openSimbriefSheet: () => {
    const s = get();
    if (s.phase !== "playing") return;
    const split = splitCallsign(s.ivaoCallsign);
    const draft: SimbriefDraft = {
      orig: s.draft.orig || "",
      dest: s.draft.dest || "",
      type: s.draft.type || "",
      altitude: s.draft.altitude || "",
      airline: split.airline,
      fltnum: split.fltnum,
    };
    set({
      simbriefSheet: true,
      lookMode: "drag",
      draft,
      visitedSimbrief: true,
      ofpError: null,
    });
    document.exitPointerLock?.();
    persistFrom(get());
  },
  closeSimbriefSheet: () => set({ simbriefSheet: false }),
  openWebeye: () => {
    if (get().phase !== "playing") return;
    document.exitPointerLock?.();
    set({ webeyeOpen: true, lookMode: "drag", simbriefSheet: false });
  },
  closeWebeye: () => set({ webeyeOpen: false }),
  openMetar: () => {
    if (get().phase !== "playing") return;
    document.exitPointerLock?.();
    set({ metarOpen: true, lookMode: "drag", simbriefSheet: false, webeyeOpen: false });
  },
  closeMetar: () => set({ metarOpen: false }),
  openTowers: () => {
    if (get().phase !== "playing") return;
    document.exitPointerLock?.();
    set({ towersOpen: true, lookMode: "drag", simbriefSheet: false, webeyeOpen: false, metarOpen: false });
  },
  closeTowers: () => set({ towersOpen: false }),
  dismissPrompt: () => set({ promptDismissed: true }),
  patchDraft: (patch) => {
    set({ draft: { ...get().draft, ...patch } });
    persistFrom(get());
  },
  finishBoot: () => {
    if (get().phase === "boot") set({ phase: "start" });
  },
  markCanvasReady: () => {
    if (!get().bootCanvasReady) set({ bootCanvasReady: true });
  },
  hydrate: () => {
    const p = loadPersist();
    const split = splitCallsign(p.ivaoCallsign);
    set({
      rememberPilot: p.rememberPilot,
      simbriefUser: p.rememberPilot ? p.simbriefUser : "",
      ivaoCallsign: p.rememberPilot ? p.ivaoCallsign : "",
      trainingMode: false,
      draft: {
        ...EMPTY_SIMBRIEF_DRAFT,
        altitude: p.rememberPilot ? p.draft.altitude || "" : "",
        airline: p.rememberPilot ? split.airline : "",
        fltnum: p.rememberPilot ? split.fltnum : "",
      },
    });
  },
}));

if (typeof window !== "undefined") {
  (window as Window & { __dispatch?: typeof useGame }).__dispatch = useGame;
}
