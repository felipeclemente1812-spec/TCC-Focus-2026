import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

import { CATALOG_BY_ID } from "@/constants/challenges";
import { dayKey, monthKey, weekKey, XP_BY_FREQUENCY } from "@/constants/gamification";
import { BooksContext } from "@/context/BooksContext";
import { RoutineContext } from "@/context/RoutineContext";
import { TaskExtrasContext, topWords } from "@/context/TaskExtrasContext";
import { XPContext } from "@/context/XPContext";
import { loadJSON, saveJSON } from "@/utils/localStore";
import { FREE_LIMITS, limitReached, PremiumContext } from "@/context/PremiumContext";

// Tarefas semanais e mensais com VERIFICAÇÃO (relatório do grupo):
// simulados, videoaulas, mapa mental, plano da semana, refeições, treinos,
// hobbies, metas em cartões, projetos/cursos, corridas, agenda, resenhas e
// "prova" (foto ou anotação) para as que não têm como medir.
// Também guarda as METAS PRÓPRIAS semanais/mensais (com check-in por dia).
// O XP sai da rotina (RoutineContext -> XPContext); metas próprias valem metade.
// Salvo na nuvem (Firestore), por usuário. Anexos ficam no Firebase Storage (só o link é guardado).
// (cada lista vira uma subcoleção users/{uid}/<lista>).

export type FileRef = { uri: string; name: string; kind: "image" | "document" };

export type Simulado = { id: string; title: string; correct: number; total: number; day: string; at: number };
export type Video = { id: string; title: string; link: string; createdAt: number; watchedAt: number | null };
export type MindMap = {
  id: string;
  taskId: string; // est-mapa (semana) ou mes-est-provas (mês)
  period: string;
  title: string;
  text: string;
  keywords: string[];
  files: FileRef[];
  at: number;
  editedAt?: number;
};
export type Meal = { id: string; slot: MealSlot; name: string; kcal: number };
export type MealSlot = "cafe" | "almoco" | "lanche" | "jantar";
export type Hobby = { id: string; name: string };
export type HobbyLog = { id: string; hobbyId: string; minutes: number; note: string; day: string; at: number };
export type GoalCard = { id: string; title: string; why: string; month: string | null; createdAt: number };
export type GoalReview = { cardId: string; period: string; status: "ok" | "ajustar" };
// "Criação" e "Aprender algo novo" saíram (pedido do grupo): criação virou um
// tipo de projeto (creation) e "aprender" virou curso
export type ProjectKind = "curso" | "projeto";
export type ProjectNote = { id: string; text: string; day: string; at: number };
export type Project = {
  id: string;
  kind: ProjectKind;
  creation?: boolean; // projeto que é uma criação (desenho, música, texto...)
  title: string;
  description: string;
  start: string; // AAAA-MM-DD
  deadline: string | null;
  hours: number | null; // carga horária (cursos)
  notes: ProjectNote[];
  files: FileRef[];
  createdAt: number;
  doneAt: number | null;
};
export type Run = { id: string; km: number; minutes: number; day: string; at: number };
export type Chapter = { id: string; bookId: string; chapter: number; day: string; at: number };
export type BookNote = { id: string; bookId: string; text: string; day: string; at: number };
export type Review = { id: string; bookId: string; text: string; rating: number; isPublic: boolean; at: number; editedAt?: number };
export type LibraryVisit = { id: string; month: string; place: string; bookId: string | null; at: number };
export type Proof = { id: string; taskId: string; period: string; text: string; file: FileRef | null; at: number };
export type AgendaKind = "compromisso" | "prova" | "prazo" | "encontro";
export type AgendaEvent = {
  id: string;
  title: string;
  day: string; // AAAA-MM-DD
  time: string | null; // HH:MM
  kind: AgendaKind;
  note: string;
  remind: boolean;
  createdAt: number;
};
export type CustomGoal = {
  id: string;
  title: string;
  frequency: "weekly" | "monthly";
  target: number; // dias de check-in no período
  checkins: string[]; // dias (AAAA-MM-DD)
  notes: Record<string, string>; // dia -> anotação do check-in
  createdAt: number;
};

type Saved = {
  simulados: Simulado[];
  videos: Video[];
  mindmaps: MindMap[];
  weekReviewed: Record<string, string[]>; // semana -> ids revisados
  meals: Record<string, Record<number, Meal[]>>; // semana -> dia da semana -> refeições
  kcalGoal: number | null;
  trainingDays: Record<string, number[]>; // semana -> dias (0–6) em que treinou
  hobbies: Hobby[];
  hobbyLogs: HobbyLog[];
  weekPlan: Record<string, Record<string, string>>; // semana -> "dia-turno" -> texto
  goalCards: GoalCard[];
  goalReviews: GoalReview[];
  projects: Project[];
  runs: Run[];
  monthTargets: Record<string, number>; // metas ajustadas (treinos, meditação, km)
  chapters: Chapter[];
  bookNotes: BookNote[];
  reviews: Review[];
  library: LibraryVisit[];
  proofs: Proof[];
  events: AgendaEvent[];
  customGoals: CustomGoal[];
};

const EMPTY: Saved = {
  simulados: [],
  videos: [],
  mindmaps: [],
  weekReviewed: {},
  meals: {},
  kcalGoal: null,
  trainingDays: {},
  hobbies: [
    { id: "hb-natureza", name: "Natureza" },
    { id: "hb-musica", name: "Música" },
  ],
  hobbyLogs: [],
  weekPlan: {},
  goalCards: [],
  goalReviews: [],
  projects: [],
  runs: [],
  monthTargets: {},
  chapters: [],
  bookNotes: [],
  reviews: [],
  library: [],
  proofs: [],
  events: [],
  customGoals: [],
};

const key = (uid: string) => `focus:v1:${uid}:planejador`;
const isSaved = (v: unknown): v is Partial<Saved> => !!v && typeof v === "object" && !Array.isArray(v);

// Projetos salvos antes da mudança: "criacao" vira projeto-criação e "aprender" vira curso
const migrateProject = (p: Project): Project => {
  const old = p.kind as string;
  if (old === "criacao") return { ...p, kind: "projeto", creation: true };
  if (old === "aprender") return { ...p, kind: "curso" };
  return p;
};
const newId = (p: string) => `${p}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------- Regras de verificação (puras) ----------

// Metas mensais que contam dias de uma diária concluída
export const DAY_COUNT_TASKS: Record<string, { sources: string[]; target: number; min: number; label: string }> = {
  "mes-sau-checkup": { sources: ["sau-agua"], target: 25, min: 25, label: "dias bebendo 2L" },
  "mes-sau-agua": { sources: ["sau-fruta"], target: 20, min: 20, label: "dias com fruta" },
  "mes-men-meditar": { sources: ["men-meditar"], target: 20, min: 20, label: "dias meditando" },
  "mes-cas-faxina": { sources: ["cas-cama", "cas-mesa", "cas-louca"], target: 20, min: 20, label: "dias com tarefa de casa" },
  "mes-dig-detox": { sources: ["dig-tempo"], target: 20, min: 20, label: "dias com menos de 3h" },
  "mes-dig-redes": { sources: ["dig-redes"], target: 15, min: 15, label: "dias longe das redes" },
};

export const TRAINING_MONTH_TASK = "mes-atv-12treinos";
export const TRAINING_MONTH_DEFAULT = 12;
export const RUN_MONTH_TASK = "mes-atv-corrida";
export const RUN_MONTH_DEFAULT_KM = 15;

// Semanais/mensais que só têm "prova": anotação ou foto para concluir
export const PROOF_TASKS = new Set([
  "atv-yoga",
  "atv-esporte",
  "sau-cozinhar",
  "soc-familia",
  "cas-faxina",
  "cas-roupas",
  "dig-limpar",
]);
export const PROOF_MIN_CHARS = 15;

// Quantos dias de check-in uma meta própria precisa no mínimo
export const CUSTOM_GOAL_MIN: Record<CustomGoal["frequency"], number> = { weekly: 3, monthly: 8 };
export const CUSTOM_GOAL_MAX = 3; // por frequência
// Metas próprias não têm verificação do app: valem METADE do desafio do catálogo
export const CUSTOM_GOAL_XP: Record<CustomGoal["frequency"], number> = {
  weekly: XP_BY_FREQUENCY.weekly / 2,
  monthly: XP_BY_FREQUENCY.monthly / 2,
};

export const MEAL_SLOTS: { id: MealSlot; label: string }[] = [
  { id: "cafe", label: "Café" },
  { id: "almoco", label: "Almoço" },
  { id: "lanche", label: "Lanche" },
  { id: "jantar", label: "Jantar" },
];
export const PLAN_SLOTS = ["Manhã", "Tarde", "Noite"];

export const KIND_LABEL: Record<ProjectKind, string> = {
  curso: "Curso",
  projeto: "Projeto",
};
// Desafio que cada tipo de projeto cumpre
export const PROJECT_TASK: Record<ProjectKind, string> = {
  curso: "mes-est-curso",
  projeto: "mes-pro-projeto",
};
// Concluir um projeto pelo app exige progresso real em dias diferentes
export const PROJECT_MIN_DAYS = 3;

export function projectProgressDays(p: Project) {
  return new Set(p.notes.map((n) => n.day)).size;
}

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  // Antes do meio-dia conta como "depois da meia-noite" (01:00 > 23:00)
  return (h < 12 ? h + 24 : h) * 60 + m;
};

// Diferença entre o horário mais cedo e o mais tarde de dormir (minutos)
export function bedtimeSpread(times: string[]) {
  if (times.length < 2) return 0;
  const mins = times.map(minutesOf);
  return Math.max(...mins) - Math.min(...mins);
}

export const weekDays = (date = new Date()) => {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dayKey(d);
  });
};

const inMonth = (day: string, month = monthKey()) => `M${day.slice(0, 7)}` === month;
const inWeek = (day: string) => weekDays().includes(day);

export const nextMonthKey = () => {
  const d = new Date();
  return monthKey(new Date(d.getFullYear(), d.getMonth() + 1, 1));
};

type PlannerContextType = Saved & {
  ready: boolean;
  week: string;
  month: string;
  today: string;
  // Simulados e videoaulas
  addSimulado: (title: string, correct: number, total: number) => string | null;
  removeSimulado: (id: string) => void;
  addVideo: (title: string, link: string) => string | null;
  watchVideo: (id: string) => void;
  removeVideo: (id: string) => void;
  // Revisão da semana e mapas
  studyItems: (scope: "week" | "month") => { id: string; title: string; text: string; at: number; source: string }[];
  keywords: (scope: "week" | "month") => { word: string; n: number }[];
  toggleReviewed: (itemId: string) => void;
  saveMindMap: (taskId: string, input: { id?: string; title: string; text: string; keywords: string[]; files: FileRef[] }) => string | null;
  removeMindMap: (id: string) => void;
  // Refeições
  mealsOf: (weekday: number) => Meal[];
  addMeal: (weekday: number, slot: MealSlot, name: string, kcal: number) => string | null;
  removeMeal: (weekday: number, id: string) => void;
  setKcalGoal: (kcal: number | null) => void;
  // Treinos
  trainedThisWeek: number[];
  toggleTraining: (weekday: number) => string | null;
  trainingsThisMonth: number;
  // Hobbies
  addHobby: (name: string) => string | null;
  removeHobby: (id: string) => void;
  logHobby: (hobbyId: string, minutes: number, note: string) => string | null;
  hobbyMinutesThisWeek: number;
  // Plano da semana
  planCell: (weekday: number, slot: number) => string;
  setPlanCell: (weekday: number, slot: number, text: string) => void;
  // Metas em cartões
  addGoalCard: (title: string, why: string, nextMonth: boolean) => string | null;
  updateGoalCard: (id: string, title: string, why: string) => string | null;
  removeGoalCard: (id: string) => void;
  reviewGoal: (cardId: string, status: GoalReview["status"]) => void;
  goalStatus: (cardId: string) => GoalReview["status"] | null;
  // Projetos, cursos e criações
  saveProject: (input: Omit<Project, "id" | "notes" | "files" | "createdAt" | "doneAt"> & { id?: string }) => string | null;
  removeProject: (id: string) => void;
  addProjectNote: (id: string, text: string) => string | null;
  removeProjectNote: (id: string, noteId: string) => void;
  addProjectFile: (id: string, file: FileRef) => void;
  removeProjectFile: (id: string, uri: string) => void;
  finishProject: (id: string) => string | null;
  // Corridas e metas do mês
  addRun: (km: number, minutes: number) => string | null;
  removeRun: (id: string) => void;
  runKmThisMonth: number;
  targetOf: (taskId: string) => number;
  setTarget: (taskId: string, value: number) => string | null;
  dayCount: (taskId: string) => number;
  // Leitura
  addChapter: (bookId: string, chapter: number) => string | null;
  addBookNote: (bookId: string, text: string) => string | null;
  saveReview: (bookId: string, text: string, rating: number, isPublic: boolean) => string | null;
  removeReview: (id: string) => void;
  visitLibrary: (place: string, bookId: string | null) => string | null;
  // Prova (foto/anotação)
  addProof: (taskId: string, text: string, file: FileRef | null) => string | null;
  proofsOf: (taskId: string) => Proof[];
  // Agenda pessoal
  saveEvent: (input: Omit<AgendaEvent, "id" | "createdAt"> & { id?: string }) => string | null;
  removeEvent: (id: string) => void;
  // Metas próprias (semanais/mensais)
  addCustomGoal: (title: string, frequency: CustomGoal["frequency"], target: number) => string | null;
  removeCustomGoal: (id: string) => void;
  checkInCustomGoal: (id: string, note: string) => { error: string | null; gained: number };
  customGoalProgress: (goal: CustomGoal) => { done: number; complete: boolean };
};

export const PlannerContext = createContext<PlannerContextType | null>(null);

export function PlannerProvider({ uid, children }: { uid: string; children: ReactNode }) {
  // Plano grátis: limites de uso (Focus Premium tira os limites)
  const isPremium = useContext(PremiumContext)?.isPremium ?? false;
  const routine = useContext(RoutineContext);
  const xp = useContext(XPContext);
  const extras = useContext(TaskExtrasContext);
  const booksCtx = useContext(BooksContext);
  const [data, setData] = useState<Saved>(EMPTY);
  const [ready, setReady] = useState(!uid);
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
        ref.current = { ...EMPTY, ...saved, projects: (saved.projects ?? []).map(migrateProject) };
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

  const today = dayKey();
  const week = weekKey();
  const month = monthKey();

  // Conclui pela rotina (sem 2ª fonte de XP)
  const complete = (taskId: string) => {
    const task = routine?.tasks.find((t) => t.id === taskId);
    if (task && !routine?.isDone(task)) routine?.completeTask(task);
  };

  // ---------- Simulados e videoaulas ----------

  const addSimulado = (title: string, correct: number, total: number) => {
    const clean = title.trim();
    if (clean.length < 2) return "Dê um nome ao simulado (ex.: ENEM 2023 — dia 1).";
    if (!Number.isInteger(total) || total < 5) return "O simulado precisa ter pelo menos 5 questões.";
    if (!Number.isInteger(correct) || correct < 0 || correct > total) return "Acertos entre 0 e o total de questões.";
    update((d) => ({
      ...d,
      simulados: [{ id: newId("sim"), title: clean.slice(0, 60), correct, total, day: dayKey(), at: Date.now() }, ...d.simulados],
    }));
    complete("est-simulado");
    return null;
  };
  const removeSimulado = (id: string) => update((d) => ({ ...d, simulados: d.simulados.filter((s) => s.id !== id) }));

  const addVideo = (title: string, link: string) => {
    const clean = title.trim();
    if (clean.length < 2) return "Escreva o título da videoaula.";
    const url = link.trim();
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) return "O link precisa começar com http:// ou https://";
    update((d) => ({
      ...d,
      videos: [...d.videos, { id: newId("vid"), title: clean.slice(0, 80), link: url, createdAt: Date.now(), watchedAt: null }],
    }));
    return null;
  };
  const watchVideo = (id: string) => {
    update((d) => ({ ...d, videos: d.videos.map((v) => (v.id === id ? { ...v, watchedAt: Date.now() } : v)) }));
    complete("est-video");
  };
  const removeVideo = (id: string) => update((d) => ({ ...d, videos: d.videos.filter((v) => v.id !== id) }));

  // ---------- Revisão da semana / do mês ----------

  const STUDY_TASKS: Record<string, string> = {
    "est-resumo": "Resumo",
    "lei-artigo": "Artigo",
    "est-revisar": "Aula",
    "cri-escrever": "Texto",
  };

  const studyItems = (scope: "week" | "month") => {
    const inScope = (at: number) => (scope === "week" ? inWeek(dayKey(new Date(at))) : inMonth(dayKey(new Date(at))));
    const entries = (extras?.entries ?? [])
      .filter((e) => STUDY_TASKS[e.taskId] && inScope(e.at))
      .map((e) => ({ id: e.id, title: e.title || STUDY_TASKS[e.taskId], text: e.text, at: e.at, source: STUDY_TASKS[e.taskId] }));
    const cards = (extras?.cards ?? [])
      .filter((c) => inScope(c.createdAt))
      .map((c) => ({ id: c.id, title: c.front, text: c.back, at: c.createdAt, source: "Flashcard" }));
    const sims = data.simulados
      .filter((s) => inScope(s.at))
      .map((s) => ({ id: s.id, title: s.title, text: `${s.correct}/${s.total} acertos`, at: s.at, source: "Simulado" }));
    const vids = data.videos
      .filter((v) => v.watchedAt && inScope(v.watchedAt))
      .map((v) => ({ id: v.id, title: v.title, text: v.link, at: v.watchedAt as number, source: "Videoaula" }));
    return [...entries, ...cards, ...sims, ...vids].sort((a, b) => b.at - a.at);
  };

  const keywords = (scope: "week" | "month") =>
    topWords(studyItems(scope).map((i) => `${i.title} ${i.text}`), 12);

  const toggleReviewed = (itemId: string) => {
    update((d) => {
      const list = d.weekReviewed[week] ?? [];
      const next = list.includes(itemId) ? list.filter((x) => x !== itemId) : [...list, itemId];
      return { ...d, weekReviewed: { [week]: next } };
    });
  };

  const saveMindMap: PlannerContextType["saveMindMap"] = (taskId, input) => {
    const title = input.title.trim();
    if (title.length < 3) return "Dê um título para revisar depois.";
    if (input.text.trim().length < 30 && input.files.length === 0 && input.keywords.length < 3) {
      return "Escreva os tópicos (30+ letras), anexe o mapa ou escolha 3 palavras-chave.";
    }
    const period = taskId === "mes-est-provas" ? month : week;
    update((d) => {
      const existing = input.id ? d.mindmaps.find((m) => m.id === input.id) : undefined;
      const map: MindMap = existing
        ? { ...existing, title, text: input.text.trim(), keywords: input.keywords, files: input.files, editedAt: Date.now() }
        : { id: newId("map"), taskId, period, title, text: input.text.trim(), keywords: input.keywords, files: input.files, at: Date.now() };
      return { ...d, mindmaps: existing ? d.mindmaps.map((m) => (m.id === map.id ? map : m)) : [map, ...d.mindmaps] };
    });
    if (!input.id) complete(taskId);
    return null;
  };
  const removeMindMap = (id: string) => update((d) => ({ ...d, mindmaps: d.mindmaps.filter((m) => m.id !== id) }));

  // ---------- Refeições ----------

  const mealsOf = (weekday: number) => data.meals[week]?.[weekday] ?? [];

  const plannedDays = (d: Saved) =>
    Object.values(d.meals[week] ?? {}).filter((list) => list.length >= 2).length;

  const addMeal = (weekday: number, slot: MealSlot, name: string, kcal: number) => {
    const clean = name.trim();
    if (clean.length < 2) return "Escreva a refeição (ex.: arroz, feijão e frango).";
    if (!Number.isFinite(kcal) || kcal < 0 || kcal > 5000) return "Calorias entre 0 e 5000.";
    update((d) => {
      const weekMeals = d.meals[week] ?? {};
      const day = weekMeals[weekday] ?? [];
      return {
        ...d,
        meals: { ...d.meals, [week]: { ...weekMeals, [weekday]: [...day, { id: newId("ml"), slot, name: clean.slice(0, 60), kcal: Math.round(kcal) }] } },
      };
    });
    // Plano feito: pelo menos 5 dias com 2+ refeições
    if (plannedDays(ref.current) >= 5) complete("sau-refeicoes");
    return null;
  };
  const removeMeal = (weekday: number, id: string) =>
    update((d) => {
      const weekMeals = d.meals[week] ?? {};
      return { ...d, meals: { ...d.meals, [week]: { ...weekMeals, [weekday]: (weekMeals[weekday] ?? []).filter((m) => m.id !== id) } } };
    });
  const setKcalGoal = (kcal: number | null) => update((d) => ({ ...d, kcalGoal: kcal }));

  // ---------- Treinos ----------

  const completedIds = xp?.completedIds ?? [];
  const doneOn = (taskId: string, day: string) => completedIds.includes(`${taskId}@${day}`);

  // Dias da semana com treino: marcados aqui OU "Treinar 30 minutos" concluído
  const trainedThisWeek = (() => {
    const marked = data.trainingDays[week] ?? [];
    const days = weekDays();
    const fromDaily = days.map((day, i) => (doneOn("atv-treino", day) ? (i + 1) % 7 : -1)).filter((d) => d >= 0);
    return [...new Set([...marked, ...fromDaily])];
  })();

  const toggleTraining = (weekday: number) => {
    // Só hoje ou dias que já passaram (não dá para marcar o futuro)
    const index = (weekday + 6) % 7;
    if (weekDays()[index] > today) return "Esse dia ainda não chegou.";
    update((d) => {
      const list = d.trainingDays[week] ?? [];
      const next = list.includes(weekday) ? list.filter((x) => x !== weekday) : [...list, weekday];
      return { ...d, trainingDays: { ...d.trainingDays, [week]: next } };
    });
    return null;
  };

  const trainingsThisMonth = (() => {
    const days = new Set<string>();
    completedIds.forEach((id) => {
      const [base, day] = id.split("@");
      if (base === "atv-treino" && day && inMonth(day)) days.add(day);
    });
    Object.entries(data.trainingDays).forEach(([wk, list]) => {
      const monday = new Date(`${wk.slice(1)}T12:00:00`);
      list.forEach((wd) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + ((wd + 6) % 7));
        if (inMonth(dayKey(d))) days.add(dayKey(d));
      });
    });
    return days.size;
  })();

  // ---------- Hobbies ----------

  const addHobby = (name: string) => {
    const clean = name.trim();
    if (clean.length < 2) return "Escreva o hobby.";
    if (ref.current.hobbies.some((h) => h.name.toLowerCase() === clean.toLowerCase())) return "Esse hobby já está na lista.";
    if (ref.current.hobbies.length >= 12) return "Até 12 hobbies.";
    update((d) => ({ ...d, hobbies: [...d.hobbies, { id: newId("hb"), name: clean.slice(0, 30) }] }));
    return null;
  };
  const removeHobby = (id: string) => update((d) => ({ ...d, hobbies: d.hobbies.filter((h) => h.id !== id) }));

  const hobbyMinutesIn = (d: Saved) => d.hobbyLogs.filter((l) => inWeek(l.day)).reduce((s, l) => s + l.minutes, 0);

  const logHobby = (hobbyId: string, minutes: number, note: string) => {
    if (!ref.current.hobbies.some((h) => h.id === hobbyId)) return "Escolha um hobby.";
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) return "Minutos entre 5 e 600.";
    update((d) => ({
      ...d,
      hobbyLogs: [{ id: newId("hl"), hobbyId, minutes, note: note.trim().slice(0, 200), day: dayKey(), at: Date.now() }, ...d.hobbyLogs],
    }));
    if (hobbyMinutesIn(ref.current) >= 60) complete("men-hobby");
    return null;
  };

  // ---------- Plano da semana ----------

  const planCell = (weekday: number, slot: number) => data.weekPlan[week]?.[`${weekday}-${slot}`] ?? "";
  const setPlanCell = (weekday: number, slot: number, text: string) => {
    update((d) => ({
      ...d,
      weekPlan: { [week]: { ...(d.weekPlan[week] ?? {}), [`${weekday}-${slot}`]: text.slice(0, 80) } },
    }));
    // Semana planejada: 5 dias com algo escrito
    const cells = ref.current.weekPlan[week] ?? {};
    const days = new Set(Object.entries(cells).filter(([, v]) => v.trim()).map(([k]) => k.split("-")[0]));
    if (days.size >= 5) complete("pro-planejar-semana");
  };

  // ---------- Metas em cartões ----------

  const addGoalCard = (title: string, why: string, nextMonth: boolean) => {
    const clean = title.trim();
    if (clean.length < 3) return "Escreva a meta.";
    update((d) => ({
      ...d,
      goalCards: [...d.goalCards, { id: newId("gc"), title: clean.slice(0, 80), why: why.trim().slice(0, 200), month: nextMonth ? nextMonthKey() : null, createdAt: Date.now() }],
    }));
    if (ref.current.goalCards.filter((g) => g.month === nextMonthKey()).length >= 3) complete("mes-pro-metas");
    return null;
  };
  const updateGoalCard = (id: string, title: string, why: string) => {
    if (title.trim().length < 3) return "Escreva a meta.";
    update((d) => ({ ...d, goalCards: d.goalCards.map((g) => (g.id === id ? { ...g, title: title.trim().slice(0, 80), why: why.trim().slice(0, 200) } : g)) }));
    return null;
  };
  const removeGoalCard = (id: string) => update((d) => ({ ...d, goalCards: d.goalCards.filter((g) => g.id !== id) }));
  const goalStatus = (cardId: string) => data.goalReviews.find((r) => r.cardId === cardId && r.period === week)?.status ?? null;
  const reviewGoal = (cardId: string, status: GoalReview["status"]) => {
    update((d) => ({
      ...d,
      goalReviews: [...d.goalReviews.filter((r) => !(r.cardId === cardId && r.period === week)), { cardId, period: week, status }],
    }));
    const cards = ref.current.goalCards;
    const reviewed = ref.current.goalReviews.filter((r) => r.period === week).length;
    if (cards.length > 0 && reviewed >= cards.length) complete("pro-meta");
  };

  // ---------- Projetos ----------

  const saveProject: PlannerContextType["saveProject"] = (input) => {
    if (!isPremium && !input.id && ref.current.projects.filter((p) => !p.doneAt).length >= FREE_LIMITS.projetos) {
      return limitReached(`No plano grátis, dá para ter ${FREE_LIMITS.projetos} cursos ou projetos em andamento.`);
    }
    const title = input.title.trim();
    if (title.length < 3) return "Dê um nome ao projeto.";
    if (input.deadline && input.deadline < input.start) return "O prazo precisa ser depois do início.";
    update((d) => {
      const existing = input.id ? d.projects.find((p) => p.id === input.id) : undefined;
      if (existing) {
        return { ...d, projects: d.projects.map((p) => (p.id === existing.id ? { ...p, ...input, id: p.id, title } : p)) };
      }
      const project: Project = { ...input, id: newId("prj"), title, notes: [], files: [], createdAt: Date.now(), doneAt: null };
      return { ...d, projects: [project, ...d.projects] };
    });
    return null;
  };
  const removeProject = (id: string) => update((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }));
  const addProjectNote = (id: string, text: string) => {
    const clean = text.trim();
    if (clean.length < 10) return "Conte o que avançou (10+ letras).";
    update((d) => ({
      ...d,
      projects: d.projects.map((p) => (p.id === id ? { ...p, notes: [{ id: newId("pn"), text: clean.slice(0, 500), day: dayKey(), at: Date.now() }, ...p.notes] } : p)),
    }));
    // Semanais: avançar um projeto / aprender algo novo
    const project = ref.current.projects.find((p) => p.id === id);
    complete("cri-projeto");
    if (project?.kind === "curso") complete("cri-novo");
    return null;
  };
  const removeProjectNote = (id: string, noteId: string) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p)) }));
  const addProjectFile = (id: string, file: FileRef) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, files: [file, ...p.files] } : p)) }));
  const removeProjectFile = (id: string, uri: string) =>
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, files: p.files.filter((f) => f.uri !== uri) } : p)) }));
  const finishProject = (id: string) => {
    const project = ref.current.projects.find((p) => p.id === id);
    if (!project) return "Projeto não encontrado.";
    if (projectProgressDays(project) < PROJECT_MIN_DAYS) {
      return `Registre o progresso em pelo menos ${PROJECT_MIN_DAYS} dias diferentes antes de concluir.`;
    }
    update((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, doneAt: Date.now() } : p)) }));
    complete(PROJECT_TASK[project.kind]);
    if (project.creation) complete("mes-cri-obra");
    if (project.kind === "curso") complete("mes-cri-curso");
    return null;
  };

  // ---------- Corridas e metas do mês ----------

  const targetOf = (taskId: string) =>
    data.monthTargets[taskId] ??
    DAY_COUNT_TASKS[taskId]?.target ??
    (taskId === TRAINING_MONTH_TASK ? TRAINING_MONTH_DEFAULT : taskId === RUN_MONTH_TASK ? RUN_MONTH_DEFAULT_KM : 0);

  // Dá para AUMENTAR a meta; abaixar do padrão viraria atalho para XP
  const setTarget = (taskId: string, value: number) => {
    const min = DAY_COUNT_TASKS[taskId]?.min ?? (taskId === TRAINING_MONTH_TASK ? TRAINING_MONTH_DEFAULT : 5);
    const max = DAY_COUNT_TASKS[taskId] ? 31 : taskId === RUN_MONTH_TASK ? 500 : 31;
    if (!Number.isFinite(value) || value < min || value > max) return `A meta vai de ${min} a ${max}.`;
    update((d) => ({ ...d, monthTargets: { ...d.monthTargets, [taskId]: Math.round(value) } }));
    return null;
  };

  const runKmIn = (d: Saved) => d.runs.filter((r) => inMonth(r.day)).reduce((s, r) => s + r.km, 0);
  const runKmThisMonth = Math.round(runKmIn(data) * 10) / 10;

  const addRun = (km: number, minutes: number) => {
    if (!Number.isFinite(km) || km < 0.5 || km > 100) return "Distância entre 0,5 e 100 km.";
    if (!Number.isFinite(minutes) || minutes < 2 || minutes > 600) return "Tempo entre 2 e 600 minutos.";
    // Ritmo humano: mais rápido que 2 min/km não vale
    if (minutes / km < 2) return "Esse ritmo está rápido demais. Confira km e minutos.";
    update((d) => ({ ...d, runs: [{ id: newId("run"), km: Math.round(km * 10) / 10, minutes: Math.round(minutes), day: dayKey(), at: Date.now() }, ...d.runs] }));
    if (runKmIn(ref.current) >= targetOf(RUN_MONTH_TASK)) complete(RUN_MONTH_TASK);
    return null;
  };
  const removeRun = (id: string) => update((d) => ({ ...d, runs: d.runs.filter((r) => r.id !== id) }));

  const dayCount = (taskId: string) => {
    const rule = DAY_COUNT_TASKS[taskId];
    if (!rule) return 0;
    const days = new Set<string>();
    completedIds.forEach((id) => {
      const [base, day] = id.split("@");
      if (rule.sources.includes(base) && day && /^\d{4}-/.test(day) && inMonth(day)) days.add(day);
    });
    return days.size;
  };

  // ---------- Leitura ----------

  const addChapter = (bookId: string, chapter: number) => {
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > 500) return "Número do capítulo entre 1 e 500.";
    // Verificação: precisa ter registrado páginas desse livro na semana
    const readThisWeek = (booksCtx?.logs ?? []).some((l) => l.bookId === bookId && inWeek(l.day));
    if (!readThisWeek) return "Registre as páginas lidas desse livro nesta semana (Minha Estante) antes.";
    if (ref.current.chapters.some((c) => c.bookId === bookId && c.chapter === chapter)) return "Esse capítulo já foi registrado.";
    update((d) => ({ ...d, chapters: [{ id: newId("cap"), bookId, chapter, day: dayKey(), at: Date.now() }, ...d.chapters] }));
    complete("lei-capitulo");
    return null;
  };

  const addBookNote = (bookId: string, text: string) => {
    const clean = text.trim();
    if (clean.length < 30) return "Anote pelo menos uma ideia (30+ letras).";
    update((d) => ({ ...d, bookNotes: [{ id: newId("bn"), bookId, text: clean.slice(0, 1500), day: dayKey(), at: Date.now() }, ...d.bookNotes] }));
    complete("lei-anotar");
    return null;
  };

  const saveReview = (bookId: string, text: string, rating: number, isPublic: boolean) => {
    const book = booksCtx?.books.find((b) => b.id === bookId);
    if (!book || book.status !== "concluido") return "A resenha é de um livro que você terminou.";
    const clean = text.trim();
    if (clean.length < 100) return `Escreva pelo menos 100 letras (faltam ${100 - clean.length}).`;
    if (rating < 1 || rating > 5) return "Dê de 1 a 5 estrelas.";
    const existing = ref.current.reviews.find((r) => r.bookId === bookId);
    update((d) => ({
      ...d,
      reviews: existing
        ? d.reviews.map((r) => (r.id === existing.id ? { ...r, text: clean.slice(0, 3000), rating, isPublic, editedAt: Date.now() } : r))
        : [{ id: newId("rv"), bookId, text: clean.slice(0, 3000), rating, isPublic, at: Date.now() }, ...d.reviews],
    }));
    if (!existing) complete("mes-lei-resenha");
    return null;
  };
  const removeReview = (id: string) => update((d) => ({ ...d, reviews: d.reviews.filter((r) => r.id !== id) }));

  const visitLibrary = (place: string, bookId: string | null) => {
    if (place.trim().length < 3) return "Qual biblioteca ou livraria?";
    if (!bookId) return "Escolha (ou cadastre) o livro do mês.";
    update((d) => ({ ...d, library: [{ id: newId("lib"), month, place: place.trim().slice(0, 60), bookId, at: Date.now() }, ...d.library] }));
    complete("mes-lei-biblioteca");
    return null;
  };

  // ---------- Prova ----------

  const periodFor = (taskId: string) =>
    CATALOG_BY_ID[taskId]?.frequency === "monthly" ? month : CATALOG_BY_ID[taskId]?.frequency === "weekly" ? week : today;

  const addProof = (taskId: string, text: string, file: FileRef | null) => {
    const clean = text.trim();
    // Semanal/mensal com comprovante: só conclui com foto ou documento (o texto é opcional)
    if (!file) return "Anexe uma foto ou um documento para concluir.";
    update((d) => ({
      ...d,
      proofs: [{ id: newId("pf"), taskId, period: periodFor(taskId), text: clean.slice(0, 500), file, at: Date.now() }, ...d.proofs],
    }));
    complete(taskId);
    return null;
  };
  const proofsOf = (taskId: string) => data.proofs.filter((p) => p.taskId === taskId);

  // ---------- Agenda pessoal ----------

  const saveEvent: PlannerContextType["saveEvent"] = (input) => {
    const eventsThisMonth = ref.current.events.filter((e) => monthKey(new Date(e.createdAt)) === monthKey()).length;
    if (!isPremium && !input.id && eventsThisMonth >= FREE_LIMITS.agendaMes) {
      return limitReached(`No plano grátis, dá para criar ${FREE_LIMITS.agendaMes} compromissos por mês.`);
    }
    const title = input.title.trim();
    if (title.length < 2) return "Dê um nome ao compromisso.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return "Data inválida.";
    if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return "Horário inválido (ex.: 14:30).";
    update((d) => {
      if (input.id) {
        return { ...d, events: d.events.map((e) => (e.id === input.id ? { ...e, ...input, id: e.id, title } : e)) };
      }
      return { ...d, events: [...d.events, { ...input, title, id: newId("ev"), createdAt: Date.now() }] };
    });
    // "Organizar a agenda": pelo menos 2 compromissos futuros cadastrados/atualizados na semana
    const upcoming = ref.current.events.filter((e) => e.day >= dayKey() && inWeek(dayKey(new Date(e.createdAt))));
    if (upcoming.length >= 2 || (input.id && upcoming.length >= 1)) complete("pro-agenda");
    return null;
  };
  const removeEvent = (id: string) => update((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }));

  // ---------- Metas próprias ----------

  const goalPeriod = (g: CustomGoal) => (g.frequency === "weekly" ? week : month);
  const inGoalPeriod = (g: CustomGoal, day: string) => (g.frequency === "weekly" ? inWeek(day) : inMonth(day));

  const customGoalProgress = (goal: CustomGoal) => {
    const done = goal.checkins.filter((day) => inGoalPeriod(goal, day)).length;
    return { done, complete: done >= goal.target };
  };

  const addCustomGoal = (title: string, frequency: CustomGoal["frequency"], target: number) => {
    const clean = title.trim();
    if (clean.length < 3) return "A meta precisa ter pelo menos 3 letras.";
    const min = CUSTOM_GOAL_MIN[frequency];
    const max = frequency === "weekly" ? 7 : 31;
    if (!Number.isInteger(target) || target < min || target > max) {
      return `Escolha de ${min} a ${max} dias (meta muito curta não vale XP).`;
    }
    if (ref.current.customGoals.filter((g) => g.frequency === frequency).length >= CUSTOM_GOAL_MAX) {
      return `Até ${CUSTOM_GOAL_MAX} metas próprias ${frequency === "weekly" ? "semanais" : "mensais"}.`;
    }
    update((d) => ({
      ...d,
      customGoals: [...d.customGoals, { id: newId("cg"), title: clean.slice(0, 50), frequency, target, checkins: [], notes: {}, createdAt: Date.now() }],
    }));
    return null;
  };
  const removeCustomGoal = (id: string) => update((d) => ({ ...d, customGoals: d.customGoals.filter((g) => g.id !== id) }));

  // Check-in: 1 por dia, só hoje; ao bater a meta do período ganha XP (metade)
  const checkInCustomGoal = (id: string, note: string) => {
    const goal = ref.current.customGoals.find((g) => g.id === id);
    if (!goal) return { error: "Meta não encontrada.", gained: 0 };
    const day = dayKey();
    if (goal.checkins.includes(day)) return { error: "Você já fez o check-in de hoje.", gained: 0 };
    if (goal.frequency === "monthly" && note.trim().length < 10) {
      return { error: "Nas mensais, conte o que fez hoje (10+ letras).", gained: 0 };
    }
    update((d) => ({
      ...d,
      customGoals: d.customGoals.map((g) =>
        g.id === id ? { ...g, checkins: [...g.checkins, day], notes: note.trim() ? { ...g.notes, [day]: note.trim().slice(0, 200) } : g.notes } : g,
      ),
    }));
    const updated = ref.current.customGoals.find((g) => g.id === id)!;
    if (!customGoalProgress(updated).complete || !xp) return { error: null, gained: 0 };
    const amount = CUSTOM_GOAL_XP[goal.frequency];
    const gained = xp.completeChallenge(`meta-${goal.id}@${goalPeriod(goal)}`, amount, `Meta própria: ${goal.title}`);
    return { error: null, gained: gained ? amount : 0 };
  };

  // ---------- Verificações que dependem de outras telas ----------
  // (sono regular, metas por contagem de dias, treinos do mês, livro do mês)

  const sleepLogs = extras?.sleepLogs ?? [];
  const sleepKey = sleepLogs.map((l) => `${l.day}${l.slept}`).join(",");
  useEffect(() => {
    if (!ready || !routine) return;
    const weekLogs = sleepLogs.filter((l) => inWeek(l.day));
    if (weekLogs.length >= 5 && bedtimeSpread(weekLogs.map((l) => l.slept)) <= 60) complete("son-rotina");
    const monthLogs = sleepLogs.filter((l) => inMonth(l.day));
    if (monthLogs.length >= 20 && bedtimeSpread(monthLogs.map((l) => l.slept)) <= 60) complete("mes-son-rotina");

    Object.keys(DAY_COUNT_TASKS).forEach((taskId) => {
      if (dayCount(taskId) >= targetOf(taskId)) complete(taskId);
    });
    if (trainedThisWeek.length >= 3) complete("atv-3treinos");
    if (trainingsThisMonth >= targetOf(TRAINING_MONTH_TASK)) complete(TRAINING_MONTH_TASK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sleepKey, completedIds.length, trainedThisWeek.length, trainingsThisMonth, data.monthTargets, routine?.tasks.length]);

  return (
    <PlannerContext.Provider
      value={{
        ...data,
        ready,
        week,
        month,
        today,
        addSimulado,
        removeSimulado,
        addVideo,
        watchVideo,
        removeVideo,
        studyItems,
        keywords,
        toggleReviewed,
        saveMindMap,
        removeMindMap,
        mealsOf,
        addMeal,
        removeMeal,
        setKcalGoal,
        trainedThisWeek,
        toggleTraining,
        trainingsThisMonth,
        addHobby,
        removeHobby,
        logHobby,
        hobbyMinutesThisWeek: hobbyMinutesIn(data),
        planCell,
        setPlanCell,
        addGoalCard,
        updateGoalCard,
        removeGoalCard,
        reviewGoal,
        goalStatus,
        saveProject,
        removeProject,
        addProjectNote,
        removeProjectNote,
        addProjectFile,
        removeProjectFile,
        finishProject,
        addRun,
        removeRun,
        runKmThisMonth,
        targetOf,
        setTarget,
        dayCount,
        addChapter,
        addBookNote,
        saveReview,
        removeReview,
        visitLibrary,
        addProof,
        proofsOf,
        saveEvent,
        removeEvent,
        addCustomGoal,
        removeCustomGoal,
        checkInCustomGoal,
        customGoalProgress,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
}
