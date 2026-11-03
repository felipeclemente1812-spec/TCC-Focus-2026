// Serviço de GRUPOS — PROTÓTIPO LOCAL.
//
// As telas só falam com a interface `GroupsService`. Hoje a implementação
// guarda os grupos num registro DESTE aparelho (AsyncStorage), compartilhado
// entre as contas que entram nele: assim um amigo pode entrar pelo código e
// competir de verdade no mesmo aparelho. Entre aparelhos diferentes depende
// do backend (outra implementação com a MESMA interface — docs/CONTRATO_GRUPOS.md).

import { Frequency } from "@/constants/challenges";
import { periodIdFor, XP_BY_FREQUENCY } from "@/constants/gamification";
import { loadJSON, removeJSON, saveJSON } from "@/utils/localStore";

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

export type GroupsService = {
  // Todos os grupos conhecidos (o contexto filtra os do usuário)
  load: (uid: string) => Promise<Group[]>;
  save: (groups: Group[]) => Promise<void>;
};

// ---------- implementação local (protótipo) ----------

const REGISTRY_KEY = "focus:v1:grupos";
// Versão anterior guardava por usuário; é migrada para o registro
const legacyKey = (uid: string) => `focus:v1:${uid}:grupos`;

function isGroupList(value: unknown): value is Group[] {
  return (
    Array.isArray(value) &&
    value.every(
      (g) =>
        g &&
        typeof g.id === "string" &&
        typeof g.name === "string" &&
        Array.isArray(g.members) &&
        Array.isArray(g.tasks) &&
        Array.isArray(g.completions) &&
        Array.isArray(g.posts) &&
        Array.isArray(g.invites),
    )
  );
}

export const localGroupsService: GroupsService = {
  load: async (uid) => {
    const registry = (await loadJSON(REGISTRY_KEY, isGroupList)) ?? [];
    const legacy = uid ? await loadJSON(legacyKey(uid), isGroupList) : null;
    if (!legacy || legacy.length === 0) return registry;

    // Migra grupos antigos deste usuário para o registro (sem duplicar)
    const merged = [...registry, ...legacy.filter((g) => !registry.some((r) => r.id === g.id))];
    await saveJSON(REGISTRY_KEY, merged);
    await removeJSON(legacyKey(uid));
    return merged;
  },
  save: (groups) => saveJSON(REGISTRY_KEY, groups),
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
