// Serviço de GRUPOS — Firestore (tempo real entre aparelhos).
//   groups/{groupId}      -> o grupo inteiro (mesmo formato do tipo Group) + memberIds
//   groupCodes/{FOCUS-XX} -> { groupId, ownerId }  (entrar pelo código)
// Gravação por campo: só o que mudou é enviado (tasks, completions, posts... separados).
//
// (comentário antigo do protótipo local abaixo)
//
// As telas só falam com a interface `GroupsService`. Hoje a implementação
// guarda os grupos num registro DESTE aparelho (AsyncStorage), compartilhado
// entre as contas que entram nele: assim um amigo pode entrar pelo código e
// competir de verdade no mesmo aparelho. Entre aparelhos diferentes depende
// do backend (outra implementação com a MESMA interface — docs/CONTRATO_GRUPOS.md).

import { Frequency } from "@/constants/challenges";
import { periodIdFor, XP_BY_FREQUENCY } from "@/constants/gamification";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/config/firebase";

export type GroupMember = {
  id: string; // uid (ou id de exemplo)
  name: string;
  isDemo: boolean; // participante fictício do protótipo
  demoPoints?: number; // pontos fixos dos participantes de exemplo
};

export type GroupInvite = {
  handle: string; // @usuario ou e-mail
  invitedAt: number;
  status: "pendente"; // aceitar depende do servidor
};

// Regra para concluir uma tarefa do grupo (definida por um ADM)
export type TaskRule = "livre" | "prova" | "aprovacao";
export const RULE_LABEL: Record<TaskRule, string> = {
  livre: "Marcar e pronto",
  prova: "Com prova (texto ou foto)",
  aprovacao: "Um ADM aprova",
};

export type GroupTask = {
  id: string;
  title: string;
  frequency: Frequency;
  createdBy: string;
  createdAt: number;
  rule?: TaskRule; // sem = "livre" (grupos antigos)
};

export type GroupCompletion = {
  memberId: string;
  taskId: string;
  period: string; // ex.: "t-1@2026-10-23"
  xp: number;
  at: number;
  proof?: string; // texto da prova (regra "prova" / "aprovacao")
  status?: "ok" | "pendente" | "recusada"; // sem = "ok"
  credited?: boolean; // XP pessoal já entrou (aprovações creditam depois)
  reviewedBy?: string;
};

// Encontro marcado no grupo: vira convite e entra na agenda dos membros
export type GroupEvent = {
  id: string;
  title: string;
  day: string; // AAAA-MM-DD
  time: string | null;
  place: string;
  createdBy: string;
  createdAt: number;
  going: string[]; // ids de quem confirmou
};

export type GroupSettings = {
  compareSavings: boolean; // comparar quanto cada um guardou (Minhas finanças)
  savingsBonus: number; // XP para quem mais guardar no mês
  onlyAdminsTasks: boolean; // só ADM cria/remove tarefas
};

export const DEFAULT_SETTINGS: GroupSettings = {
  compareSavings: false,
  savingsBonus: 200,
  onlyAdminsTasks: true,
};

export type GroupPost = {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  code: string; // código de convite
  ownerId: string;
  createdAt: number;
  members: GroupMember[];
  invites: GroupInvite[];
  tasks: GroupTask[];
  completions: GroupCompletion[];
  posts: GroupPost[];
  // Campos novos (opcionais para não quebrar grupos salvos antes)
  admins?: string[];
  events?: GroupEvent[];
  settings?: GroupSettings;
  savings?: Record<string, Record<string, { name: string; saved: number }>>; // mês -> uid -> valor
  photo?: string | null; // foto do grupo (TODO Firebase: URL do Storage)
};

export const MAX_GROUPS = 5;
export const MAX_GROUP_TASKS = 10;

export type JoinResult = { error: string | null; id?: string };

export type GroupsService = {
  // Escuta em tempo real os grupos em que o usuário é membro
  subscribe: (uid: string, onData: (groups: Group[]) => void, onError: () => void) => () => void;
  // Envia só as diferenças (novos, alterados e excluídos)
  save: (uid: string, groups: Group[]) => Promise<void>;
  // Entra num grupo pelo código (de qualquer aparelho)
  join: (code: string, member: { id: string; name: string }, handles: string[]) => Promise<JoinResult>;
};

// ---------- implementação Firestore ----------

const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v)); // remove undefined
const memberIdsOf = (g: Group) => g.members.filter((m) => !m.isDemo).map((m) => m.id);

// Última versão conhecida do servidor, por grupo (base para calcular as diferenças)
const synced = new Map<string, Group>();
let queue: Promise<void> = Promise.resolve();

function fromDoc(id: string, data: Record<string, unknown>): Group {
  const { memberIds, ...rest } = data;
  const g = rest as unknown as Group;
  return {
    ...g,
    id,
    members: g.members ?? [],
    invites: g.invites ?? [],
    tasks: g.tasks ?? [],
    completions: g.completions ?? [],
    posts: g.posts ?? [],
  };
}

async function saveNow(uid: string, groups: Group[]) {
  const ids = new Set(groups.map((g) => g.id));

  // Excluídos (só o criador consegue apagar)
  for (const [id, old] of [...synced]) {
    if (ids.has(id)) continue;
    if (old.ownerId === uid) {
      try {
        await deleteDoc(doc(db, "groups", id));
        await deleteDoc(doc(db, "groupCodes", old.code));
      } catch {
        continue; // tenta de novo na próxima alteração
      }
    }
    synced.delete(id);
  }

  for (const g of groups) {
    const next = clean(g);
    const prev = synced.get(g.id);
    const ref = doc(db, "groups", g.id);
    try {
      if (!prev) {
        await setDoc(ref, { ...next, memberIds: memberIdsOf(g) });
        await setDoc(doc(db, "groupCodes", g.code), { groupId: g.id, ownerId: g.ownerId });
        synced.set(g.id, next);
        continue;
      }
      const changes: Record<string, unknown> = {};
      const keys = new Set([...Object.keys(next), ...Object.keys(prev)]);
      keys.forEach((k) => {
        const a = JSON.stringify((next as Record<string, unknown>)[k]);
        const b = JSON.stringify((prev as Record<string, unknown>)[k]);
        if (a !== b) changes[k] = k in next ? (next as Record<string, unknown>)[k] : deleteField();
      });
      if ("members" in changes) changes.memberIds = memberIdsOf(g);
      if (Object.keys(changes).length === 0) continue;
      await updateDoc(ref, changes);
      synced.set(g.id, next);
    } catch {
      // Sem conexão ou sem permissão: tenta de novo na próxima alteração
    }
  }
}

export const firestoreGroupsService: GroupsService = {
  subscribe: (uid, onData, onError) =>
    onSnapshot(
      query(collection(db, "groups"), where("memberIds", "array-contains", uid)),
      (snap) => {
        const groups = snap.docs.map((d) => fromDoc(d.id, d.data()));
        synced.clear();
        groups.forEach((g) => synced.set(g.id, clean(g)));
        onData(groups);
      },
      onError,
    ),

  save: (uid, groups) => {
    queue = queue.then(() => saveNow(uid, groups)).catch(() => {});
    return queue;
  },

  join: async (code, member, handles) => {
    try {
      const codeSnap = await getDoc(doc(db, "groupCodes", code));
      if (!codeSnap.exists()) return { error: "Código não encontrado. Confira com quem criou o grupo." };
      const groupId = codeSnap.data().groupId as string;
      const ref = doc(db, "groups", groupId);
      let already = false;
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("not-found");
        const g = snap.data() as Group & { memberIds: string[] };
        if (g.memberIds.includes(member.id)) {
          already = true;
          return;
        }
        tx.update(ref, {
          members: [...g.members, { id: member.id, name: member.name, isDemo: false }],
          memberIds: [...g.memberIds, member.id],
          invites: (g.invites ?? []).filter((i) => !handles.includes(i.handle)),
        });
      });
      return { error: already ? "Você já participa desse grupo." : null, id: groupId };
    } catch {
      return { error: "Não foi possível entrar agora. Verifique sua conexão e o código." };
    }
  },
};

export const normalizeCode = (code: string) => code.trim().toUpperCase();

export const isMember = (group: Group, uid: string) =>
  group.members.some((m) => m.id === uid && !m.isDemo);

// Criador é sempre ADM; outros ADMs são escolhidos por ele
export const isAdmin = (group: Group, uid: string) =>
  group.ownerId === uid || (group.admins ?? []).includes(uid);

export const settingsOf = (group: Group): GroupSettings => ({ ...DEFAULT_SETTINGS, ...(group.settings ?? {}) });

export const canManageTasks = (group: Group, uid: string) =>
  !settingsOf(group).onlyAdminsTasks || isAdmin(group, uid);

const counts = (c: GroupCompletion) => (c.status ?? "ok") === "ok";

// Quem mais guardou no mês (só quem tem valor > 0)
export function savingsRanking(group: Group, month: string) {
  return Object.entries(group.savings?.[month] ?? {})
    .map(([id, v]) => ({ id, ...v }))
    .filter((r) => r.saved > 0)
    .sort((a, b) => b.saved - a.saved);
}

// ---------- regras (puras, reaproveitáveis com qualquer backend) ----------

const uid4 = () => Math.random().toString(36).slice(2, 6).toUpperCase();

export function newGroup(name: string, owner: { id: string; name: string }): Group {
  return {
    id: `g-${Date.now()}`,
    name: name.trim(),
    code: `FOCUS-${uid4()}`,
    ownerId: owner.id,
    createdAt: Date.now(),
    members: [
      { id: owner.id, name: owner.name, isDemo: false },
      // Participantes de exemplo para demonstrar a competição
      { id: "demo-1", name: "Amigo exemplo 1", isDemo: true, demoPoints: 700 },
      { id: "demo-2", name: "Amigo exemplo 2", isDemo: true, demoPoints: 400 },
      { id: "demo-3", name: "Amigo exemplo 3", isDemo: true, demoPoints: 100 },
    ],
    invites: [],
    tasks: [],
    completions: [],
    posts: [],
  };
}

export function validateGroupName(name: string) {
  const clean = name.trim();
  if (clean.length < 3) return "O nome do grupo precisa ter pelo menos 3 caracteres.";
  if (clean.length > 30) return "O nome do grupo pode ter no máximo 30 caracteres.";
  return null;
}

export function validateTaskTitle(title: string) {
  const clean = title.trim();
  if (clean.length < 3) return "A tarefa precisa ter pelo menos 3 caracteres.";
  if (clean.length > 60) return "A tarefa pode ter no máximo 60 caracteres.";
  return null;
}

// @usuario (3–20, minúsculas/números/_/.) ou e-mail
export function validateInvite(handle: string) {
  const clean = handle.trim().toLowerCase();
  if (/^@?[a-z0-9_.]{3,20}$/.test(clean) || /\S+@\S+\.\S+/.test(clean)) return null;
  return "Digite um @usuário ou um e-mail válido.";
}

export const taskXp = (task: GroupTask) => XP_BY_FREQUENCY[task.frequency];

export const taskPeriod = (task: GroupTask) => periodIdFor(task.id, task.frequency);

// Feito ou aguardando aprovação (recusada libera para tentar de novo)
export function memberDone(group: Group, memberId: string, task: GroupTask) {
  const period = taskPeriod(task);
  return group.completions.some(
    (c) => c.memberId === memberId && c.taskId === task.id && c.period === period && c.status !== "recusada",
  );
}

export function memberPending(group: Group, memberId: string, task: GroupTask) {
  const period = taskPeriod(task);
  return group.completions.some(
    (c) => c.memberId === memberId && c.taskId === task.id && c.period === period && c.status === "pendente",
  );
}

export type RankingRow = GroupMember & { points: number; position: number };

// Pontos no grupo = XP das tarefas do grupo concluídas (exemplos: pontos fixos)
export function groupRanking(group: Group): RankingRow[] {
  return group.members
    .map((m) => ({
      ...m,
      points: m.isDemo
        ? m.demoPoints ?? 0
        : group.completions
            .filter((c) => c.memberId === m.id && counts(c))
            .reduce((sum, c) => sum + c.xp, 0),
    }))
    .sort((a, b) => b.points - a.points)
    .map((m, i) => ({ ...m, position: i + 1 }));
}
