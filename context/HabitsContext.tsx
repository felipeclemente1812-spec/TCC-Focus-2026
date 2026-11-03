import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  dayKey,
  HABIT_XP,
  PUNCTUALITY_BONUS,
  PUNCTUALITY_WINDOW_MIN,
} from "@/constants/gamification";
import { XPContext } from "@/context/XPContext";
import { loadJSON, saveJSON } from "@/utils/localStore";

// Hábitos criados pela pessoa: dias da semana, horário opcional e
// bônus de pontualidade. O XP vai para o mesmo XPContext (sem 2ª fonte).
// Salvo LOCALMENTE neste aparelho, por usuário.

export type Habit = {
  id: string;
  title: string;
  days: number[]; // 0 = domingo ... 6 = sábado
  time: string | null; // "HH:MM" ou null (sem horário)
  createdAt: number;
};

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// Ordem de exibição começando na segunda
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const MAX_HABITS = 10;

const key = (uid: string) => `focus:v1:${uid}:habitos`;

export const habitOccurrenceId = (habit: Habit, date = new Date()) =>
  `hab-${habit.id}@${dayKey(date)}`;
const punctualityId = (habit: Habit, date = new Date()) =>
  `pont-${habit.id}@${dayKey(date)}`;

export const isScheduled = (habit: Habit, date = new Date()) =>
  habit.days.includes(date.getDay());

export function describeDays(days: number[]) {
  if (days.length === 7) return "Todos os dias";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Dias úteis";
  return WEEK_ORDER.filter((d) => days.includes(d))
    .map((d) => DAY_SHORT[d])
    .join(", ");
}

// Minutos de diferença entre agora e o horário do hábito hoje
export function minutesFromTime(time: string, now = new Date()) {
  const [h, m] = time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return Math.round((now.getTime() - target.getTime()) / 60000);
}

export const isPunctualNow = (time: string, now = new Date()) =>
  Math.abs(minutesFromTime(time, now)) <= PUNCTUALITY_WINDOW_MIN;

function validate(title: string, days: number[], time: string | null) {
  const clean = title.trim();
  if (clean.length < 3) return "O hábito precisa ter pelo menos 3 caracteres.";
  if (clean.length > 40) return "O hábito pode ter no máximo 40 caracteres.";
  if (days.length === 0) return "Escolha pelo menos um dia (ou use “Todos os dias”).";
  if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return "Horário inválido. Use o formato 19:00.";
  }
  return null;
}

function isHabitList(value: unknown): value is Habit[] {
  return (
    Array.isArray(value) &&
    value.every(
      (h) =>
        h &&
        typeof h.id === "string" &&
        typeof h.title === "string" &&
        Array.isArray(h.days) &&
        (h.time === null || typeof h.time === "string"),
    )
  );
}

export type HabitResult = { gained: number; punctual: boolean };

type HabitsContextType = {
  ready: boolean;
  habits: Habit[];
  todayHabits: Habit[]; // programados para hoje
  isDoneToday: (habit: Habit) => boolean;
  addHabit: (title: string, days: number[], time: string | null) => string | null;
  updateHabit: (id: string, title: string, days: number[], time: string | null) => string | null;
  removeHabit: (id: string) => void;
  completeHabit: (habit: Habit) => HabitResult;
  habitStreak: number; // dias PROGRAMADOS seguidos com todos os hábitos feitos
};

export const HabitsContext = createContext<HabitsContextType | null>(null);

export function HabitsProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const xpContext = useContext(XPContext);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [ready, setReady] = useState(!uid);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    loadJSON(key(uid), isHabitList).then((saved) => {
      if (!active) return;
      if (saved) setHabits(saved);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    saveJSON(key(uid), habits);
  }, [uid, ready, habits]);

  if (!xpContext) throw new Error("HabitsProvider precisa estar dentro do XPProvider");
  const { completedIds, completeChallenge } = xpContext;

  const isDoneOn = (habit: Habit, date: Date) =>
    completedIds.includes(habitOccurrenceId(habit, date));

  const isDoneToday = (habit: Habit) => isDoneOn(habit, new Date());

  const todayHabits = habits.filter((h) => isScheduled(h));

  const addHabit = (title: string, days: number[], time: string | null) => {
    const error = validate(title, days, time);
    if (error) return error;
    if (habits.length >= MAX_HABITS) return `Limite de ${MAX_HABITS} hábitos.`;
    if (habits.some((h) => h.title.toLowerCase() === title.trim().toLowerCase())) {
      return "Você já tem um hábito com esse nome.";
    }
    setHabits((prev) => [
      ...prev,
      { id: `h${Date.now()}`, title: title.trim(), days: [...days].sort(), time, createdAt: Date.now() },
    ]);
    return null;
  };

  // Editar não mexe no XP já ganho (as conclusões ficam no histórico)
  const updateHabit = (id: string, title: string, days: number[], time: string | null) => {
    const error = validate(title, days, time);
    if (error) return error;
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, title: title.trim(), days: [...days].sort(), time } : h)),
    );
    return null;
  };

  const removeHabit = (id: string) => setHabits((prev) => prev.filter((h) => h.id !== id));

  // Concluir: XP do hábito + bônus se dentro da janela do horário.
  // Ids por dia impedem ganho duplicado (desmarcar não existe; remarcar não soma).
  const completeHabit = (habit: Habit): HabitResult => {
    if (!isScheduled(habit)) return { gained: 0, punctual: false };
    if (!completeChallenge(habitOccurrenceId(habit), HABIT_XP, habit.title)) {
      return { gained: 0, punctual: false };
    }
    if (habit.time && isPunctualNow(habit.time)) {
      completeChallenge(
        punctualityId(habit),
        PUNCTUALITY_BONUS,
        `Pontualidade: ${habit.title} (${habit.time})`,
      );
      return { gained: HABIT_XP + PUNCTUALITY_BONUS, punctual: true };
    }
    return { gained: HABIT_XP, punctual: false };
  };

  // Sequência dos hábitos: só dias com algum hábito programado contam;
  // dia sem hábito programado não quebra a sequência.
  // Usa os dias programados atuais de cada hábito.
  let habitStreak = 0;
  if (habits.length > 0) {
    const cursor = new Date();
    // Hoje ainda incompleto não quebra (o dia não acabou)
    const today = habits.filter((h) => isScheduled(h, cursor));
    if (today.length > 0 && !today.every((h) => isDoneOn(h, cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    for (let i = 0; i < 400; i++) {
      // Hábitos criados depois desse dia não contam para ele
      const endOfDay = new Date(cursor);
      endOfDay.setHours(23, 59, 59, 999);
      const scheduled = habits.filter(
        (h) => isScheduled(h, cursor) && h.createdAt <= endOfDay.getTime(),
      );
      if (scheduled.length > 0) {
        if (!scheduled.every((h) => isDoneOn(h, cursor))) break;
        habitStreak++;
      } else if (habits.every((h) => h.createdAt > endOfDay.getTime())) {
        break; // antes de existir qualquer hábito
      }
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return (
    <HabitsContext.Provider
      value={{
        ready,
        habits,
        todayHabits,
        isDoneToday,
        addHabit,
        updateHabit,
        removeHabit,
        completeHabit,
        habitStreak,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}
