// Perfil PÚBLICO (o que os amigos veem) — PROTÓTIPO LOCAL.
//
// Hoje lê o que a conta do amigo salvou NESTE aparelho (mesmo registro
// usado pelos grupos). Com o Firebase, trocar por uma leitura de
// users/{uid}/publico, um doc que o próprio dono atualiza com só os campos
// que ele deixou públicos (nada de e-mail, finanças ou anotações privadas).

import { computeStats, levelInfo } from "@/constants/gamification";
import { loadJSON, storageKeys } from "@/utils/localStore";
import { EMPTY_PROFILE, Profile, profileService } from "@/services/profileService";

export type PublicBook = { id: string; title: string; author: string; status: "lendo" | "concluido"; coverUrl: string | null };
export type PublicReview = { bookTitle: string; text: string; rating: number; at: number };

export type PublicProfile = {
  profile: Omit<Profile, "email">;
  level: number;
  xp: number;
  streakDays: number;
  unlocked: string[]; // ids de conquistas
  books: PublicBook[];
  reviews: PublicReview[];
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

export async function loadPublicProfile(uid: string): Promise<PublicProfile> {
  const profile = (await profileService.load(uid)) ?? EMPTY_PROFILE;
  const { email: _email, ...visible } = profile;

  const progress = (await loadJSON(storageKeys.progress(uid), isObj)) as
    | { completions?: { id: string; xp: number; at: number; title?: string }[]; unlockedAt?: Record<string, number> }
    | null;
  const completions = (progress?.completions ?? []) as Parameters<typeof computeStats>[0];
  const stats = computeStats(completions);

  const shelf = (await loadJSON(`focus:v1:${uid}:estante`, isObj)) as { books?: PublicBook[] & { status: string }[] } | null;
  const books = (shelf?.books ?? [])
    .filter((b) => b.status === "lendo" || b.status === "concluido")
    .map((b) => ({ id: b.id, title: b.title, author: b.author, status: b.status as PublicBook["status"], coverUrl: b.coverUrl ?? null }));

  const planner = (await loadJSON(`focus:v1:${uid}:planejador`, isObj)) as
    | { reviews?: { bookId: string; text: string; rating: number; isPublic: boolean; at: number }[] }
    | null;
  const reviews = (planner?.reviews ?? [])
    .filter((r) => r.isPublic)
    .map((r) => ({ bookTitle: books.find((b) => b.id === r.bookId)?.title ?? "Livro", text: r.text, rating: r.rating, at: r.at }));

  return {
    profile: visible,
    level: levelInfo(stats.xp).level,
    xp: stats.xp,
    streakDays: stats.streakDays,
    unlocked: Object.keys(progress?.unlockedAt ?? {}),
    books: profile.showBooks ? books : [],
    reviews: profile.showBooks ? reviews : [],
  };
}
