import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { CATALOG_BY_ID } from "@/constants/challenges";
import { dayKey } from "@/constants/gamification";
import {
  MONTHLY_MID_PHRASES,
  MONTHLY_START_PHRASES,
  MORNING_PHRASES,
  pickPhrase,
  WEEKLY_PHRASES,
} from "@/constants/motivation";
import { featureOf, TaskModule } from "@/constants/taskFeatures";
import { RoutineContext } from "@/context/RoutineContext";
import {
  cancelNotification,
  ensurePermission,
  notifyIn,
  Reminder,
  showOngoing,
  syncReminders,
} from "@/services/notifications";
import { loadJSON, saveJSON } from "@/utils/localStore";

// Funcionalidades das tarefas da rotina (lista do grupo): lembretes,
// cronômetros, anotações, gratidões, flashcards, pessoas, 3 prioridades,
// tarefas pendentes, sono, medições e anexos.
// O XP continua saindo da rotina (RoutineContext -> XPContext), sem 2ª fonte.
// Salvo LOCALMENTE neste aparelho, por usuário.

export type ReminderSetting = { on: boolean; time: string; weekday?: number };
export type SleepSettings = { bedtime: string; wake: string };
// Lembretes gerais: resumo do dia, aviso do que falta à noite,
// e "reveja seus objetivos" para as semanais e mensais
export type DigestSettings = {
  on: boolean;
  morning: string | null; // "08:00" ou null (desligado)
  evening: string | null; // "20:00": só chega se faltar tarefa do dia
  weeklyDay: number; // 0 = domingo ... 6 = sábado
  weeklyTime: string;
  monthly: boolean; // dia 1 e dia 20
};
// Despertador de "Acordar no horário planejado" (toca no horário de "Meu sono")
export type AlarmSettings = {
  on: boolean;
  soundUri: string | null; // música escolhida do aparelho (null = toque do Focus)
  soundName: string | null;
  playlistUrl: string; // link do Spotify/YouTube para abrir ao acordar
  snoozeMin: number;
};
export const DEFAULT_ALARM: AlarmSettings = { on: false, soundUri: null, soundName: null, playlistUrl: "", snoozeMin: 5 };

export const DEFAULT_DIGEST: DigestSettings = {
  on: false,
  morning: "08:00",
  evening: "20:00",
  weeklyDay: 1,
  weeklyTime: "09:00",
  monthly: true,
};

export type Entry = { id: string; taskId: string; title: string; text: string; at: number; editedAt?: number };
export type Flashcard = {
  id: string;
  front: string;
  back: string;
  summaryId: string | null;
  createdAt: number;
  editedAt?: number;
};
export type CardReview = { id: string; cardId: string; day: string; ok: boolean };
export type Person = { id: string; name: string };
export type PersonLog = { id: string; taskId: string; personId: string; day: string; at: number };
export type TodoItem = { text: string; done: boolean };
export type BacklogItem = { id: string; title: string; due: string | null; createdAt: number; doneAt: number | null };
export type SleepLog = { day: string; slept: string; woke: string; hours: number };
export type MetricLog = { taskId: string; day: string; value: number };
export type Attachment = { id: string; taskId: string; uri: string; name: string; kind: "image" | "document"; at: number };
export type TimerState = { day: string; elapsedMs: number; startedAt: number | null };

type Saved = {
  reminders: Record<string, ReminderSetting>;
  sleep: SleepSettings | null;
  timers: Record<string, TimerState>;
  entries: Entry[];
  cards: Flashcard[];
  reviews: CardReview[];
  people: Person[];
  personLogs: PersonLog[];
  todos: Record<string, TodoItem[]>; // dia -> 3 prioridades
  backlog: BacklogItem[];
  sleepLogs: SleepLog[];
  metrics: MetricLog[];
  attachments: Attachment[];
  reminderTipClosed: boolean; // aviso "suas tarefas têm lembrete" fechado
  digest: DigestSettings;
  alarm: AlarmSettings;
  alarmHandled: string | null; // "AAAA-MM-DD HH:MM" do último toque parado/adiado
  alarmSnoozeUntil: number | null;
};

const EMPTY: Saved = {
  reminderTipClosed: false,
  digest: DEFAULT_DIGEST,
  alarm: DEFAULT_ALARM,
  alarmHandled: null,
  alarmSnoozeUntil: null,
  reminders: {},
  sleep: null,
  timers: {},
  entries: [],
  cards: [],
  reviews: [],
  people: [],
  personLogs: [],
  todos: {},
  backlog: [],
  sleepLogs: [],
  metrics: [],
  attachments: [],
};

const key = (uid: string) => `focus:v1:${uid}:tarefas-extras`;

// Aceita o que veio salvo e completa campos novos com o padrão
function isSaved(value: unknown): value is Partial<Saved> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const newId = (prefix: string) => `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function shiftTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Horas entre dormir e acordar (passando da meia-noite)
export function sleepHours(slept: string, woke: string) {
  const [sh, sm] = slept.split(":").map(Number);
  const [wh, wm] = woke.split(":").map(Number);
  let diff = wh * 60 + wm - (sh * 60 + sm);
  if (diff <= 0) diff += 1440;
  return Math.round((diff / 60) * 10) / 10;
}

// Horário do lembrete das tarefas de sono, a partir de "Meu sono"
export function sleepReminderTime(taskId: string, sleep: SleepSettings) {
  switch (taskId) {
    case "son-horario":
      return sleep.bedtime;
    case "son-tela":
      return shiftTime(sleep.bedtime, -30);
    case "son-acordar":
      return sleep.wake;
    case "cas-cama":
      return shiftTime(sleep.wake, 30);
    default:
      return shiftTime(sleep.wake, 15); // "Dormir 8 horas": registrar ao acordar
  }
}

// Palavras curtas e comuns não entram em "mais citadas"
const STOPWORDS = new Set(
  "para pela pelo com sem que uma umas uns por mais muito muita minha meu meus minhas hoje dia ter tive estar esta este isso essa esse aqui como quando onde porque tambem sobre entre depois antes ainda pode poder".split(
    " ",
  ),
);

export function topWords(texts: string[], limit = 5) {
  const count = new Map<string, number>();
  texts.forEach((t) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .forEach((w) => count.set(w, (count.get(w) ?? 0) + 1)),
  );
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, n]) => ({ word, n }));
}

// Minutos do cronômetro de uma tarefa (timer ou leitura por tempo)
export function timerMinutes(taskId: string) {
  const m = featureOf(taskId).modules.find(
    (x): x is Extract<TaskModule, { minutes: number }> => "minutes" in x,
  );
  return m?.minutes ?? null;
}

type TaskExtrasContextType = Saved & {
  ready: boolean;
  today: string;
  // Conclui o desafio da rotina (devolve XP ganho, 0 se já estava feito)
  complete: (taskId: string) => number;
  // Lembretes
  setReminder: (taskId: string, setting: ReminderSetting) => Promise<string | null>;
  reminderTime: (taskId: string) => string | null;
  // Liga o lembrete de várias tarefas no horário sugerido (pede permissão 1x)
  enableReminders: (taskIds: string[]) => Promise<string | null>;
  closeReminderTip: () => void;
  setDigest: (digest: DigestSettings) => Promise<string | null>;
  setAlarm: (alarm: AlarmSettings) => Promise<string | null>;
  // Despertador tocando agora (horário de acordar ou fim da soneca)
  alarmRinging: boolean;
  stopAlarm: () => void;
  snoozeAlarm: () => void;
  setSleep: (sleep: SleepSettings) => string | null;
  snooze: (minutes: number) => void;
  // Cronômetro
  timerElapsed: (taskId: string, now?: number) => number;
  startTimer: (taskId: string) => void;
  pauseTimer: (taskId: string) => void;
  resetTimer: (taskId: string) => void;
  // Anotações
  addEntry: (taskId: string, title: string, text: string) => string | null;
  removeEntry: (id: string) => void;
  // Editar depois de feito: não dá XP de novo (a conclusão já foi registrada)
  updateEntry: (id: string, title: string, text: string) => string | null;
  entriesOf: (taskId: string, day?: string) => Entry[];
  // Flashcards
  addCard: (front: string, back: string, summaryId?: string | null) => string | null;
  updateCard: (id: string, front: string, back: string) => string | null;
  removeCard: (id: string) => void;
  reviewCard: (cardId: string, ok: boolean) => void;
  reviewsToday: number;
  // Pessoas
  addPerson: (name: string) => string | null;
  removePerson: (id: string) => void;
  logPerson: (taskId: string, personId: string) => void;
  // 3 prioridades
  todosToday: TodoItem[];
  setTodoText: (index: number, text: string) => void;
  toggleTodo: (index: number) => void;
  // Tarefas pendentes
  addBacklog: (title: string, due: string | null) => string | null;
  finishBacklog: (id: string) => void;
  removeBacklog: (id: string) => void;
  // Sono e medições
  logSleep: (slept: string, woke: string) => string | null;
  logMetric: (taskId: string, value: number) => void;
  metricToday: (taskId: string) => number | null;
  // Anexos
  addAttachment: (taskId: string, uri: string, name: string, kind: Attachment["kind"]) => string | null;
  removeAttachment: (id: string) => void;
};

export const TaskExtrasContext = createContext<TaskExtrasContextType | null>(null);

export function TaskExtrasProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const routine = useContext(RoutineContext);
  const [data, setData] = useState<Saved>(EMPTY);
  const [ready, setReady] = useState(!uid);
  const [now, setNow] = useState(Date.now());
  const today = dayKey(new Date(now));

  // Espelho síncrono (critérios logo após uma ação)
  const ref = useRef<Saved>(EMPTY);
  const update = (fn: (d: Saved) => Saved) => {
    ref.current = fn(ref.current);
    setData(ref.current);
  };

  useEffect(() => {
    if (!uid) return;
    let active = true;
    loadJSON(key(uid), isSaved).then((saved) => {
      if (!active) return;
      if (saved) {
        ref.current = {
          ...EMPTY,
          ...saved,
          digest: { ...DEFAULT_DIGEST, ...(saved.digest ?? {}) },
          alarm: { ...DEFAULT_ALARM, ...(saved.alarm ?? {}) },
        };
        setData(ref.current);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    saveJSON(key(uid), data);
  }, [uid, ready, data]);

  // ---------- Conclusão (sempre pela rotina) ----------

  const complete = (taskId: string) => {
    const task = routine?.tasks.find((t) => t.id === taskId);
    if (!task || routine?.isDone(task)) return 0;
    return routine?.completeTask(task).gained ?? 0;
  };

  // ---------- Lembretes ----------

  const reminderTimeFrom = (d: Saved, taskId: string) => {
    if (featureOf(taskId).reminder === "sleep") {
      return d.sleep ? sleepReminderTime(taskId, d.sleep) : null;
    }
    return d.reminders[taskId]?.time ?? (featureOf(taskId).reminder as string);
  };

  const reminderTime = (taskId: string) => reminderTimeFrom(data, taskId);

  // Reagenda tudo que está ligado e ainda está na rotina
  // Na barra de notificações só entram as DIÁRIAS, uma a uma;
  // semanais e mensais recebem o "reveja seus objetivos" (digest)
  const routineTasks = routine?.tasks ?? [];
  const routineIds = routineTasks.map((t) => t.id).join(",");
  const pendingToday = routineTasks
    .filter((t) => t.frequency === "daily" && !routine?.isDone(t))
    .map((t) => t.title);
  const pendingKey = pendingToday.join("|");
  useEffect(() => {
    if (!ready) return;
    const list: Reminder[] = [];
    routineTasks
      .filter((t) => t.frequency === "daily")
      .forEach(({ id: taskId }) => {
        const setting = data.reminders[taskId];
        const time = reminderTimeFrom(data, taskId);
        if (!setting?.on || !time) return;
        const [hour, minute] = time.split(":").map(Number);
        const title = CATALOG_BY_ID[taskId]?.title ?? "Focus";
        list.push({
          id: `focus-rem-${taskId}`,
          title: title,
          body: "Hora do seu desafio no Focus.",
          hour,
          minute,
        });
      });

    const g = data.digest;
    if (g.on) {
      const at = (time: string) => time.split(":").map(Number) as [number, number];
      const daily = routineTasks.filter((t) => t.frequency === "daily");
      const longer = routineTasks.filter((t) => t.frequency !== "daily");
      const preview = (titles: string[]) =>
        titles.slice(0, 3).join(", ") + (titles.length > 3 ? ` e mais ${titles.length - 3}` : "");

      if (g.morning && daily.length) {
        const [hour, minute] = at(g.morning);
        list.push({
          id: "focus-rem-digest-manha",
          title: `${pickPhrase(MORNING_PHRASES)} ${daily.length} tarefa${daily.length > 1 ? "s" : ""}`,
          body: preview(daily.map((t) => t.title)),
          hour,
          minute,
        });
      }
      // Aviso da noite: só hoje, e só se ainda faltar alguma (reagenda a cada conclusão)
      if (g.evening && pendingToday.length) {
        const [hour, minute] = at(g.evening);
        const when = new Date();
        when.setHours(hour, minute, 0, 0);
        list.push({
          id: "focus-rem-digest-noite",
          title: `Faltam ${pendingToday.length} tarefa${pendingToday.length > 1 ? "s" : ""} de hoje`,
          body: preview(pendingToday),
          hour,
          minute,
          at: when.getTime(),
        });
      }
      if (longer.length) {
        const [hour, minute] = at(g.weeklyTime);
        list.push({
          id: "focus-rem-digest-semana",
          title: "Reveja seus objetivos",
          body: pickPhrase(WEEKLY_PHRASES),
          hour,
          minute,
          weekday: g.weeklyDay,
        });
        if (g.monthly && longer.some((t) => t.frequency === "monthly")) {
          list.push(
            { id: "focus-rem-digest-mes1", title: "Metas do mês", body: pickPhrase(MONTHLY_START_PHRASES), hour, minute, monthDay: 1 },
            { id: "focus-rem-digest-mes20", title: "Metas do mês", body: pickPhrase(MONTHLY_MID_PHRASES), hour, minute, monthDay: 20 },
          );
        }
      }
    }
    // Despertador: notificação no horário de acordar (som do sistema; com o
    // app aberto toca a música escolhida — ver AlarmOverlay)
    if (data.alarm.on && data.sleep) {
      const [hour, minute] = data.sleep.wake.split(":").map(Number);
      list.push({ id: "focus-rem-alarme", title: "Hora de acordar!", body: "Bom dia! Abra o Focus para desligar o despertador.", hour, minute });
    }
    syncReminders(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, routineIds, pendingKey, data.reminders, data.sleep, data.digest, data.alarm]);

  const setReminder = async (taskId: string, setting: ReminderSetting) => {
    if (!TIME_RE.test(setting.time)) return "Horário inválido. Use o formato 19:00.";
    if (setting.on && !(await ensurePermission())) {
      return "Permita as notificações do Focus nas configurações do aparelho ou do navegador.";
    }
    update((d) => ({ ...d, reminders: { ...d.reminders, [taskId]: setting } }));
    return null;
  };

  const enableReminders = async (taskIds: string[]) => {
    if (!(await ensurePermission())) {
      return "Permita as notificações do Focus nas configurações do aparelho ou do navegador.";
    }
    update((d) => {
      const reminders = { ...d.reminders };
      taskIds.forEach((taskId) => {
        // Semanais/mensais não têm lembrete próprio (vão no "reveja seus objetivos")
        if (CATALOG_BY_ID[taskId]?.frequency !== "daily") return;
        const time = reminderTimeFrom(d, taskId);
        // Tarefas de sono sem "Meu sono" configurado ficam de fora
        if (!time) return;
        reminders[taskId] = { on: true, time };
      });
      return { ...d, reminders, digest: { ...d.digest, on: true }, reminderTipClosed: true };
    });
    return null;
  };

  const closeReminderTip = () => update((d) => ({ ...d, reminderTipClosed: true }));

  const setAlarm = async (alarm: AlarmSettings) => {
    if (alarm.on && !ref.current.sleep) return "Configure “Meu sono” (horário de acordar) primeiro.";
    if (alarm.playlistUrl && !/^https?:\/\/\S+/.test(alarm.playlistUrl)) return "O link precisa começar com https://";
    if (alarm.on && !(await ensurePermission())) {
      return "Permita as notificações do Focus para o despertador tocar.";
    }
    update((d) => ({ ...d, alarm }));
    return null;
  };

  // Toca no horário de acordar (uma vez por dia) ou quando a soneca acaba
  const wakeSlot = data.sleep ? `${today} ${data.sleep.wake}` : null;
  const nowHHMM = new Date(now).toTimeString().slice(0, 5);
  const ringingByTime =
    !!data.alarm.on && !!data.sleep && !!wakeSlot && data.alarmHandled !== wakeSlot &&
    nowHHMM >= data.sleep.wake && nowHHMM < shiftTime(data.sleep.wake, 30);
  const ringingBySnooze = !!data.alarmSnoozeUntil && now >= data.alarmSnoozeUntil;
  const alarmRinging = ready && (ringingBySnooze || (ringingByTime && !data.alarmSnoozeUntil));

  const stopAlarm = () => {
    update((d) => ({ ...d, alarmHandled: wakeSlot, alarmSnoozeUntil: null }));
    complete("son-acordar");
  };
  const snoozeAlarm = () => {
    const until = Date.now() + ref.current.alarm.snoozeMin * 60000;
    update((d) => ({ ...d, alarmHandled: wakeSlot, alarmSnoozeUntil: until }));
    notifyIn("focus-alarme-soneca", ref.current.alarm.snoozeMin * 60, "Soneca acabou", "Hora de levantar!");
  };

  const setDigest = async (digest: DigestSettings) => {
    const times = [digest.morning, digest.evening, digest.weeklyTime].filter((t): t is string => t !== null);
    if (times.some((t) => !TIME_RE.test(t))) return "Use horários no formato 08:00.";
    if (digest.on && !(await ensurePermission())) {
      return "Permita as notificações do Focus nas configurações do aparelho ou do navegador.";
    }
    update((d) => ({ ...d, digest }));
    return null;
  };

  const setSleep = (sleep: SleepSettings) => {
    if (!TIME_RE.test(sleep.bedtime) || !TIME_RE.test(sleep.wake)) {
      return "Use horários no formato 23:00 e 07:00.";
    }
    update((d) => ({ ...d, sleep }));
    return null;
  };

  const snooze = (minutes: number) =>
    notifyIn("focus-soneca", minutes * 60, "Soneca terminou", "Hora de ir para a cama.");

  // ---------- Cronômetro ----------

  const timerOf = (d: Saved, taskId: string): TimerState => {
    const t = d.timers[taskId];
    return t && t.day === dayKey() ? t : { day: dayKey(), elapsedMs: 0, startedAt: null };
  };

  const timerElapsed = (taskId: string, at = Date.now()) => {
    const t = timerOf(data, taskId);
    return t.elapsedMs + (t.startedAt ? at - t.startedAt : 0);
  };

  const setTimer = (taskId: string, t: TimerState) =>
    update((d) => ({ ...d, timers: { ...d.timers, [taskId]: t } }));

  const startTimer = (taskId: string) => {
    const t = timerOf(ref.current, taskId);
    if (t.startedAt) return;
    const minutes = timerMinutes(taskId) ?? 0;
    const startedAt = Date.now();
    setTimer(taskId, { ...t, startedAt });
    const title = CATALOG_BY_ID[taskId]?.title ?? "Focus";
    const remaining = Math.max(1, minutes * 60 - t.elapsedMs / 1000);
    const end = new Date(startedAt + remaining * 1000);
    const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    showOngoing(`focus-timer-${taskId}`, title, `Contando… termina às ${hhmm(end)}`);
    notifyIn(`focus-timerend-${taskId}`, remaining, `${title}: concluído`, `Você completou ${minutes} min!`);
  };

  const stopNotifications = (taskId: string) => {
    cancelNotification(`focus-timer-${taskId}`);
    cancelNotification(`focus-timerend-${taskId}`);
  };

  const pauseTimer = (taskId: string) => {
    const t = timerOf(ref.current, taskId);
    if (!t.startedAt) return;
    setTimer(taskId, { day: t.day, elapsedMs: t.elapsedMs + Date.now() - t.startedAt, startedAt: null });
    stopNotifications(taskId);
  };

  const resetTimer = (taskId: string) => {
    setTimer(taskId, { day: dayKey(), elapsedMs: 0, startedAt: null });
    stopNotifications(taskId);
  };

  // Enquanto há cronômetro rodando: atualiza a tela e conclui ao bater a meta
  const running = Object.entries(data.timers).filter(([, t]) => t.startedAt && t.day === today);
  const anyRunning = running.length > 0;
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

  // Despertador ligado: confere o relógio a cada 15 s
  const alarmOn = data.alarm.on;
  useEffect(() => {
    if (!alarmOn || anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, [alarmOn, anyRunning]);

  useEffect(() => {
    running.forEach(([taskId]) => {
      const minutes = timerMinutes(taskId);
      if (minutes && timerElapsed(taskId, now) >= minutes * 60000) {
        pauseTimer(taskId);
        complete(taskId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  // ---------- Anotações (artigo, texto livre, gratidão, resumo) ----------

  const entriesOf = (taskId: string, day?: string) =>
    data.entries.filter((e) => e.taskId === taskId && (!day || dayKey(new Date(e.at)) === day));

  const addEntry = (taskId: string, title: string, text: string) => {
    const cleanText = text.trim();
    if (cleanText.length < 2) return "Escreva alguma coisa antes de salvar.";
    const entry: Entry = {
      id: newId("e"),
      taskId,
      title: title.trim().slice(0, 120),
      text: cleanText.slice(0, 4000),
      at: Date.now(),
    };
    update((d) => ({ ...d, entries: [entry, ...d.entries] }));

    const gratitude = featureOf(taskId).modules.find((m) => m.kind === "gratitude");
    if (gratitude && gratitude.kind === "gratitude") {
      const todayCount = ref.current.entries.filter(
        (e) => e.taskId === taskId && dayKey(new Date(e.at)) === dayKey(),
      ).length;
      if (todayCount >= gratitude.count) complete(taskId);
    } else {
      complete(taskId);
    }
    return null;
  };

  const updateEntry = (id: string, title: string, text: string) => {
    const cleanText = text.trim();
    if (cleanText.length < 2) return "O texto não pode ficar vazio.";
    update((d) => ({
      ...d,
      entries: d.entries.map((e) =>
        e.id === id
          ? { ...e, title: title.trim().slice(0, 120), text: cleanText.slice(0, 4000), editedAt: Date.now() }
          : e,
      ),
    }));
    return null;
  };

  const removeEntry = (id: string) =>
    update((d) => ({
      ...d,
      entries: d.entries.filter((e) => e.id !== id),
      // Cartões criados a partir do resumo ficam (já podem ter sido revisados)
    }));

  // ---------- Flashcards ----------

  const addCard = (front: string, back: string, summaryId: string | null = null) => {
    if (front.trim().length < 1 || back.trim().length < 1) return "Preencha a pergunta e a resposta.";
    const card: Flashcard = {
      id: newId("c"),
      front: front.trim().slice(0, 300),
      back: back.trim().slice(0, 600),
      summaryId,
      createdAt: Date.now(),
    };
    update((d) => ({ ...d, cards: [...d.cards, card] }));
    return null;
  };

  const updateCard = (id: string, front: string, back: string) => {
    if (front.trim().length < 1 || back.trim().length < 1) return "Preencha a pergunta e a resposta.";
    update((d) => ({
      ...d,
      cards: d.cards.map((c) =>
        c.id === id
          ? { ...c, front: front.trim().slice(0, 300), back: back.trim().slice(0, 600), editedAt: Date.now() }
          : c,
      ),
    }));
    return null;
  };

  const removeCard = (id: string) => update((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== id) }));

  const reviewsToday = data.reviews.filter((r) => r.day === today).length;

  const reviewCard = (cardId: string, ok: boolean) => {
    update((d) => ({ ...d, reviews: [...d.reviews, { id: newId("r"), cardId, day: dayKey(), ok }] }));
    const done = ref.current.reviews.filter((r) => r.day === dayKey()).length;
    const goal = Math.max(1, Math.min(5, ref.current.cards.length));
    if (done >= goal) complete("est-flashcards");
  };

  // ---------- Pessoas ----------

  const addPerson = (name: string) => {
    const clean = name.trim();
    if (clean.length < 2) return "Digite o nome da pessoa.";
    if (ref.current.people.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
      return "Essa pessoa já está na lista.";
    }
    update((d) => ({ ...d, people: [...d.people, { id: newId("p"), name: clean.slice(0, 40) }] }));
    return null;
  };

  const removePerson = (id: string) => update((d) => ({ ...d, people: d.people.filter((p) => p.id !== id) }));

  const logPerson = (taskId: string, personId: string) => {
    update((d) => ({
      ...d,
      personLogs: [{ id: newId("pl"), taskId, personId, day: dayKey(), at: Date.now() }, ...d.personLogs],
    }));
    complete(taskId);
  };

  // ---------- 3 prioridades do dia ----------

  const todosToday = data.todos[today] ?? [
    { text: "", done: false },
    { text: "", done: false },
    { text: "", done: false },
  ];

  const setTodos = (list: TodoItem[]) => {
    update((d) => ({ ...d, todos: { [dayKey()]: list } })); // só o dia atual importa
    if (list.every((t) => t.text.trim() && t.done)) complete("pro-3prioridades");
  };

  const setTodoText = (index: number, text: string) =>
    setTodos(todosToday.map((t, i) => (i === index ? { text: text.slice(0, 60), done: t.done && !!text.trim() } : t)));

  const toggleTodo = (index: number) => {
    if (!todosToday[index]?.text.trim()) return;
    setTodos(todosToday.map((t, i) => (i === index ? { ...t, done: !t.done } : t)));
  };

  // ---------- Tarefas pendentes (com prazo e atrasadas) ----------

  const addBacklog = (title: string, due: string | null) => {
    const clean = title.trim();
    if (clean.length < 2) return "Escreva a tarefa.";
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return "Prazo inválido.";
    update((d) => ({
      ...d,
      backlog: [...d.backlog, { id: newId("t"), title: clean.slice(0, 60), due, createdAt: Date.now(), doneAt: null }],
    }));
    return null;
  };

  const finishBacklog = (id: string) => {
    update((d) => ({ ...d, backlog: d.backlog.map((b) => (b.id === id ? { ...b, doneAt: Date.now() } : b)) }));
    complete("pro-sem-adiar");
  };

  const removeBacklog = (id: string) => update((d) => ({ ...d, backlog: d.backlog.filter((b) => b.id !== id) }));

  // ---------- Sono e medições ----------

  const logSleep = (slept: string, woke: string) => {
    if (!TIME_RE.test(slept) || !TIME_RE.test(woke)) return "Use horários no formato 23:00 e 07:00.";
    const hours = sleepHours(slept, woke);
    update((d) => ({
      ...d,
      sleepLogs: [{ day: dayKey(), slept, woke, hours }, ...d.sleepLogs.filter((l) => l.day !== dayKey())],
    }));
    if (hours >= 8) complete("son-8h");
    return null;
  };

  const metricToday = (taskId: string) =>
    data.metrics.find((m) => m.taskId === taskId && m.day === today)?.value ?? null;

  const logMetric = (taskId: string, value: number) => {
    update((d) => ({
      ...d,
      metrics: [{ taskId, day: dayKey(), value }, ...d.metrics.filter((m) => !(m.taskId === taskId && m.day === dayKey()))],
    }));
    const m = featureOf(taskId).modules.find((x) => x.kind === "metric");
    if (m && m.kind === "metric" && (m.atMost ? value < m.goal : value >= m.goal)) complete(taskId);
  };

  // ---------- Anexos ----------

  const addAttachment = (taskId: string, uri: string, name: string, kind: Attachment["kind"]) => {
    // No navegador a imagem vira texto (data:); limite para não lotar o armazenamento
    if (uri.startsWith("data:") && uri.length > 1_500_000) {
      return "Arquivo grande demais para salvar no navegador. Escolha um menor.";
    }
    update((d) => ({
      ...d,
      attachments: [{ id: newId("a"), taskId, uri, name: name.slice(0, 80), kind, at: Date.now() }, ...d.attachments],
    }));
    complete(taskId);
    return null;
  };

  const removeAttachment = (id: string) =>
    update((d) => ({ ...d, attachments: d.attachments.filter((a) => a.id !== id) }));

  return (
    <TaskExtrasContext.Provider
      value={{
        ...data,
        ready,
        today,
        complete,
        setReminder,
        reminderTime,
        enableReminders,
        closeReminderTip,
        setDigest,
        setAlarm,
        alarmRinging,
        stopAlarm,
        snoozeAlarm,
        setSleep,
        snooze,
        timerElapsed,
        startTimer,
        pauseTimer,
        resetTimer,
        addEntry,
        removeEntry,
        updateEntry,
        entriesOf,
        addCard,
        updateCard,
        removeCard,
        reviewCard,
        reviewsToday,
        addPerson,
        removePerson,
        logPerson,
        todosToday,
        setTodoText,
        toggleTodo,
        addBacklog,
        finishBacklog,
        removeBacklog,
        logSleep,
        logMetric,
        metricToday,
        addAttachment,
        removeAttachment,
      }}
    >
      {children}
    </TaskExtrasContext.Provider>
  );
}
