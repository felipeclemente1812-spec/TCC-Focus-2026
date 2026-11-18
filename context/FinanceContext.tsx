import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";

import { GOAL_COLORS, MoneyType } from "@/constants/finance";
import { dayKey, monthKey, weekKey } from "@/constants/gamification";
import { RoutineContext } from "@/context/RoutineContext";
import { loadJSON, saveJSON } from "@/utils/localStore";
import { FREE_LIMITS, limitReached, PremiumContext } from "@/context/PremiumContext";

// Finanças (funções do Squill dentro do Focus): despesas e receitas,
// cofrinhos com depósitos, limite de gastos do mês e meta de economia.
// Ações que cumprem desafios da rotina concluem por ela (mesmo XP do app).
// Salvo na nuvem (Firestore: users/{uid}/data/...), por usuário — via utils/localStore.

export type Transaction = {
  id: string;
  type: MoneyType;
  name: string;
  amount: number;
  category: string;
  day: string; // "2026-10-29"
  createdAt: number;
};

export type Deposit = { id: string; amount: number; day: string };

export type SavingsGoal = {
  id: string;
  name: string;
  description: string;
  color: string;
  target: number;
  deadline: string; // "2026-12-31"
  deposits: Deposit[];
  createdAt: number;
};

type Saved = {
  transactions: Transaction[];
  goals: SavingsGoal[];
  monthlyLimit: number | null; // meta de consumo: quanto quer gastar no máximo no mês
  monthlySavings: number | null; // meta de economia do mês (quanto guardar)
  noSpendDays: string[]; // dias marcados como "hoje não gastei nada"
  readArticles: string[];
  closedMonths: string[]; // "M2026-10"
};

const EMPTY: Saved = {
  transactions: [],
  goals: [],
  monthlyLimit: null,
  monthlySavings: null,
  noSpendDays: [],
  readArticles: [],
  closedMonths: [],
};

const key = (uid: string) => `focus:v1:${uid}:financas`;

function isSaved(value: unknown): value is Partial<Saved> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const newId = (prefix: string) => `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// Desafios do catálogo que as finanças cumprem
export const FINANCE_TASKS = {
  daily: "fin-gastos", // anotar os gastos do dia
  review: "fin-orcamento", // revisar o orçamento (semanal)
  save: "fin-guardar", // guardar um valor (semanal)
  learn: "fin-aprender", // aprender algo sobre finanças (semanal)
  monthGoal: "mes-fin-meta", // bater a meta de economia do mês
  closeMonth: "mes-fin-planilha", // fechar a planilha de gastos do mês
};

export const goalSaved = (g: SavingsGoal) => g.deposits.reduce((s, d) => s + d.amount, 0);

export type TransactionInput = {
  type: MoneyType;
  name: string;
  amount: number;
  category: string;
  day: string;
};

type FinanceContextType = Saved & {
  ready: boolean;
  addTransaction: (input: TransactionInput) => string | null;
  updateTransaction: (id: string, input: TransactionInput) => string | null;
  removeTransaction: (id: string) => void;
  markNoSpendToday: () => void;
  setMonthlyLimit: (value: number | null) => void;
  setMonthlySavings: (value: number | null) => void;
  saveGoal: (goal: Omit<SavingsGoal, "id" | "deposits" | "createdAt">, id?: string) => string | null;
  removeGoal: (id: string) => void;
  quickGoal: (name: string, target: number, firstDeposit: number) => string | null;
  deposit: (goalId: string, amount: number) => void;
  savedThisMonth: number;
  markArticleRead: (id: string) => void;
  reviewBudget: () => void;
  closeMonth: () => void;
};

export const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ uid, children }: { uid: string; children: ReactNode }) {
  // Plano grátis: limites de uso (Focus Premium tira os limites)
  const isPremium = useContext(PremiumContext)?.isPremium ?? false;
  const routine = useContext(RoutineContext);
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
        ref.current = { ...EMPTY, ...saved };
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

  // Conclui pela rotina (só se o desafio estiver nela e ainda não feito)
  const complete = (taskId: string) => {
    const task = routine?.tasks.find((t) => t.id === taskId);
    if (task && !routine?.isDone(task)) routine?.completeTask(task);
  };

  const validate = (input: TransactionInput) => {
    if (input.name.trim().length < 2) return "Dê um nome ao lançamento (ex.: Lanche).";
    if (!(input.amount > 0)) return "Digite um valor maior que zero.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return "Data inválida.";
    if (input.day > dayKey()) return "A data não pode ser no futuro.";
    return null;
  };

  const addTransaction = (input: TransactionInput) => {
    const inMonth = ref.current.transactions.filter((t) => monthKey(new Date(t.createdAt)) === monthKey()).length;
    if (!isPremium && inMonth >= FREE_LIMITS.lancamentosMes) {
      return limitReached(`No plano grátis, dá para anotar ${FREE_LIMITS.lancamentosMes} lançamentos por mês.`);
    }
    const err = validate(input);
    if (err) return err;
    const t: Transaction = { ...input, name: input.name.trim().slice(0, 40), id: newId("t"), createdAt: Date.now() };
    update((d) => ({ ...d, transactions: [t, ...d.transactions] }));
    // Anotou algo de hoje: cumpre "Anotar os gastos do dia"
    if (input.day === dayKey()) complete(FINANCE_TASKS.daily);
    return null;
  };

  // Editar não dá XP de novo
  const updateTransaction = (id: string, input: TransactionInput) => {
    const err = validate(input);
    if (err) return err;
    update((d) => ({
      ...d,
      transactions: d.transactions.map((t) =>
        t.id === id ? { ...t, ...input, name: input.name.trim().slice(0, 40) } : t,
      ),
    }));
    return null;
  };

  const removeTransaction = (id: string) =>
    update((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));

  const markNoSpendToday = () => {
    update((d) => ({ ...d, noSpendDays: [...new Set([...d.noSpendDays, dayKey()])] }));
    complete(FINANCE_TASKS.daily);
  };

  const setMonthlyLimit = (value: number | null) => update((d) => ({ ...d, monthlyLimit: value }));

  const savedInMonth = (goals: SavingsGoal[], month = monthKey()) =>
    goals
      .flatMap((g) => g.deposits)
      .filter((dep) => monthKey(new Date(`${dep.day}T12:00:00`)) === month)
      .reduce((s, dep) => s + dep.amount, 0);

  const checkMonthGoal = () => {
    const goal = ref.current.monthlySavings;
    if (goal && savedInMonth(ref.current.goals) >= goal) complete(FINANCE_TASKS.monthGoal);
  };

  const setMonthlySavings = (value: number | null) => {
    update((d) => ({ ...d, monthlySavings: value }));
    checkMonthGoal();
  };

  const saveGoal = (goal: Omit<SavingsGoal, "id" | "deposits" | "createdAt">, id?: string) => {
    if (!isPremium && !id && ref.current.goals.length >= FREE_LIMITS.cofrinhos) {
      return limitReached(`No plano grátis, dá para ter ${FREE_LIMITS.cofrinhos} cofrinho.`);
    }
    if (goal.name.trim().length < 2) return "Dê um nome ao cofrinho.";
    if (!(goal.target > 0)) return "Digite o valor que quer juntar.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(goal.deadline)) return "Prazo inválido. Use dd/mm/aa.";
    if (!id && goal.deadline <= dayKey()) return "O prazo precisa ser depois de hoje.";
    const clean = { ...goal, name: goal.name.trim().slice(0, 40), description: goal.description.trim().slice(0, 120) };
    update((d) => ({
      ...d,
      goals: id
        ? d.goals.map((g) => (g.id === id ? { ...g, ...clean } : g))
        : [{ ...clean, id: newId("g"), deposits: [], createdAt: Date.now() }, ...d.goals],
    }));
    return null;
  };

  // Atalho para guardar sem abrir Minhas finanças: cria o cofrinho (prazo de
  // 6 meses, dá para editar depois) e já registra o primeiro valor
  const quickGoal = (name: string, target: number, firstDeposit: number) => {
    if (!(firstDeposit > 0)) return "Digite quanto guardou (ex.: 20).";
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    const color = GOAL_COLORS[ref.current.goals.length % GOAL_COLORS.length];
    const err = saveGoal({ name, description: "", target, deadline: dayKey(end), color });
    if (err) return err;
    deposit(ref.current.goals[0].id, firstDeposit);
    return null;
  };

  const removeGoal = (id: string) => update((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));

  const deposit = (goalId: string, amount: number) => {
    if (!(amount > 0)) return;
    update((d) => ({
      ...d,
      goals: d.goals.map((g) =>
        g.id === goalId ? { ...g, deposits: [...g.deposits, { id: newId("d"), amount, day: dayKey() }] } : g,
      ),
    }));
    // Guardou dinheiro nesta semana: cumpre "Guardar um valor"
    complete(FINANCE_TASKS.save);
    checkMonthGoal();
  };

  const markArticleRead = (id: string) => {
    update((d) => ({ ...d, readArticles: [...new Set([...d.readArticles, id])] }));
    complete(FINANCE_TASKS.learn);
  };

  const reviewBudget = () => complete(FINANCE_TASKS.review);

  const closeMonth = () => {
    update((d) => ({ ...d, closedMonths: [...new Set([...d.closedMonths, monthKey()])] }));
    complete(FINANCE_TASKS.closeMonth);
  };

  return (
    <FinanceContext.Provider
      value={{
        ...data,
        ready,
        addTransaction,
        updateTransaction,
        removeTransaction,
        markNoSpendToday,
        setMonthlyLimit,
        setMonthlySavings,
        saveGoal,
        removeGoal,
        quickGoal,
        deposit,
        savedThisMonth: savedInMonth(data.goals),
        markArticleRead,
        reviewBudget,
        closeMonth,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

// ---------- Cálculos para o resumo e os gráficos ----------

export type Period = "day" | "week" | "month";

export const PERIOD_LABEL: Record<Period, string> = { day: "Hoje", week: "Semana", month: "Mês" };

// A semana começa na segunda, como o resto do Focus
export function inPeriod(day: string, period: Period, ref = new Date()) {
  const date = new Date(`${day}T12:00:00`);
  if (period === "day") return day === dayKey(ref);
  if (period === "week") return weekKey(date) === weekKey(ref);
  return monthKey(date) === monthKey(ref);
}

export function totals(list: Transaction[]) {
  const income = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}

// Barras por dia: semana = seg..dom; mês = 1..último dia
export function dailySeries(list: Transaction[], type: MoneyType, period: "week" | "month", ref = new Date()) {
  const days: { day: string; label: string }[] = [];
  if (period === "week") {
    const monday = new Date(ref);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const names = ["S", "T", "Q", "Q", "S", "S", "D"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({ day: dayKey(d), label: names[i] });
    }
  } else {
    const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= last; i++) {
      const d = new Date(ref.getFullYear(), ref.getMonth(), i);
      days.push({ day: dayKey(d), label: i % 5 === 0 || i === 1 ? String(i) : "" });
    }
  }
  return days.map(({ day, label }) => ({
    day,
    label,
    value: list.filter((t) => t.type === type && t.day === day).reduce((s, t) => s + t.amount, 0),
  }));
}

export function byCategory(list: Transaction[], type: MoneyType) {
  const map = new Map<string, number>();
  list.filter((t) => t.type === type).forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([category, value]) => ({ category, value, pct: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

// Últimos n meses (do mais antigo ao atual), com rótulo curto: "out"
function lastMonths(n: number, ref = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(ref.getFullYear(), ref.getMonth() - (n - 1 - i), 1);
    return { key: monthKey(d), label: d.toLocaleString("pt-BR", { month: "short" }).replace(".", "") };
  });
}

// Receitas x despesas por mês (gráfico de comparação)
export function monthlySeries(list: Transaction[], n = 6) {
  return lastMonths(n).map(({ key: m, label }) => {
    const inMonth = list.filter((t) => monthKey(new Date(`${t.day}T12:00:00`)) === m);
    const sum = totals(inMonth);
    return { month: m, label, income: sum.income, expense: sum.expense };
  });
}

// Quanto foi guardado nos cofrinhos em cada mês
export function savedSeries(goals: SavingsGoal[], n = 6) {
  const deposits = goals.flatMap((g) => g.deposits);
  return lastMonths(n).map(({ key: m, label }) => ({
    month: m,
    label,
    value: deposits.filter((d) => monthKey(new Date(`${d.day}T12:00:00`)) === m).reduce((s, d) => s + d.amount, 0),
  }));
}
