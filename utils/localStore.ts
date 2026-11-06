import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "@/config/firebase";

// Armazenamento por usuário 100% NA NUVEM (Firestore). Nada é salvo no aparelho.
//
// Mantém os nomes antigos (loadJSON/saveJSON) para os Contexts não mudarem.
// As chaves seguem "focus:v1:<uid>:<nome>" e viram o documento
//   users/{uid}/data/{nome}  ->  { value: "<json>", updatedAt }
//
// Proteção importante: se a LEITURA falhar (sem internet), a chave fica marcada
// e as gravações dela são ignoradas. Assim o app nunca sobrescreve seus dados
// da nuvem com valores vazios por causa de uma falha de rede.

const PREFIX = "focus:v1";
const CLOUD_KEY = /^focus:v1:([^:]+):([^:]+)$/;
const SAVE_DELAY_MS = 800;
const LOAD_ATTEMPTS = 3;

export const storageKeys = {
  progress: (uid: string) => `${PREFIX}:${uid}:progresso`,
  routine: (uid: string) => `${PREFIX}:${uid}:rotina`,
};

function cloudTarget(key: string) {
  const m = CLOUD_KEY.exec(key);
  if (!m) return null;
  const [, uid, name] = m;
  if (auth.currentUser?.uid !== uid) return null; // só o usuário logado
  return { uid, name };
}

const dataRef = (uid: string, name: string) =>
  doc(db, "users", uid, "data", name);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// Chaves cuja leitura falhou: não gravar por cima
const loadFailed = new Set<string>();
// Gravações agendadas (agrupa toques seguidos para economizar a cota gratuita)
const pending = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; run: () => Promise<void> }
>();

// true se alguma leitura falhou (dá para mostrar um aviso de "sem conexão")
export const hasCloudProblem = () => loadFailed.size > 0;

// Lê e valida; sem documento ou dado inválido = padrão do app
export async function loadJSON<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): Promise<T | null> {
  const target = cloudTarget(key);
  if (!target) return null;

  for (let attempt = 0; attempt < LOAD_ATTEMPTS; attempt++) {
    try {
      const snap = await withTimeout(
        getDoc(dataRef(target.uid, target.name)),
        8000,
      );
      loadFailed.delete(key);
      if (!snap.exists()) return null;
      const value = snap.data().value;
      if (typeof value !== "string") return null;
      const parsed: unknown = JSON.parse(value);
      return isValid(parsed) ? parsed : null;
    } catch {
      await sleep(800 * (attempt + 1));
    }
  }
  loadFailed.add(key);
  return null;
}

export async function removeJSON(key: string) {
  const target = cloudTarget(key);
  if (!target) return;
  try {
    await deleteDoc(dataRef(target.uid, target.name));
  } catch {
    // sem conexão: nada a remover agora
  }
}

export async function saveJSON(key: string, value: unknown) {
  const target = cloudTarget(key);
  if (!target || loadFailed.has(key)) return;

  const old = pending.get(key);
  if (old) clearTimeout(old.timer);

  const run = async () => {
    pending.delete(key);
    try {
      await setDoc(dataRef(target.uid, target.name), {
        value: JSON.stringify(value), // string: evita limites do Firestore (arrays aninhados, undefined)
        updatedAt: Date.now(),
      });
    } catch {
      // Sem conexão agora: a próxima alteração tenta de novo
    }
  };
  pending.set(key, { timer: setTimeout(run, SAVE_DELAY_MS), run });
}

// Envia na hora tudo que está agendado. Chamar ANTES de sair da conta.
export async function flushPending() {
  const jobs = [...pending.values()];
  jobs.forEach((j) => clearTimeout(j.timer));
  await Promise.all(jobs.map((j) => j.run()));
}
