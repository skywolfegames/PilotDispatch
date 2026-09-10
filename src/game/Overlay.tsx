import { useEffect } from "react";
import {
  Check,
  ChevronRight,
  CloudSun,
  DoorOpen,
  Globe,
  LoaderCircle,
  Lock,
  Pause,
  Plane,
  Radio,
  RotateCcw,
  X,
} from "lucide-react";
import { fetchSimbriefOfpBrowser, watchIvaoCallsign } from "@/lib/ofp-api";
import { cn } from "@/lib/utils";
import { gameInput } from "./input";
import { buildIvaoFlightPlanUrl, splitCallsign } from "./ofp";
import { MetarPanel } from "./MetarPanel";
import { MissionCompass } from "./MissionCompass";
import { BootScreen } from "./BootScreen";
import { SimbriefSheet } from "./SimbriefSheet";
import { TowersPanel } from "./TowersPanel";
import { WebeyePanel } from "./WebeyePanel";
import { useGame } from "./store";

export function Overlay() {
  const phase = useGame((s) => s.phase);
  const nearby = useGame((s) => s.nearby);
  const ofp = useGame((s) => s.ofp);
  const banner = useGame((s) => s.banner);
  const pollingOfp = useGame((s) => s.pollingOfp);
  const pollingIvao = useGame((s) => s.pollingIvao);
  const simbriefUser = useGame((s) => s.simbriefUser);
  const simbriefSheet = useGame((s) => s.simbriefSheet);
  const webeyeOpen = useGame((s) => s.webeyeOpen);
  const metarOpen = useGame((s) => s.metarOpen);
  const towersOpen = useGame((s) => s.towersOpen);
  const promptDismissed = useGame((s) => s.promptDismissed);
  const ivaoCallsign = useGame((s) => s.ivaoCallsign);

  useEffect(() => {
    const onInteract = () => {
      const s = useGame.getState();
      if (s.phase !== "playing" || s.simbriefSheet || s.webeyeOpen || s.metarOpen || s.towersOpen) return;
      if (s.nearby === "simbrief") s.openSimbriefSheet();
      if (s.nearby === "ivao") handleIvao();
      if (s.nearby === "door") s.releaseDoor();
      if (s.nearby === "webeye") s.openWebeye();
      if (s.nearby === "metar") s.openMetar();
      if (s.nearby === "towers") s.openTowers();
    };
    gameInput.onInteract = onInteract;
    window.addEventListener("galeao-interact", onInteract);
    return () => {
      if (gameInput.onInteract === onInteract) gameInput.onInteract = null;
      window.removeEventListener("galeao-interact", onInteract);
    };
  }, []);

  useEffect(() => {
    if (!pollingOfp) return;
    let stop = false;
    const tick = async () => {
      const s = useGame.getState();
      if (s.trainingMode) {
        if (s.ofp) return;
        await new Promise((r) => setTimeout(r, 1400));
        if (!stop) s.injectTrainingOfp();
        return;
      }
      if (!s.simbriefUser) {
        if (!s.ofp) s.setOfpError("Informe o Pilot ID do SimBrief na tela inicial.");
        return;
      }
      try {
        const result = await fetchSimbriefOfpBrowser(s.simbriefUser);
        if (stop) return;
        if (!s.ofpArmed) return;
        if (result.ok && result.ofp) {
          if (!useGame.getState().ofpBaseline) {
            useGame.getState().captureOfpBaseline(result.ofp);
            return;
          }
          s.setOfp(result.ofp);
        } else if (!s.ofp) {
          if (!useGame.getState().ofpBaseline) useGame.getState().captureOfpBaseline(null);
          s.setOfpError(result.error ?? "Aguardando OFP…");
        }
      } catch {
        if (!stop && !useGame.getState().ofp) s.setOfpError("Falha ao consultar o SimBrief.");
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [pollingOfp, simbriefUser]);

  useEffect(() => {
    if (!pollingIvao || !ofp) return;
    let stop = false;
    const tick = async () => {
      const s = useGame.getState();
      const callsign = (s.ivaoCallsign || ofp.callsign).toUpperCase();
      if (!callsign) return;
      const result = await watchIvaoCallsign({ data: { callsign } });
      if (stop) return;
      if (result.ok && result.online) s.setIvaoOnline(true);
      else if (!result.ok) s.setIvaoError(result.error ?? "IVAO indisponível");
    };
    void tick();
    const id = window.setInterval(() => void tick(), 6000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [pollingIvao, ofp]);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => useGame.getState().setBanner(null), 4200);
    return () => window.clearTimeout(id);
  }, [banner]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 font-sans text-fg">
      {phase === "boot" && <BootScreen />}
      {phase === "start" && <StartScreen />}
      {phase === "paused" && <PauseScreen />}
      {phase === "complete" && <CompleteScreen />}
      {(phase === "playing" || phase === "paused") && <Hud />}
      {(phase === "playing" || phase === "paused" || phase === "complete") && <LogoutButton />}
      {phase === "playing" && nearby && !simbriefSheet && !webeyeOpen && !metarOpen && !towersOpen && !promptDismissed && (
        <InteractPrompt />
      )}
      {phase === "playing" && !simbriefSheet && !webeyeOpen && !metarOpen && !towersOpen && <MissionCompass />}
      {phase === "playing" && <TouchControls />}
      {phase === "playing" && <SimbriefSheet />}
      {phase === "playing" && <WebeyePanel />}
      {phase === "playing" && <MetarPanel />}
      {phase === "playing" && <TowersPanel />}
      {phase === "playing" && ofp && (
        <a
          id="galeao-ivao-fpl"
          href={buildIvaoFlightPlanUrl({
            ...ofp,
            callsign: ivaoCallsign || ofp.callsign,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden"
          tabIndex={-1}
        >
          IVAO FPL
        </a>
      )}
      {banner && phase === "playing" && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-20 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-border bg-surface px-5 py-3 text-center shadow-lg">
          <p className="font-mono text-xs tracking-[0.18em] text-ok uppercase">{banner}</p>
        </div>
      )}
    </div>
  );
}

function handleSimbrief() {
  useGame.getState().openSimbriefSheet();
}

let lastIvaoOpenAt = 0;

function handleIvao() {
  const s = useGame.getState();
  if (!s.ofp) {
    s.setBanner("Detecte o OFP no SimBrief antes de abrir a IVAO");
    return;
  }
  s.markIvaoVisit();
  const now = Date.now();
  if (now - lastIvaoOpenAt < 900) return;
  lastIvaoOpenAt = now;
  const url = buildIvaoFlightPlanUrl({
    ...s.ofp,
    callsign: s.ivaoCallsign || s.ofp.callsign,
  });
  const link = document.getElementById("galeao-ivao-fpl");
  if (link instanceof HTMLAnchorElement) {
    link.href = url;
    link.click();
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  s.setBanner("Plano de voo IVAO aberto");
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  mono,
  inputMode,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
  inputMode?: "numeric" | "text" | "tel" | "email";
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        inputMode={inputMode}
        className={cn(
          "h-11 w-full rounded-md border border-border bg-raised px-3 text-sm text-fg placeholder:text-subtle outline-none",
          "transition-[border-color,box-shadow] duration-200 ease-smooth-out",
          "focus:border-border-strong focus:ring-2 focus:ring-accent/30",
          mono && "font-mono tracking-wider",
        )}
      />
      {hint ? <span className="mt-1.5 block text-xs leading-relaxed text-subtle">{hint}</span> : null}
    </label>
  );
}

function StartScreen() {
  const simbriefUser = useGame((s) => s.simbriefUser);
  const ivaoCallsign = useGame((s) => s.ivaoCallsign);
  const rememberPilot = useGame((s) => s.rememberPilot);
  const enter = useGame((s) => s.enterTerminal);
  const split = splitCallsign(ivaoCallsign);

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-t from-bg via-bg/75 to-bg/20 p-4 pt-16 sm:p-8">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-xl sm:p-7">
        <p className="font-mono text-[11px] tracking-[0.22em] text-accent uppercase">SBGL · Terminal 2</p>
        <h1 className="mt-2 font-sans text-3xl font-semibold tracking-[-0.03em] text-fg sm:text-4xl">
          Pilot Dispatch
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Caminhe pelo terminal, abra o SimBrief no guichê de planejamento e, quando o OFP for
          detectado, siga para o briefing da IVAO.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Field
            id="simbrief-user"
            label="Pilot ID SimBrief"
            value={simbriefUser}
            onChange={useGame.getState().setSimbriefUser}
            placeholder="Pilot ID"
            mono
            inputMode="numeric"
            hint="Account Settings → Pilot ID"
          />
          <Field
            id="ivao-csgn"
            label="Callsign"
            value={ivaoCallsign}
            onChange={useGame.getState().setIvaoCallsign}
            placeholder="Callsign"
            mono
            hint="Companhia + número do voo, na mesma ordem do SimBrief."
          />
        </div>
        {split.airline ? (
          <p className="mt-2 font-mono text-xs text-ok">
            Cia {split.airline} · Voo {split.fltnum}
          </p>
        ) : null}

        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-raised px-3 py-2">
          <input
            type="checkbox"
            checked={rememberPilot}
            onChange={(e) => useGame.getState().setRememberPilot(e.target.checked)}
            className="size-4 shrink-0 rounded-sm border-border accent-accent"
          />
          <span className="text-sm text-fg">Gravar Pilot ID e callsign neste dispositivo</span>
        </label>

        <button
          type="button"
          data-qa="start"
          onClick={enter}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-fg px-4 text-sm font-semibold text-accent-fg transition-transform duration-150 ease-smooth-out hover:opacity-90 active:scale-[0.98]"
        >
          Entrar no terminal
          <ChevronRight className="size-4" />
        </button>

        <p className="mt-4 text-xs leading-relaxed text-subtle">
          WASD andar · Shift correr · mouse olhar · E interagir · CTRL libera o mouse para clicar nos
          painéis. No celular, use o joystick e o botão de ação.
        </p>
      </div>
    </div>
  );
}

function PauseScreen() {
  const resume = useGame((s) => s.resume);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2 text-muted">
          <Pause className="size-4" />
          <p className="font-mono text-xs tracking-[0.18em] uppercase">Pausado</p>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Briefing em espera</h2>
        <button
          type="button"
          onClick={resume}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-fg text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function CompleteScreen() {
  const ofp = useGame((s) => s.ofp);
  const replay = useGame((s) => s.replay);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg/65 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 sm:p-8">
        <p className="font-mono text-[11px] tracking-[0.2em] text-ok uppercase">Missão concluída</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Voo pronto para a rede</h2>
        {ofp && (
          <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-sm">
            <div>
              <dt className="text-[11px] text-subtle uppercase">Origem</dt>
              <dd>{ofp.origin}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-subtle uppercase">Destino</dt>
              <dd>{ofp.destination}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] text-subtle uppercase">Callsign</dt>
              <dd>{ofp.callsign}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] text-subtle uppercase">SID</dt>
              <dd>{formatProc(ofp.sid, ofp.sidTrans)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] text-subtle uppercase">STAR</dt>
              <dd>{formatProc(ofp.star, ofp.starTrans)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-subtle uppercase">Nível</dt>
              <dd>{ofp.altitude || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-subtle uppercase">Distância</dt>
              <dd>{ofp.distanceNm || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-subtle uppercase">ETE</dt>
              <dd>{ofp.ete || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-subtle uppercase">ETA</dt>
              <dd>{ofp.eta || ofp.ete || "—"}</dd>
            </div>
          </dl>
        )}
        <button
          type="button"
          onClick={replay}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-fg text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          <RotateCcw className="size-4" />
          Nova preparação
        </button>
        <p className="mt-3 text-center text-xs text-subtle">Volta ao spawn com a missão zerada. Pilot ID e callsign seguem os mesmos.</p>
      </div>
    </div>
  );
}

function Hud() {
  const visitedSimbrief = useGame((s) => s.visitedSimbrief);
  const visitedIvao = useGame((s) => s.visitedIvao);
  const ofp = useGame((s) => s.ofp);
  const ivaoOnline = useGame((s) => s.ivaoOnline);
  const doorReleased = useGame((s) => s.doorReleased);
  const pollingOfp = useGame((s) => s.pollingOfp);
  const pollingIvao = useGame((s) => s.pollingIvao);
  const ofpError = useGame((s) => s.ofpError);
  const simbriefUser = useGame((s) => s.simbriefUser);
  const lookMode = useGame((s) => s.lookMode);

  const steps = [
    { done: visitedSimbrief, label: "Ir ao balcão SimBrief" },
    { done: Boolean(ofp), label: "Criar plano de voo" },
    { done: ivaoOnline, label: "Ativar voo na IVAO" },
    { done: doorReleased, label: "Abrir porta dos saguões" },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <>
      <aside className="pointer-events-none absolute top-4 left-4 w-[min(92vw,280px)] rounded-xl border border-border bg-surface/95 p-4">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Missão</p>
        <ul className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  "mt-0.5 grid size-4 place-items-center rounded-full border",
                  step.done ? "border-ok bg-ok text-accent-fg" : i === current ? "border-accent text-accent" : "border-border-strong text-subtle",
                )}
              >
                {step.done ? <Check className="size-2.5" strokeWidth={3} /> : i === current ? "▸" : null}
              </span>
              <span className={step.done ? "text-fg" : i === current ? "text-fg" : "text-muted"}>{step.label}</span>
            </li>
          ))}
        </ul>
        {pollingOfp && !ofp && (
          <p className="mt-3 flex items-center gap-2 text-xs text-accent">
            <LoaderCircle className="size-3.5 animate-spin" />
            {simbriefUser ? "Aguardando um OFP novo…" : "Aguardando plano…"}
          </p>
        )}
        {pollingOfp && ofp && ofp.source === "simbrief" && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <LoaderCircle className="size-3.5 animate-spin" />
            Vigilando um OFP novo…
          </p>
        )}
        {ofpError && !ofp && <p className="mt-2 text-xs text-warn">{ofpError}</p>}
        {pollingIvao && !ivaoOnline && (
          <p className="mt-3 flex items-center gap-2 text-xs text-accent">
            <LoaderCircle className="size-3.5 animate-spin" />
            Observando a rede IVAO…
          </p>
        )}
      </aside>

      {ofp && (
        <section className="pointer-events-none absolute top-4 right-4 hidden w-[240px] rounded-xl border border-border bg-surface/95 p-4 sm:block">
          <p className="font-mono text-[11px] tracking-[0.18em] text-ok uppercase">Plano detectado</p>
          <dl className="mt-3 space-y-1.5 font-mono text-sm">
            <Row k="Origem" v={ofp.origin} />
            <Row k="Destino" v={ofp.destination} />
            <Row k="Callsign" v={ofp.callsign} />
            <Row k="Aeronave" v={ofp.aircraft} />
            {ofp.altitude ? <Row k="Nível" v={ofp.altitude} /> : null}
            {ofp.sid || ofp.sidTrans ? <Row k="SID" v={formatProc(ofp.sid, ofp.sidTrans)} /> : null}
            {ofp.star || ofp.starTrans ? <Row k="STAR" v={formatProc(ofp.star, ofp.starTrans)} /> : null}
            {ofp.distanceNm ? <Row k="Dist" v={ofp.distanceNm} /> : null}
            {ofp.ete ? <Row k="ETE" v={ofp.ete} /> : null}
            {ofp.eta ? <Row k="ETA" v={ofp.eta} /> : null}
            <Row k="PAX" v={String(ofp.personsOnBoard ?? 0)} />
            <Row k="OFP" v={ofp.requestId} />
          </dl>
          <p className="mt-3 text-xs text-muted">
            {doorReleased
              ? "Porta entre os saguões liberada."
              : ivaoOnline
                ? "Aperte E no botão da parede, no lado IVAO da porta."
                : visitedIvao
                  ? "Confirme o envio no balcão IVAO."
                  : "Siga pelo corredor até o briefing IVAO."}
          </p>
        </section>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 hidden items-center gap-2 rounded-lg border border-border bg-surface/90 px-3 py-2 font-mono text-[11px] tracking-wide text-muted uppercase sm:flex">
        <Plane className="size-3.5 text-accent" />
        SBGL
        <span className="text-subtle">Galeão</span>
        <span className="text-subtle">·</span>
        <span className={lookMode === "lock" ? "text-fg" : "text-ok"}>
          {lookMode === "lock" ? "CTRL mouse" : "Mouse livre"}
        </span>
      </div>
    </>
  );
}

function formatProc(ident?: string, trans?: string): string {
  const id = (ident ?? "").trim().toUpperCase();
  const tr = (trans ?? "").trim().toUpperCase();
  if (id && tr) return `${id} via ${tr}`;
  return id || tr || "—";
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-subtle">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </div>
  );
}

function InteractPrompt() {
  const nearby = useGame((s) => s.nearby);
  const ofp = useGame((s) => s.ofp);
  const ivaoOnline = useGame((s) => s.ivaoOnline);
  const dismiss = useGame((s) => s.dismissPrompt);
  const lockedIvao = nearby === "ivao" && !ofp;

  const title =
    nearby === "simbrief"
      ? "Planejamento de voo"
      : nearby === "door"
        ? "Porta dos saguões"
        : nearby === "webeye"
          ? "Telão WebEye"
          : nearby === "metar"
            ? "Totem METAR"
            : nearby === "towers"
              ? "Telão de torres"
              : "Briefing IVAO";
  const body =
    nearby === "simbrief"
      ? "Abre a prancheta de briefing. GERAR LINK URL manda o voo para o dispatch custom do SimBrief."
      : nearby === "door"
        ? "Botão na parede interna do saguão IVAO. Aperte E para abrir a porta entre os dois halls."
        : nearby === "webeye"
          ? "Abre o mapa ao vivo da IVAO no telão. Mouse livre para navegar. Esc fecha."
          : nearby === "metar"
            ? "Consulta METAR ao vivo. Digite o ICAO de 4 letras do aeroporto."
            : nearby === "towers"
              ? "Lista as torres IVAO online, por continente e região, com frequência e ATIS."
              : lockedIvao
              ? "A porta de ops só abre depois que o OFP for detectado."
              : "Abre o plano pré-preenchido na IVAO e confirma o envio. Depois, libere a porta.";

  const actionLabel =
    nearby === "simbrief"
      ? "Abrir prancheta"
      : nearby === "door"
        ? "Abrir porta"
        : nearby === "webeye"
          ? "Abrir WebEye"
          : nearby === "metar"
            ? "Consultar METAR"
            : nearby === "towers"
              ? "Abrir torres"
              : "Abrir IVAO";

  return (
    <div className="pointer-events-auto absolute bottom-28 left-1/2 w-[min(92vw,380px)] -translate-x-1/2 rounded-xl border border-border bg-surface p-4 sm:bottom-8">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 grid size-11 place-items-center rounded-md text-muted hover:text-fg"
        aria-label="Fechar"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <span className="grid size-10 place-items-center rounded-md bg-raised text-accent">
          {lockedIvao ? (
            <Lock className="size-4" />
          ) : nearby === "simbrief" ? (
            <Plane className="size-4" />
          ) : nearby === "door" ? (
            <DoorOpen className="size-4" />
          ) : nearby === "webeye" ? (
            <Globe className="size-4" />
          ) : nearby === "metar" ? (
            <CloudSun className="size-4" />
          ) : nearby === "towers" ? (
            <Radio className="size-4" />
          ) : (
            <Radio className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-subtle uppercase">
            E no teclado · CTRL libera o mouse para clicar
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {nearby === "towers" ? (
          <button
            type="button"
            onClick={() => useGame.getState().openTowers()}
            className="inline-flex h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg bg-fg px-3 text-sm font-semibold text-accent-fg"
          >
            <span className="hidden font-mono text-[11px] tracking-wider sm:inline">E</span>
            Abrir torres
          </button>
        ) : nearby === "metar" ? (
          <button
            type="button"
            onClick={() => useGame.getState().openMetar()}
            className="inline-flex h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg bg-fg px-3 text-sm font-semibold text-accent-fg"
          >
            <span className="hidden font-mono text-[11px] tracking-wider sm:inline">E</span>
            Consultar METAR
          </button>
        ) : nearby === "webeye" ? (
          <button
            type="button"
            onClick={() => useGame.getState().openWebeye()}
            className="inline-flex h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg bg-fg px-3 text-sm font-semibold text-accent-fg"
          >
            <span className="hidden font-mono text-[11px] tracking-wider sm:inline">E</span>
            Abrir WebEye
          </button>
        ) : nearby === "simbrief" ? (
          <button
            type="button"
            onClick={() => useGame.getState().openSimbriefSheet()}
            className="inline-flex h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg bg-fg px-3 text-sm font-semibold text-accent-fg"
          >
            <span className="hidden font-mono text-[11px] tracking-wider sm:inline">E</span>
            Abrir prancheta
          </button>
        ) : nearby === "ivao" && ofp && !lockedIvao ? (
          <a
            href={buildIvaoFlightPlanUrl(ofp)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => useGame.getState().markIvaoVisit()}
            className="inline-flex h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg bg-fg px-3 text-sm font-semibold text-accent-fg"
          >
            <span className="hidden font-mono text-[11px] tracking-wider sm:inline">E</span>
            Abrir IVAO
          </a>
        ) : (
          <button
            type="button"
            disabled={Boolean(lockedIvao)}
            onClick={() => window.dispatchEvent(new CustomEvent("galeao-interact"))}
            className="inline-flex h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-lg bg-fg px-3 text-sm font-semibold text-accent-fg disabled:opacity-40"
          >
            <span className="hidden font-mono text-[11px] tracking-wider sm:inline">E</span>
            {actionLabel}
          </button>
        )}
        {nearby === "ivao" && ofp && !ivaoOnline && (
          <button
            type="button"
            onClick={() => useGame.getState().confirmIvao()}
            className="h-11 rounded-lg border border-border px-3 text-sm font-medium text-fg"
          >
            Confirmar envio
          </button>
        )}
      </div>
    </div>
  );
}

function LogoutButton() {
  const logout = useGame((s) => s.logout);
  return (
    <button
      type="button"
      onClick={() => {
        document.exitPointerLock?.();
        logout();
      }}
      className="pointer-events-auto absolute right-4 bottom-36 z-40 min-h-11 rounded-md border-2 border-[#c45c5c] bg-surface/95 px-4 font-mono text-xs font-semibold tracking-[0.18em] text-[#c45c5c] uppercase shadow-lg sm:bottom-4"
    >
      Logout
    </button>
  );
}

function TouchControls() {
  const phase = useGame((s) => s.phase);
  if (phase !== "playing") return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 sm:hidden">
      <div className="flex items-end justify-between gap-4">
        <Joystick />
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              gameInput.sprintTouch = true;
            }}
            onPointerUp={() => {
              gameInput.sprintTouch = false;
            }}
            onPointerCancel={() => {
              gameInput.sprintTouch = false;
            }}
            className="h-12 min-w-16 rounded-lg border border-border bg-surface/90 px-3 text-xs font-semibold uppercase tracking-wide text-fg"
          >
            Shift
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              gameInput.queueInteract();
              window.dispatchEvent(new CustomEvent("galeao-interact"));
            }}
            className="h-14 min-w-16 rounded-lg bg-fg px-3 text-sm font-semibold text-accent-fg"
          >
            E
          </button>
        </div>
      </div>
    </div>
  );
}

function Joystick() {
  return (
    <div
      className="pointer-events-auto relative size-28 touch-none rounded-full border border-border bg-surface/80"
      onPointerDown={(e) => {
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const rect = el.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        gameInput.joyX = Math.max(-1, Math.min(1, nx));
        gameInput.joyY = Math.max(-1, Math.min(1, ny));
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        gameInput.joyX = Math.max(-1, Math.min(1, nx));
        gameInput.joyY = Math.max(-1, Math.min(1, ny));
      }}
      onPointerUp={() => {
        gameInput.joyX = 0;
        gameInput.joyY = 0;
      }}
      onPointerCancel={() => {
        gameInput.joyX = 0;
        gameInput.joyY = 0;
      }}
    >
      <span className="absolute inset-8 rounded-full border border-border-strong/60" />
    </div>
  );
}
