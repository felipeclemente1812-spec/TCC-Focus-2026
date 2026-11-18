import React, { ReactNode, useContext, useEffect } from "react";

import { FocusLoading } from "@/components/FocusLogo";
import { ACHIEVEMENTS, computeStats, levelInfo } from "@/constants/gamification";
import { BooksContext, BooksProvider } from "@/context/BooksContext";
import { DiaryContext, DiaryProvider } from "@/context/DiaryContext";
import { FinanceContext, FinanceProvider } from "@/context/FinanceContext";
import { FocusProvider } from "@/context/FocusContext";
import { GroupsContext, GroupsProvider } from "@/context/GroupsContext";
import { HabitsContext, HabitsProvider } from "@/context/HabitsContext";
import { PlannerContext, PlannerProvider } from "@/context/PlannerContext";
import { PremiumContext, PremiumProvider } from "@/context/PremiumContext";
import { RoutineContext, RoutineProvider } from "@/context/RoutineContext";
import { TaskExtrasContext, TaskExtrasProvider } from "@/context/TaskExtrasContext";
import { UserContext } from "@/context/UserContext";
import { AgendaWatcher } from "@/hooks/useAgenda";
import { XPContext, XPProvider } from "@/context/XPContext";
import { publishPublicSummary, PublicBook, PublicReview } from "@/services/publicProfileService";

// Estado que pertence a UMA conta: XP, rotina, hábitos, estante, foco e grupos.
// A `key` com o uid recria tudo quando a conta muda (logout, troca de
// usuário), então nada da sessão anterior é herdado pela próxima.
// Os dados são carregados do Firestore (users/{uid}/data/...) DESTE uid.
export function SessionProviders({ children }: { children: ReactNode }) {
  const userContext = useContext(UserContext);
  const uid = userContext?.user.uid ?? "";

  // Só monta depois que o Firebase Auth responde: assim a primeira montagem
  // já tem o uid certo e recarregar numa tela (ex.: /groups) não volta ao Feed
  if (!userContext?.authReady) return <Loading />;

  return (
    <XPProvider key={uid || "sem-sessao"} uid={uid}>
      <PremiumProvider uid={uid}>
      <RoutineProvider uid={uid}>
        <HabitsProvider uid={uid}>
          <BooksProvider uid={uid}>
            <TaskExtrasProvider uid={uid}>
              <FinanceProvider uid={uid}>
                <PlannerProvider uid={uid}>
                  <DiaryProvider uid={uid}>
                    <GroupsProvider uid={uid}>
                      <FocusProvider>
                        <AchievementsWatcher />
                        <PublicProfilePublisher uid={uid} />
                        <AgendaWatcher />
                        <WaitForSavedData>{children}</WaitForSavedData>
                      </FocusProvider>
                    </GroupsProvider>
                  </DiaryProvider>
                </PlannerProvider>
              </FinanceProvider>
            </TaskExtrasProvider>
          </BooksProvider>
        </HabitsProvider>
      </RoutineProvider>
      </PremiumProvider>
    </XPProvider>
  );
}

// Fonte única de desbloqueio de conquistas: olha o histórico de XP e a
// sequência dos hábitos e libera o que passou a valer (uma vez cada)
function AchievementsWatcher() {
  const xp = useContext(XPContext);
  const habits = useContext(HabitsContext);
  const history = xp?.history;
  const unlockedAt = xp?.unlockedAt;
  const habitStreak = habits?.habitStreak ?? 0;
  const ready = !!xp?.ready && !!habits?.ready;

  useEffect(() => {
    if (!ready || !history || !unlockedAt || !xp) return;
    const stats = { ...computeStats(history), habitStreak };
    const newly = ACHIEVEMENTS.filter((a) => !unlockedAt[a.id] && a.check?.(stats)).map(
      (a) => a.id,
    );
    if (newly.length > 0) xp.unlockAchievements(newly);
  }, [ready, history, unlockedAt, habitStreak, xp]);

  return null;
}

// Publica o resumo que os amigos veem (users/{uid}/public/summary).
// Só o próprio dono escreve; livros e resenhas respeitam "mostrar livros".
function PublicProfilePublisher({ uid }: { uid: string }) {
  const xp = useContext(XPContext);
  const booksCtx = useContext(BooksContext);
  const planner = useContext(PlannerContext);
  const showBooks = useContext(UserContext)?.user.showBooks ?? true;

  const ready = !!uid && !!xp?.ready && !!booksCtx?.ready && !!planner?.ready;
  const history = xp?.history;
  const unlockedAt = xp?.unlockedAt;
  const books = booksCtx?.books;
  const reviews = planner?.reviews;

  useEffect(() => {
    if (!ready || !history || !unlockedAt || !books || !reviews) return;
    const timer = setTimeout(() => {
      const stats = computeStats(history);
      const shownBooks: PublicBook[] = showBooks
        ? books
            .filter((b) => b.status === "lendo" || b.status === "concluido")
            .map((b) => ({ id: b.id, title: b.title, author: b.author, status: b.status as PublicBook["status"], coverUrl: b.coverUrl ?? null }))
        : [];
      const shownReviews: PublicReview[] = showBooks
        ? reviews
            .filter((r) => r.isPublic)
            .map((r) => ({ bookTitle: books.find((b) => b.id === r.bookId)?.title ?? "Livro", text: r.text, rating: r.rating, at: r.at }))
        : [];
      publishPublicSummary(uid, {
        level: levelInfo(stats.xp).level,
        xp: stats.xp,
        streakDays: stats.streakDays,
        unlocked: Object.keys(unlockedAt),
        books: shownBooks,
        reviews: shownReviews,
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [ready, uid, history, unlockedAt, books, reviews, showBooks]);

  return null;
}

// Evita mostrar XP 0 por um instante (e salvar por cima) antes de carregar
function WaitForSavedData({ children }: { children: ReactNode }) {
  const xpReady = useContext(XPContext)?.ready ?? true;
  const routineReady = useContext(RoutineContext)?.ready ?? true;
  const habitsReady = useContext(HabitsContext)?.ready ?? true;
  const booksReady = useContext(BooksContext)?.ready ?? true;
  const groupsReady = useContext(GroupsContext)?.ready ?? true;
  const extrasReady = useContext(TaskExtrasContext)?.ready ?? true;
  const financeReady = useContext(FinanceContext)?.ready ?? true;
  const plannerReady = useContext(PlannerContext)?.ready ?? true;
  const diaryReady = useContext(DiaryContext)?.ready ?? true;
  const premiumReady = useContext(PremiumContext)?.ready ?? true;

  if (
    !xpReady ||
    !routineReady ||
    !habitsReady ||
    !booksReady ||
    !groupsReady ||
    !extrasReady ||
    !financeReady ||
    !plannerReady ||
    !diaryReady ||
    !premiumReady
  ) {
    return <Loading />;
  }

  return <>{children}</>;
}

function Loading() {
  return <FocusLoading />;
}
