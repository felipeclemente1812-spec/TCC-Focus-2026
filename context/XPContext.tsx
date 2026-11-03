import React, { createContext, ReactNode, useEffect, useRef, useState } from "react";

import {
  Completion,
  computeStats,
  GamificationStats,
  levelInfo,
} from "@/constants/gamification";
import { loadJSON, saveJSON, storageKeys } from "@/utils/localStore";

export { XP_PER_LEVEL } from "@/constants/gamification";

// Progresso salvo LOCALMENTE neste aparelho, por usuário (utils/localStore).
// Quando o backend existir, trocar a implementação mantendo esta interface.

type SavedProgress = {
  completions: Completion[];
  unlockedAt: Record<string, number>;
};

function isSavedProgress(value: unknown): value is SavedProgress {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedProgress;
  return (
    Array.isArray(v.completions) &&
    v.completions.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.xp === "number" &&
        typeof c.at === "number",
    ) &&
    !!v.unlockedAt &&
    typeof v.unlockedAt === "object" &&
    Object.values(v.unlockedAt).every((t) => typeof t === "number")
  );
}

type XPContextType = GamificationStats & {
  ready: boolean; // false enquanto carrega o progresso salvo
  level: number;
  xpInLevel: number;
  xpToNext: number;
  progress: number; // 0–100
  completedIds: string[];
  lastGain: number | null; // último ganho, para a tela de Conclusão
  lastUnlocked: string[]; // conquistas liberadas no último ganho
  lastLevelUp: number | null; // nível alcançado no último ganho (null se não subiu)
  unlockedAt: Record<string, number>; // id da conquista -> quando foi liberada
  history: Completion[]; // conclusões, da mais recente para a mais antiga
  // false se já concluído; title aparece no histórico
  completeChallenge: (id: string, amount: number, title?: string) => boolean;
  isCompleted: (id: string) => boolean; // leitura síncrona (sem esperar render)
  unlockAchievements: (ids: string[]) => void;
  resetProgress: () => void;
};

export const XPContext = createContext<XPContextType | null>(null);

// uid vazio = sem sessão: nada é carregado nem salvo
export function XPProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [unlockedAt, setUnlockedAt] = useState<Record<string, number>>({});
  const [lastGain, setLastGain] = useState<number | null>(null);
  const [lastUnlocked, setLastUnlocked] = useState<string[]>([]);
  const [lastLevelUp, setLastLevelUp] = useState<number | null>(null);
  const [ready, setReady] = useState(!uid);

  // Espelho síncrono: evita ganho duplicado em toques rápidos seguidos
  const completionsRef = useRef<Completion[]>([]);
  const unlockedRef = useRef<Record<string, number>>({});

  // Carrega o progresso deste usuário ao abrir a sessão
  useEffect(() => {
    if (!uid) return;
    let active = true;
    loadJSON(storageKeys.progress(uid), isSavedProgress).then((saved) => {
      if (!active) return;
      if (saved) {
        completionsRef.current = saved.completions;
        unlockedRef.current = saved.unlockedAt;
        setCompletions(saved.completions);
        setUnlockedAt(saved.unlockedAt);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  // Salva a cada mudança (só depois de carregar, para não sobrescrever)
  useEffect(() => {
    if (!uid || !ready) return;
    saveJSON(storageKeys.progress(uid), { completions, unlockedAt });
  }, [uid, ready, completions, unlockedAt]);

  const isCompleted = (id: string) =>
    completionsRef.current.some((c) => c.id === id);

  const completeChallenge = (id: string, amount: number, title?: string) => {
    if (isCompleted(id)) return false;

    const now = Date.now();
    const previousLevel = levelInfo(computeStats(completionsRef.current).xp).level;
    const next = [...completionsRef.current, { id, xp: amount, at: now, title }];
    completionsRef.current = next;
    setCompletions(next);

    // As conquistas são verificadas pelo AchievementsWatcher (SessionProviders),
    // que também enxerga hábitos; aqui só o nível
    const newLevel = levelInfo(computeStats(next).xp).level;
    setLastLevelUp(newLevel > previousLevel ? newLevel : null);
    setLastGain(amount);
    return true;
  };

  // Registra conquistas liberadas (uma vez cada, com a data)
  const unlockAchievements = (ids: string[]) => {
    const newly = ids.filter((aid) => !unlockedRef.current[aid]);
    if (newly.length === 0) return;
    const now = Date.now();
    const nextUnlocked = { ...unlockedRef.current };
    newly.forEach((aid) => (nextUnlocked[aid] = now));
    unlockedRef.current = nextUnlocked;
    setUnlockedAt(nextUnlocked);
    setLastUnlocked(newly);
  };

  const resetProgress = () => {
    completionsRef.current = [];
    unlockedRef.current = {};
    setCompletions([]);
    setUnlockedAt({});
    setLastGain(null);
    setLastUnlocked([]);
    setLastLevelUp(null);
  };

  const stats = computeStats(completions);

  return (
    <XPContext.Provider
      value={{
        ...stats,
        ...levelInfo(stats.xp),
        ready,
        completedIds: completions.map((c) => c.id),
        lastGain,
        lastUnlocked,
        lastLevelUp,
        unlockedAt,
        history: [...completions].reverse(),
        completeChallenge,
        isCompleted,
        unlockAchievements,
        resetProgress,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}
