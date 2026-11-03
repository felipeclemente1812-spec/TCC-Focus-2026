import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BOOK_DONE_XP,
  dayKey,
  READING_GOAL_XP,
} from "@/constants/gamification";
import { RoutineContext } from "@/context/RoutineContext";
import { XPContext } from "@/context/XPContext";
import { loadJSON, saveJSON } from "@/utils/localStore";

// Minha Estante + meta diária de leitura.
// XP (regras aprovadas): bater a meta do dia (+50, 1x/dia) e concluir um livro
// com leitura registrada (+200, 1x/livro). Cadastrar livro não dá XP.
// Salvo LOCALMENTE neste aparelho, por usuário.

export type BookStatus = "quero" | "lendo" | "concluido";

export const STATUS_LABEL: Record<BookStatus, string> = {
  quero: "Quero ler",
  lendo: "Lendo",
  concluido: "Concluído",
};

export type Book = {
  id: string;
  title: string;
  author: string;
  pages: number | null; // total (opcional)
  coverUrl: string | null; // link da capa (opcional)
  status: BookStatus;
  currentPage: number;
  notes: string;
  createdAt: number;
  finishedAt: number | null;
};

export type ReadingLog = {
  id: string; // único por registro (não conta duas vezes)
  bookId: string;
  pages: number;
  day: string; // "2026-10-24"
  at: number;
};

type SavedShelf = { books: Book[]; logs: ReadingLog[]; dailyGoal: number | null };

const key = (uid: string) => `focus:v1:${uid}:estante`;

// Desafios do catálogo que a leitura cumpre sozinha (critério objetivo)
const ROUTINE_PAGES_TASK = { id: "lei-20pg", pages: 20 };
const ROUTINE_BOOK_TASK = "mes-lei-livro";

function isSavedShelf(value: unknown): value is SavedShelf {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedShelf;
  return (
    Array.isArray(v.books) &&
    v.books.every((b) => b && typeof b.id === "string" && typeof b.title === "string") &&
    Array.isArray(v.logs) &&
    v.logs.every((l) => l && typeof l.id === "string" && typeof l.pages === "number") &&
    (v.dailyGoal === null || typeof v.dailyGoal === "number")
  );
}

export type BookInput = {
  title: string;
  author?: string;
  pages?: string; // texto do campo; vazio = sem total
  coverUrl?: string;
  status?: BookStatus;
};

function parseInput(input: BookInput): { error: string } | { value: Omit<Book, "id" | "createdAt" | "currentPage" | "notes" | "finishedAt"> } {
  const title = input.title.trim();
  if (title.length < 2) return { error: "Informe o título do livro." };
  if (title.length > 80) return { error: "O título pode ter no máximo 80 caracteres." };
  let pages: number | null = null;
  if (input.pages && input.pages.trim()) {
    const n = Number(input.pages.trim());
    if (!Number.isInteger(n) || n < 1 || n > 10000) {
      return { error: "Páginas: digite um número inteiro entre 1 e 10.000." };
    }
    pages = n;
  }
  const coverUrl = input.coverUrl?.trim() || null;
  if (coverUrl && !/^https?:\/\/\S+$/.test(coverUrl)) {
    return { error: "A capa precisa ser um link começando com http:// ou https://." };
  }
  return {
    value: {
      title,
      author: input.author?.trim() ?? "",
      pages,
      coverUrl,
      status: input.status ?? "quero",
    },
  };
}

type BooksContextType = {
  ready: boolean;
  books: Book[];
  logs: ReadingLog[];
  dailyGoal: number | null;
  pagesToday: number;
  goalReachedToday: boolean;
  getBook: (id: string) => Book | undefined;
  addBook: (input: BookInput) => { error: string | null; id?: string };
  updateBook: (id: string, input: BookInput) => string | null;
  removeBook: (id: string) => void;
  setStatus: (id: string, status: BookStatus) => void;
  saveNotes: (id: string, notes: string) => void;
  // Registra páginas lidas agora; devolve mensagem de erro ou null
  logReading: (id: string, pages: number) => string | null;
  // Atualiza a página atual (avanço vira registro de leitura; recuo é só correção)
  setCurrentPage: (id: string, page: number) => string | null;
  setDailyGoal: (pages: number | null) => void;
  canEarnBookXp: (id: string) => boolean;
};

export const BooksContext = createContext<BooksContextType | null>(null);

export function BooksProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const xpContext = useContext(XPContext);
  const routine = useContext(RoutineContext);
  const [books, setBooks] = useState<Book[]>([]);
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [dailyGoal, setGoal] = useState<number | null>(null);
  const [ready, setReady] = useState(!uid);

  // Espelho síncrono dos registros (cálculos logo após registrar)
  const logsRef = useRef<ReadingLog[]>([]);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    loadJSON(key(uid), isSavedShelf).then((saved) => {
      if (!active) return;
      if (saved) {
        setBooks(saved.books);
        setLogs(saved.logs);
        logsRef.current = saved.logs;
        setGoal(saved.dailyGoal);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    saveJSON(key(uid), { books, logs, dailyGoal });
  }, [uid, ready, books, logs, dailyGoal]);

  // Mesmo XP de todo o app (XPContext); sem segunda fonte de pontuação
  const completeChallenge = (id: string, xp: number, title: string) =>
    xpContext?.completeChallenge(id, xp, title) ?? false;

  const today = dayKey();
  const sumToday = (list: ReadingLog[]) =>
    list.filter((l) => l.day === today).reduce((s, l) => s + l.pages, 0);
  const pagesToday = sumToday(logs);
  const goalReachedToday = !!dailyGoal && pagesToday >= dailyGoal;

  const getBook = (id: string) => books.find((b) => b.id === id);

  const hasLogs = (bookId: string) => logsRef.current.some((l) => l.bookId === bookId);

  // XP de livro concluído só com leitura registrada (evita "cadastrar e concluir")
  const canEarnBookXp = (bookId: string) => hasLogs(bookId);

  const rewardBookDone = (book: Book) => {
    if (!hasLogs(book.id)) return;
    completeChallenge(`livro-${book.id}`, BOOK_DONE_XP, `Livro concluído: ${book.title}`);
    // "Ler um livro inteiro" (mensal), se estiver na rotina
    const task = routine?.tasks.find((t) => t.id === ROUTINE_BOOK_TASK);
    if (task && !routine?.isDone(task)) routine?.completeTask(task);
  };

  const checkDailyGoal = (allLogs: ReadingLog[]) => {
    const total = sumToday(allLogs);
    if (dailyGoal && total >= dailyGoal) {
      completeChallenge(`leit-meta@${today}`, READING_GOAL_XP, `Meta de leitura do dia (${dailyGoal} páginas)`);
    }
    // "Ler 20 páginas" (diário), se estiver na rotina
    const task = routine?.tasks.find((t) => t.id === ROUTINE_PAGES_TASK.id);
    if (task && total >= ROUTINE_PAGES_TASK.pages && !routine?.isDone(task)) {
      routine?.completeTask(task);
    }
  };

  const addBook = (input: BookInput) => {
    const parsed = parseInput(input);
    if ("error" in parsed) return { error: parsed.error };
    if (books.some((b) => b.title.toLowerCase() === parsed.value.title.toLowerCase())) {
      return { error: "Esse livro já está na sua estante." };
    }
    const book: Book = {
      ...parsed.value,
      id: `b${Date.now()}`,
      currentPage: 0,
      notes: "",
      createdAt: Date.now(),
      finishedAt: null,
    };
    setBooks((prev) => [book, ...prev]);
    return { error: null, id: book.id };
  };

  const updateBook = (id: string, input: BookInput) => {
    const parsed = parseInput(input);
    if ("error" in parsed) return parsed.error;
    setBooks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              title: parsed.value.title,
              author: parsed.value.author,
              pages: parsed.value.pages,
              coverUrl: parsed.value.coverUrl,
              currentPage: parsed.value.pages ? Math.min(b.currentPage, parsed.value.pages) : b.currentPage,
            }
          : b,
      ),
    );
    return null;
  };

  // Remover o livro mantém os registros de leitura (já contaram para metas)
  const removeBook = (id: string) => setBooks((prev) => prev.filter((b) => b.id !== id));

  const setStatus = (id: string, status: BookStatus) => {
    const book = getBook(id);
    if (!book) return;
    const finished = status === "concluido";
    setBooks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status,
              finishedAt: finished ? b.finishedAt ?? Date.now() : null,
              currentPage: finished && b.pages ? b.pages : b.currentPage,
            }
          : b,
      ),
    );
    if (finished) rewardBookDone(book);
  };

  const saveNotes = (id: string, notes: string) =>
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, notes: notes.slice(0, 2000) } : b)));

  const logReading = (id: string, pages: number) => {
    const book = getBook(id);
    if (!book) return "Livro não encontrado.";
    if (!Number.isInteger(pages) || pages < 1 || pages > 1000) {
      return "Digite quantas páginas leu (de 1 a 1.000).";
    }
    if (book.status === "concluido") return "Esse livro já foi concluído.";

    const remaining = book.pages ? book.pages - book.currentPage : null;
    const counted = remaining !== null ? Math.min(pages, remaining) : pages;
    if (counted <= 0) return "Você já chegou à última página.";

    const log: ReadingLog = {
      id: `l${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bookId: id,
      pages: counted,
      day: today,
      at: Date.now(),
    };
    const nextLogs = [...logsRef.current, log];
    logsRef.current = nextLogs;
    setLogs(nextLogs);

    const newPage = book.currentPage + counted;
    const finished = !!book.pages && newPage >= book.pages;
    setBooks((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              currentPage: newPage,
              status: finished ? "concluido" : "lendo",
              finishedAt: finished ? Date.now() : b.finishedAt,
            }
          : b,
      ),
    );

    checkDailyGoal(nextLogs);
    if (finished) rewardBookDone(book);
    return null;
  };

  const setCurrentPage = (id: string, page: number) => {
    const book = getBook(id);
    if (!book) return "Livro não encontrado.";
    if (!Number.isInteger(page) || page < 0) return "Digite um número de página válido.";
    if (book.pages && page > book.pages) return `O livro tem ${book.pages} páginas.`;
    if (page > book.currentPage) return logReading(id, page - book.currentPage);
    // Recuo = correção: não gera registro de leitura
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, currentPage: page } : b)));
    return null;
  };

  const setDailyGoal = (pages: number | null) => {
    setGoal(pages);
  };

  // Mudou a meta e o que já leu hoje cumpre a nova meta: conta
  useEffect(() => {
    if (!ready || !dailyGoal) return;
    if (sumToday(logsRef.current) >= dailyGoal) checkDailyGoal(logsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyGoal, ready]);

  return (
    <BooksContext.Provider
      value={{
        ready,
        books,
        logs,
        dailyGoal,
        pagesToday,
        goalReachedToday,
        getBook,
        addBook,
        updateBook,
        removeBook,
        setStatus,
        saveNotes,
        logReading,
        setCurrentPage,
        setDailyGoal,
        canEarnBookXp,
      }}
    >
      {children}
    </BooksContext.Provider>
  );
}
