import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  CATALOG_BY_ID,
  CatalogChallenge,
  DEFAULT_ROUTINE_IDS,
  Frequency,
} from "@/constants/challenges";
import {
  CYCLE_BONUS,
  periodIdFor,
  XP_BY_FREQUENCY,
} from "@/constants/gamification";
import { XPContext } from "@/context/XPContext";
import { loadJSON, saveJSON, storageKeys } from "@/utils/localStore";

export type { Frequency } from "@/constants/challenges";

// Rotina (ciclo de tarefas): o usuário escolhe desafios do catálogo
// e eles reiniciam sozinhos a cada dia, semana ou mês.
// Salvo na nuvem (Firestore: users/{uid}/data/...), por usuário — via utils/localStore.

export type RoutineTask = CatalogChallenge & { xp: number; customized: boolean };

// Ajustes da pessoa nos desafios prontos (nome e descrição, como nos hábitos).
// O XP, o ciclo e a verificação continuam os do catálogo.
export type TaskCustomization = { title?: string; description?: string };

export const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly"];

// Metas maiores, listas menores
export const MAX_TASKS: Record<Frequency, number> = {
  daily: 8,
  weekly: 6,
  monthly: 4,
};

export const CYCLE_LABEL: Record<Frequency, string> = {
  daily: "Ciclo diário",
  weekly: "Ciclo semanal",
  monthly: "Ciclo mensal",
};

// Id da conclusão no período atual (dia, semana ou mês)
export function periodId(task: Pick<RoutineTask, "id" | "frequency">) {
  return periodIdFor(task.id, task.frequency);
}

function cycleBonusId(frequency: Frequency) {
  return periodId({ id: `ciclo-${frequency}`, frequency });
}

function toTask(id: string, custom?: TaskCustomization): RoutineTask | null {
  const item = CATALOG_BY_ID[id];
  if (!item) return null;
  return {
    ...item,
    title: custom?.title || item.title,
    description: custom?.description || item.description,
    xp: XP_BY_FREQUENCY[item.frequency],
    customized: !!(custom?.title || custom?.description),
  };
}

const customKey = (uid: string) => `focus:v1:${uid}:ajustes-rotina`;
const isCustomMap = (v: unknown): v is Record<string, TaskCustomization> => !!v && typeof v === "object" && !Array.isArray(v);

export type CompleteResult = {
  gained: number; // XP do desafio + bônus (0 se já estava concluído)
  cycleClosed: boolean;
};

type RoutineContextType = {
  ready: boolean; // false enquanto carrega a rotina salva
  planned: boolean; // false até o usuário montar (ou pular) o plano inicial
  applyPlan: (catalogIds: string[]) => void; // define a rotina inteira de uma vez
  tasks: RoutineTask[];
  isSelected: (catalogId: string) => boolean;
  // Devolve mensagem de erro ou null
  addFromCatalog: (catalogId: string) => string | null;
  removeTask: (catalogId: string) => void;
  customizeTask: (catalogId: string, custom: TaskCustomization) => string | null;
  resetTask: (catalogId: string) => void;
  completeTask: (task: RoutineTask) => CompleteResult;
  isDone: (task: RoutineTask) => boolean;
  cycleStatus: (frequency: Frequency) => {
    done: number;
    total: number;
    closed: boolean;
  };
};

export const RoutineContext = createContext<RoutineContextType | null>(null);

type SavedRoutine = { selectedIds: string[]; planned?: boolean };

// Lista de ids em texto; os que saíram do catálogo são descartados ao carregar
// (antes, um id removido apagava a rotina inteira)
function isSavedRoutine(value: unknown): value is SavedRoutine {
  if (!value || typeof value !== "object") return false;
  const ids = (value as { selectedIds?: unknown }).selectedIds;
  return Array.isArray(ids) && ids.every((id) => typeof id === "string");
}

// Respeita os limites de cada ciclo (descarta excedentes)
function withinLimits(ids: string[]) {
  const count: Record<Frequency, number> = { daily: 0, weekly: 0, monthly: 0 };
  return ids.filter((id) => {
    const item = CATALOG_BY_ID[id];
    if (!item || count[item.frequency] >= MAX_TASKS[item.frequency]) return false;
    count[item.frequency]++;
    return true;
  });
}

// uid vazio = sem sessão: usa a rotina padrão e não salva
export function RoutineProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const xpContext = useContext(XPContext);
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_ROUTINE_IDS);
  const [planned, setPlanned] = useState(!uid);
  const [ready, setReady] = useState(!uid);
  const [customs, setCustoms] = useState<Record<string, TaskCustomization>>({});

  useEffect(() => {
    if (!uid) return;
    loadJSON(customKey(uid), isCustomMap).then((saved) => saved && setCustoms(saved));
  }, [uid]);

  const saveCustoms = (next: Record<string, TaskCustomization>) => {
    setCustoms(next);
    if (uid) saveJSON(customKey(uid), next);
  };

  const customizeTask = (catalogId: string, custom: TaskCustomization) => {
    const title = custom.title?.trim() ?? "";
    const description = custom.description?.trim() ?? "";
    if (title && (title.length < 3 || title.length > 50)) return "O nome precisa ter de 3 a 50 letras.";
    if (description.length > 140) return "A descrição pode ter até 140 letras.";
    saveCustoms({ ...customs, [catalogId]: { title: title || undefined, description: description || undefined } });
    return null;
  };

  const resetTask = (catalogId: string) => {
    const next = { ...customs };
    delete next[catalogId];
    saveCustoms(next);
  };

  // Rotina salva neste aparelho para este usuário.
  // Sem nada salvo = conta nova neste aparelho -> mostra o plano inicial.
  useEffect(() => {
    if (!uid) return;
    let active = true;
    loadJSON(storageKeys.routine(uid), isSavedRoutine).then((saved) => {
      if (!active) return;
      if (saved) {
        setSelectedIds(withinLimits([...new Set(saved.selectedIds)]));
        // Rotinas salvas antes do plano existir contam como já planejadas
        setPlanned(saved.planned ?? true);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    saveJSON(storageKeys.routine(uid), { selectedIds, planned });
  }, [uid, ready, selectedIds, planned]);

  const applyPlan = (catalogIds: string[]) => {
    setSelectedIds(withinLimits([...new Set(catalogIds)]));
    setPlanned(true);
  };

  if (!xpContext) throw new Error("RoutineProvider precisa estar dentro do XPProvider");

  // completedIds (estado) para renderizar; isCompleted (ref) só em eventos,
  // onde precisamos do valor atualizado antes do próximo render
  const { completeChallenge, isCompleted, completedIds } = xpContext;

  const tasks = selectedIds
    .map((id) => toTask(id, customs[id]))
    .filter((t): t is RoutineTask => t !== null);

  const isSelected = (catalogId: string) => selectedIds.includes(catalogId);

  const isDone = (task: RoutineTask) => completedIds.includes(periodId(task));

  const addFromCatalog = (catalogId: string) => {
    const item = CATALOG_BY_ID[catalogId];
    if (!item) return "Desafio não encontrado.";
    if (isSelected(catalogId)) return "Esse desafio já está na sua rotina.";

    const sameCycle = tasks.filter((t) => t.frequency === item.frequency);
    const max = MAX_TASKS[item.frequency];
    if (sameCycle.length >= max) {
      return `Seu ${CYCLE_LABEL[item.frequency].toLowerCase()} já tem ${max} desafios. Remova um para adicionar outro.`;
    }

    setSelectedIds((prev) => [...prev, catalogId]);
    return null;
  };

  const removeTask = (catalogId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== catalogId));

    // Se o que sobrou no ciclo já está todo concluído, o ciclo fecha agora
    // (sem isso, remover o último pendente deixava o bônus inalcançável)
    const removed = CATALOG_BY_ID[catalogId];
    if (!removed) return;
    const remaining = tasks.filter(
      (t) => t.frequency === removed.frequency && t.id !== catalogId,
    );
    if (remaining.length > 0 && remaining.every((t) => isCompleted(periodId(t)))) {
      completeChallenge(
        cycleBonusId(removed.frequency),
        CYCLE_BONUS[removed.frequency],
        `${CYCLE_LABEL[removed.frequency]} completo`,
      );
    }
  };

  const cycleStatus = (frequency: Frequency) => {
    const cycle = tasks.filter((t) => t.frequency === frequency);
    return {
      done: cycle.filter(isDone).length,
      total: cycle.length,
      closed: completedIds.includes(cycleBonusId(frequency)),
    };
  };

  const completeTask = (task: RoutineTask): CompleteResult => {
    if (!completeChallenge(periodId(task), task.xp, task.title)) {
      return { gained: 0, cycleClosed: false };
    }

    // Fechou o ciclo? (todos os desafios do período concluídos)
    const cycle = tasks.filter((t) => t.frequency === task.frequency);
    const allDone = cycle.every((t) => isCompleted(periodId(t)));
    const bonus = CYCLE_BONUS[task.frequency];

    if (
      allDone &&
      completeChallenge(
        cycleBonusId(task.frequency),
        bonus,
        `${CYCLE_LABEL[task.frequency]} completo`,
      )
    ) {
      return { gained: task.xp + bonus, cycleClosed: true };
    }

    return { gained: task.xp, cycleClosed: false };
  };

  return (
    <RoutineContext.Provider
      value={{
        ready,
        planned,
        applyPlan,
        tasks,
        isSelected,
        addFromCatalog,
        removeTask,
        customizeTask,
        resetTask,
        completeTask,
        isDone,
        cycleStatus,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
}
