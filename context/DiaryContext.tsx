import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { dayKey } from "@/constants/gamification";
import { RoutineContext } from "@/context/RoutineContext";
import { loadJSON, saveJSON } from "@/utils/localStore";
import { FREE_LIMITS, limitReached, PremiumContext } from "@/context/PremiumContext";

// Diário (telas da Angela dentro do Focus, com o visual do app): anotações com
// título, texto, cor de destaque, fonte e tamanho da letra. Escrever hoje (com conteúdo de verdade) cumpre "Escrever no diário".
// Salvo na nuvem (Firestore: users/{uid}/data/...), por usuário — via utils/localStore.

export type DiaryEntry = {
  id: string;
  title: string;
  content: string;
  color: string;
  font?: DiaryFont; // anotações antigas não têm: usam a padrão
  size?: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

// Cores do papel (Figma do Lucas): cada uma tem o seu fundo de tela
export type DiaryTheme = { id: string; paper: string; bg: string; header: string; accent: string };
export const DIARY_THEMES: DiaryTheme[] = [
  { id: "amarelo", paper: "#FFF7B1", bg: "#6E4C2E", header: "#4B321D", accent: "#F59E0B" },
  { id: "azul", paper: "#D1E8FF", bg: "#2F4C68", header: "#21374D", accent: "#0EA5E9" },
  { id: "rosa", paper: "#FFD1E8", bg: "#8A5730", header: "#653E20", accent: "#EC4899" },
  { id: "verde", paper: "#D1FFD1", bg: "#2F5B45", header: "#21432F", accent: "#15A638" },
];
export const DIARY_COLORS = DIARY_THEMES.map((t) => ({ id: t.id, code: t.paper }));
// Anotações da versão roxa guardaram a cor de destaque: volta para o papel
const FROM_ACCENT: Record<string, string> = {
  "#F59E0B": "#FFF7B1",
  "#0EA5E9": "#D1E8FF",
  "#EC4899": "#FFD1E8",
  "#15A638": "#D1FFD1",
  "#7C3AED": "#D1E8FF",
  "#B832E5": "#FFD1E8",
};
export const themeOf = (color?: string): DiaryTheme =>
  DIARY_THEMES.find((t) => t.paper === (FROM_ACCENT[color ?? ""] ?? color)) ?? DIARY_THEMES[0];
// Cor forte da anotação (para bordas nas telas roxas, ex.: tarefa do diário)
export const accentOf = (color: string) => themeOf(color).accent;

export type DiaryFont = "padrao" | "serifa" | "maquina";
export const DIARY_FONTS: { id: DiaryFont; label: string; family: string | undefined }[] = [
  { id: "padrao", label: "Padrão", family: undefined },
  {
    id: "serifa",
    label: "Clássica",
    family: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" }),
  },
  { id: "maquina", label: "Máquina de escrever", family: "SpaceMono" },
];
export const DIARY_SIZES = [
  { id: 14, label: "P" },
  { id: 16, label: "M" },
  { id: 19, label: "G" },
  { id: 22, label: "GG" },
];
export const fontFamilyOf = (font?: DiaryFont) => DIARY_FONTS.find((f) => f.id === font)?.family;

export const DIARY_TASK = "men-diario";
// Anti-farm: só conta para o XP com um texto de verdade
export const DIARY_MIN_CHARS = 30;

type DiaryInput = { title: string; content: string; color: string; font: DiaryFont; size: number };

type DiaryContextType = {
  ready: boolean;
  entries: DiaryEntry[]; // mais recente primeiro
  getEntry: (id: string) => DiaryEntry | undefined;
  addEntry: (input: DiaryInput) => { error: string | null; counted: boolean };
  updateEntry: (id: string, input: DiaryInput) => { error: string | null; counted: boolean };
  removeEntry: (id: string) => void;
  wroteToday: boolean;
};

const key = (uid: string) => `focus:v1:${uid}:diario`;
const isEntries = (v: unknown): v is DiaryEntry[] => Array.isArray(v);
const newId = () => `dia${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const letters = (t: string) => t.replace(/\s/g, "").length;

export const DiaryContext = createContext<DiaryContextType | null>(null);

export function DiaryProvider({ uid, children }: { uid: string; children: ReactNode }) {
  // Plano grátis: limites de uso (Focus Premium tira os limites)
  const isPremium = useContext(PremiumContext)?.isPremium ?? false;
  const routine = useContext(RoutineContext);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [ready, setReady] = useState(!uid);
  const ref = useRef<DiaryEntry[]>([]);
  const update = (fn: (list: DiaryEntry[]) => DiaryEntry[]) => {
    ref.current = fn(ref.current);
    setEntries(ref.current);
  };

  useEffect(() => {
    if (!uid) return;
    let active = true;
    loadJSON(key(uid), isEntries).then((saved) => {
      if (!active) return;
      if (saved) {
        ref.current = saved;
        setEntries(saved);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    saveJSON(key(uid), entries);
  }, [uid, ready, entries]);

  // Texto de hoje com 30+ letras conclui o desafio (se estiver na rotina)
  const tryComplete = (entry: DiaryEntry) => {
    if (dayKey(new Date(entry.createdAt)) !== dayKey() || letters(entry.content) < DIARY_MIN_CHARS) return false;
    const task = routine?.tasks.find((t) => t.id === DIARY_TASK);
    if (task && !routine?.isDone(task)) routine?.completeTask(task);
    return true;
  };

  const validate = (input: DiaryInput) =>
    !input.title.trim() && !input.content.trim() ? "Escreva alguma coisa antes de salvar." : null;

  const addEntry = (input: DiaryInput) => {
    const writtenToday = ref.current.filter((e) => dayKey(new Date(e.createdAt)) === dayKey()).length;
    if (!isPremium && writtenToday >= FREE_LIMITS.diarioDia) {
      return { error: limitReached("No plano grátis, dá para escrever 1 anotação por dia (você pode editar a de hoje)."), counted: false };
    }
    const error = validate(input);
    if (error) return { error, counted: false };
    const now = new Date().toISOString();
    const entry: DiaryEntry = {
      id: newId(),
      title: input.title.trim().slice(0, 60),
      content: input.content.slice(0, 5000),
      color: input.color,
      font: input.font,
      size: input.size,
      createdAt: now,
      updatedAt: now,
    };
    update((list) => [entry, ...list]);
    return { error: null, counted: tryComplete(entry) };
  };

  const updateEntry = (id: string, input: DiaryInput) => {
    const error = validate(input);
    if (error) return { error, counted: false };
    const old = ref.current.find((e) => e.id === id);
    if (!old) return { error: "Anotação não encontrada.", counted: false };
    const entry: DiaryEntry = {
      ...old,
      title: input.title.trim().slice(0, 60),
      content: input.content.slice(0, 5000),
      color: input.color,
      font: input.font,
      size: input.size,
      updatedAt: new Date().toISOString(),
    };
    update((list) => list.map((e) => (e.id === id ? entry : e)));
    // Completar o texto de hoje também conta (o XP é um só por dia)
    return { error: null, counted: tryComplete(entry) };
  };

  const removeEntry = (id: string) => update((list) => list.filter((e) => e.id !== id));

  return (
    <DiaryContext.Provider
      value={{
        ready,
        entries,
        getEntry: (id) => entries.find((e) => e.id === id),
        addEntry,
        updateEntry,
        removeEntry,
        wroteToday: entries.some((e) => dayKey(new Date(e.createdAt)) === dayKey() && letters(e.content) >= DIARY_MIN_CHARS),
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
}
