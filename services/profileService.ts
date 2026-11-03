// Serviço de PERFIL — PROTÓTIPO LOCAL.
//
// As telas só falam com a interface `ProfileService`. Hoje o perfil fica
// salvo neste aparelho (AsyncStorage) e há um registro local de @usuários
// para o login por @. Ao ligar o Firebase, trocar `localProfileService` por
// uma implementação com a MESMA interface:
//   load/save      -> doc users/{uid}
//   emailForHandle -> query users where username == handle (limit 1)
//   isHandleTaken  -> mesma query, ignorando o próprio uid
// (ou coleção usernames/{handle} -> { uid, email } para garantir @ único)

import { loadJSON, saveJSON } from "@/utils/localStore";

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

// ---------- implementação local (protótipo) ----------

const profileKey = (uid: string) => `focus:v1:${uid}:perfil`;
const HANDLES_KEY = "focus:v1:usuarios"; // { [username]: { uid, email } }

type HandleRegistry = Record<string, { uid: string; email: string }>;

const isProfile = (v: unknown): v is Partial<Profile> =>
  !!v && typeof v === "object" && typeof (v as Profile).name === "string";

const isRegistry = (v: unknown): v is HandleRegistry => !!v && typeof v === "object";

const registry = async () => (await loadJSON(HANDLES_KEY, isRegistry)) ?? {};

export const localProfileService: ProfileService = {
  load: async (uid) => {
    const saved = await loadJSON(profileKey(uid), isProfile);
    return saved ? { ...EMPTY_PROFILE, ...saved } : null;
  },
  save: async (uid, profile) => {
    await saveJSON(profileKey(uid), profile);
    const reg = await registry();
    // Tira o @ antigo desta conta e grava o atual
    for (const [handle, owner] of Object.entries(reg)) {
      if (owner.uid === uid && handle !== profile.username) delete reg[handle];
    }
    if (profile.username) reg[profile.username] = { uid, email: profile.email };
    await saveJSON(HANDLES_KEY, reg);
  },
  emailForHandle: async (handle) => (await registry())[cleanHandle(handle)]?.email ?? null,
  isHandleTaken: async (handle, uid) => {
    const owner = (await registry())[cleanHandle(handle)];
    return !!owner && owner.uid !== uid;
  },
};

export const profileService: ProfileService = localProfileService;
