// Serviço de PERFIL — 100% Firestore.
//   users/{uid}         -> perfil (nome, @, bio, status, banner...)
//   usernames/{handle}  -> { uid, email }  (@ único + login por @)
// Foto e banner só são salvos quando forem link http(s) (Firebase Storage).
// URI local fica apenas na memória da sessão.

import { doc, getDoc, runTransaction, setDoc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";

import { db } from "@/config/firebase";

export type BannerPreset = "roxo" | "noite" | "aurora" | "magenta" | "oceano";

export type Profile = {
  name: string;
  username: string; // sem "@"
  email: string;
  bio: string;
  avatar: string | null; // URI local da foto
  // Personalização (estilo Steam + Discord)
  banner: string | null; // imagem de capa (URI) — tem prioridade sobre o preset
  bannerPreset: BannerPreset;
  status: string; // frase curta ("estudando para o ENEM")
  featuredBadges: string[]; // ids de conquistas em destaque (até 6)
  showBooks: boolean; // mostrar livros lidos/lendo para amigos
  showStats: boolean; // mostrar nível, sequência e conquistas para amigos
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  username: "",
  email: "",
  bio: "",
  avatar: null,
  banner: null,
  bannerPreset: "roxo",
  status: "",
  featuredBadges: [],
  showBooks: true,
  showStats: true,
};

export const BANNER_PRESETS: Record<BannerPreset, [string, string]> = {
  roxo: ["#5b21b6", "#1e1b4b"],
  noite: ["#312E81", "#0f172a"],
  aurora: ["#7C3AED", "#0E7490"],
  magenta: ["#B832E5", "#43247D"],
  oceano: ["#1D4ED8", "#1e1b4b"],
};

export const MAX_FEATURED_BADGES = 6;
export const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

export const cleanHandle = (handle: string) => handle.trim().replace(/^@/, "").toLowerCase();

export type ProfileService = {
  load: (uid: string) => Promise<Profile | null>;
  save: (uid: string, profile: Profile) => Promise<void>;
  // Login por @: devolve o e-mail da conta (ou null se não achar)
  emailForHandle: (handle: string) => Promise<string | null>;
  isHandleTaken: (handle: string, uid?: string) => Promise<boolean>;
};

const isRemote = (v: string | null | undefined): v is string => !!v && v.startsWith("http");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// uids cujo perfil foi lido com sucesso (ou que ainda não tem perfil).
// Se a leitura falhar, NÃO gravamos por cima com dados vazios.
const loadedOk = new Set<string>();
// Evita reler/regravar o @ a cada alteração do perfil
const syncedHandles = new Map<string, string>();

async function claimHandle(uid: string, profile: Profile) {
  const handle = profile.username;
  if (!handle) return;
  const signature = `${handle}|${profile.email}`;
  if (syncedHandles.get(uid) === signature) return;

  const ref = doc(db, "usernames", handle);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().uid !== uid) throw new Error("handle-taken");
    if (!snap.exists() || snap.data().email !== profile.email) {
      tx.set(ref, { uid, email: profile.email });
    }
  });

  // Libera @ antigos desta conta
  const mine = await getDocs(query(collection(db, "usernames"), where("uid", "==", uid)));
  await Promise.all(mine.docs.filter((d) => d.id !== handle).map((d) => deleteDoc(d.ref)));
  syncedHandles.set(uid, signature);
}

export const firestoreProfileService: ProfileService = {
  load: async (uid) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        loadedOk.add(uid);
        if (!snap.exists()) return null;
        const c = snap.data() as Partial<Profile>;
        const p: Profile = { ...EMPTY_PROFILE };
        if (typeof c.name === "string") p.name = c.name;
        if (typeof c.username === "string") p.username = c.username;
        if (typeof c.email === "string") p.email = c.email;
        if (typeof c.bio === "string") p.bio = c.bio;
        if (typeof c.status === "string") p.status = c.status;
        if (c.bannerPreset && c.bannerPreset in BANNER_PRESETS) p.bannerPreset = c.bannerPreset;
        if (Array.isArray(c.featuredBadges)) p.featuredBadges = c.featuredBadges;
        if (typeof c.showBooks === "boolean") p.showBooks = c.showBooks;
        if (typeof c.showStats === "boolean") p.showStats = c.showStats;
        if (isRemote(c.avatar)) p.avatar = c.avatar;
        if (isRemote(c.banner)) p.banner = c.banner;
        return p;
      } catch {
        await sleep(800 * (attempt + 1));
      }
    }
    return null; // sem conexão: loadedOk não é marcado, então nada é sobrescrito
  },

  save: async (uid, profile) => {
    if (!loadedOk.has(uid)) return;
    try {
      await claimHandle(uid, profile);
      const { avatar, banner, ...rest } = profile;
      const data: Record<string, unknown> = { ...rest, updatedAt: Date.now() };
      if (isRemote(avatar)) data.avatar = avatar;
      if (isRemote(banner)) data.banner = banner;
      await setDoc(doc(db, "users", uid), data, { merge: true });
    } catch {
      // Sem conexão ou @ já em uso: a tela de perfil já valida o @ antes de salvar
    }
  },

  emailForHandle: async (handle) => {
    try {
      const snap = await getDoc(doc(db, "usernames", cleanHandle(handle)));
      return snap.exists() ? ((snap.data().email as string) ?? null) : null;
    } catch {
      return null;
    }
  },

  isHandleTaken: async (handle, uid) => {
    try {
      const snap = await getDoc(doc(db, "usernames", cleanHandle(handle)));
      return snap.exists() && snap.data().uid !== uid;
    } catch {
      return false;
    }
  },
};

export const profileService: ProfileService = firestoreProfileService;
