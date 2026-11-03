import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cancelNotification, notifyIn, showOngoing } from "@/services/notifications";

import {
  dayKey,
  FOCUS_DAILY_XP_CAP,
  FOCUS_SESSIONS_PER_SET,
  focusXp,
} from "@/constants/gamification";
import { XPContext } from "@/context/XPContext";

// Ciclo de foco (Pomodoro): foco -> pausa curta, e pausa longa a cada 4 focos.
// O tempo é calculado pelo horário de término (endsAt), então continua certo
// ao trocar de tela ou quando o app volta do segundo plano.

export type Phase = "focus" | "short" | "long";
export type TimerStatus = "idle" | "running" | "paused";

export const FOCUS_PRESETS = [
  { id: "classico", label: "25 / 5", focus: 25, short: 5, long: 15 },
  { id: "profundo", label: "50 / 10", focus: 50, short: 10, long: 20 },
] as const;

export type PresetId = (typeof FOCUS_PRESETS)[number]["id"];

export const PHASE_LABEL: Record<Phase, string> = {
  focus: "Foco",
  short: "Pausa curta",
  long: "Pausa longa",
};

type FocusEvent = {
  kind: "focus-done" | "break-done";
  xp: number; // 0 quando passou do limite diário
  at: number;
};

type FocusContextType = {
  presetId: PresetId;
  phase: Phase;
  status: TimerStatus;
  remainingMs: number;
  durationMs: number;
  setInSet: number; // focos concluídos no conjunto atual (0–3)
  sessionsToday: number;
  xpToday: number; // XP de foco ganho hoje (limite FOCUS_DAILY_XP_CAP)
  sessionXp: number; // quanto vale um foco do preset atual
  lastEvent: FocusEvent | null;
  setPreset: (id: PresetId) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void; // pular não dá XP
};

export const FocusContext = createContext<FocusContextType | null>(null);

const minutes = (m: number) => m * 60 * 1000;

export function FocusProvider({ children }: { children: ReactNode }) {
  const xpContext = useContext(XPContext);
  if (!xpContext) throw new Error("FocusProvider precisa estar dentro do XPProvider");

  const { completeChallenge, history } = xpContext;

  const [presetId, setPresetId] = useState<PresetId>("classico");
  const [phase, setPhase] = useState<Phase>("focus");
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);
  const [setInSet, setSetInSet] = useState(0);
  const [lastEvent, setLastEvent] = useState<FocusEvent | null>(null);
  const [now, setNow] = useState(Date.now());

  const preset = FOCUS_PRESETS.find((p) => p.id === presetId) ?? FOCUS_PRESETS[0];
  const durationMs = minutes(preset[phase]);

  const today = dayKey();
  const focusToday = history.filter((c) => c.id.startsWith(`focus-${today}-`));
  const sessionsToday = focusToday.length;
  const xpToday = focusToday.reduce((sum, c) => sum + c.xp, 0);
  const sessionXp = focusXp(preset.focus);

  const remainingMs =
    status === "running" && endsAt
      ? Math.max(0, endsAt - now)
      : status === "paused" && pausedRemaining !== null
        ? pausedRemaining
        : durationMs;

  // Relógio só roda enquanto o timer está ativo
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [status]);

  // Fim da fase: credita o foco e prepara a próxima fase
  const finishingRef = useRef(false);
  useEffect(() => {
    if (status !== "running" || !endsAt || now < endsAt || finishingRef.current) return;
    finishingRef.current = true;
    cancelNotification("focus-pomodoro"); // tira a notificação fixa; o aviso de fim já tocou

    if (phase === "focus") {
      const n = sessionsToday + 1;
      // XP proporcional à duração, até o limite diário de XP de foco
      const xp = Math.max(0, Math.min(sessionXp, FOCUS_DAILY_XP_CAP - xpToday));
      completeChallenge(
        `focus-${today}-${n}`,
        xp,
        `Ciclo de foco (${preset.focus} min)`,
      );

      const nextInSet = setInSet + 1;
      const isLong = nextInSet >= FOCUS_SESSIONS_PER_SET;
      setSetInSet(isLong ? 0 : nextInSet);
      setPhase(isLong ? "long" : "short");
      setLastEvent({ kind: "focus-done", xp, at: Date.now() });
    } else {
      setPhase("focus");
      setLastEvent({ kind: "break-done", xp: 0, at: Date.now() });
    }

    setStatus("idle");
    setEndsAt(null);
    setPausedRemaining(null);
    finishingRef.current = false;
  }, [
    now,
    endsAt,
    status,
    phase,
    sessionsToday,
    sessionXp,
    xpToday,
    preset.focus,
    setInSet,
    today,
    completeChallenge,
  ]);

  // Modo foco na barra de notificações: fica fixo enquanto conta e avisa no fim
  const stopFocusNotifications = () => {
    cancelNotification("focus-pomodoro");
    cancelNotification("focus-pomodoro-fim");
  };

  const start = () => {
    const base = status === "paused" && pausedRemaining !== null ? pausedRemaining : durationMs;
    setNow(Date.now());
    setEndsAt(Date.now() + base);
    setPausedRemaining(null);
    setStatus("running");
    const end = new Date(Date.now() + base).toTimeString().slice(0, 5);
    const label = phase === "focus" ? "Modo foco" : "Pausa";
    showOngoing("focus-pomodoro", label, `Termina às ${end}. Evite o celular até lá.`);
    notifyIn("focus-pomodoro-fim", base / 1000, `${label}: tempo acabou`, phase === "focus" ? "Bom trabalho! Hora da pausa." : "Bora voltar ao foco?");
  };

  const pause = () => {
    if (status !== "running" || !endsAt) return;
    setPausedRemaining(Math.max(0, endsAt - Date.now()));
    setEndsAt(null);
    setStatus("paused");
    stopFocusNotifications();
  };

  const reset = () => {
    setStatus("idle");
    setEndsAt(null);
    setPausedRemaining(null);
    stopFocusNotifications();
  };

  const skip = () => {
    reset();
    setPhase((p) => (p === "focus" ? "short" : "focus"));
  };

  const setPreset = (id: PresetId) => {
    if (status === "running") return; // não troca no meio de uma sessão
    setPresetId(id);
    reset();
  };

  return (
    <FocusContext.Provider
      value={{
        presetId,
        phase,
        status,
        remainingMs,
        durationMs,
        setInSet,
        sessionsToday,
        xpToday,
        sessionXp,
        lastEvent,
        setPreset,
        start,
        pause,
        reset,
        skip,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function formatTimer(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
