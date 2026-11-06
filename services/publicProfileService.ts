// Perfil PÚBLICO (o que os amigos veem) — Firestore.
//   users/{uid}                -> perfil (nome, @, bio, status... sem dados privados)
//   users/{uid}/public/summary -> resumo que o PRÓPRIO dono publica (XP, nível, sequência,
//                                 conquistas, livros e resenhas públicas)
// Nada de finanças, diário ou anotações privadas: esses ficam em users/{uid}/data (só o dono lê).

import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "@/config/firebase";
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

export type PublicSummary = Omit<PublicProfile, "profile">;

const summaryRef = (uid: string) => doc(db, "users", uid, "public", "summary");

export async function loadPublicProfile(uid: string): Promise<PublicProfile> {
  const profile = (await profileService.load(uid)) ?? EMPTY_PROFILE;
  const { email: _email, ...visible } = profile;

  let summary: Partial<PublicSummary> = {};
  try {
    const snap = await getDoc(summaryRef(uid));
    if (snap.exists()) summary = snap.data() as Partial<PublicSummary>;
  } catch {
    // sem conexão: mostra só o perfil
  }

  return {
    profile: visible,
    level: summary.level ?? 1,
    xp: summary.xp ?? 0,
    streakDays: summary.streakDays ?? 0,
    unlocked: summary.unlocked ?? [],
    books: profile.showBooks ? summary.books ?? [] : [],
    reviews: profile.showBooks ? summary.reviews ?? [] : [],
  };
}

// Chamado pelo próprio usuário (PublicProfilePublisher em SessionProviders)
let lastSignature = "";
export async function publishPublicSummary(uid: string, summary: PublicSummary) {
  const signature = `${uid}|${JSON.stringify(summary)}`;
  if (signature === lastSignature) return;
  try {
    await setDoc(summaryRef(uid), { ...summary, updatedAt: Date.now() });
    lastSignature = signature;
  } catch {
    // tenta de novo na próxima alteração
  }
}
