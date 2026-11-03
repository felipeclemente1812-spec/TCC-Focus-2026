import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { dayKey } from "@/constants/gamification";
import { RoutineContext } from "@/context/RoutineContext";
import { loadJSON, saveJSON } from "@/utils/localStore";

// Diário (telas da Angela dentro do Focus, com o visual do app): anotações com
// título, texto, cor de destaque, fonte e tamanho da letra. Escrever hoje (com conteúdo de verdade) cumpre "Escrever no diário".
// Salvo LOCALMENTE neste aparelho, por usuário.
// TODO Firebase: users/{uid}/diario/{id}

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

// Cores de destaque (paleta do app)
export const DIARY_COLORS = [
  { id: "roxo", code: "#7C3AED" },
  { id: "lilás", code: "#B832E5" },
  { id: "azul", code: "#0EA5E9" },
  { id: "verde", code: "#15A638" },
  { id: "rosa", code: "#EC4899" },
  { id: "amarelo", code: "#F59E0B" },
];
// Cores do papel da primeira versão -> cor equivalente da paleta
const LEGACY: Record<string, string> = { "#FFF7B1": "#F59E0B", "#D1E8FF": "#0EA5E9", "#FFD1E8": "#EC4899", "#D1FFD1": "#15A638" };
export const accentOf = (color: string) => LEGACY[color] ?? color;

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
