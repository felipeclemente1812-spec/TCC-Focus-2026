import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Frequency } from "@/constants/challenges";
import { dayKey, monthKey } from "@/constants/gamification";
import { FinanceContext } from "@/context/FinanceContext";
import { RoutineContext } from "@/context/RoutineContext";
import { displayName, UserContext } from "@/context/UserContext";
import { XPContext } from "@/context/XPContext";
import {
  canManageTasks,
  Group,
  GroupSettings,
  isAdmin,
  isMember,
  savingsRanking,
  settingsOf,
  TaskRule,
  firestoreGroupsService,
  MAX_GROUP_TASKS,
  MAX_GROUPS,
  memberDone,
  newGroup,
  normalizeCode,
  taskPeriod,
  taskXp,
  validateGroupName,
  validateInvite,
  validateTaskTitle,
} from "@/services/groupsService";

// Grupos de amigos: tarefas do grupo, ranking entre membros e mural.
// Dados no Firestore (groups/{id}), em tempo real entre aparelhos (docs/CONTRATO_GRUPOS.md).

const service = firestoreGroupsService;

type Result = { error: string | null };

type GroupsContextType = {
  ready: boolean;
  groups: Group[]; // só os grupos dos quais o usuário participa
  getGroup: (id: string) => Group | undefined;
  createGroup: (name: string) => Result & { id?: string };
  joinByCode: (code: string) => Promise<Result & { id?: string }>;
  leaveGroup: (id: string) => void; // membro sai
  deleteGroup: (id: string) => void; // criador exclui
  removeDemoMembers: (id: string) => void;
  invite: (groupId: string, handle: string) => Result;
  addTask: (groupId: string, title: string, frequency: Frequency, rule?: TaskRule) => Result;
  removeTask: (groupId: string, taskId: string) => void;
  // XP ganho (0 se já feito ou se ficou aguardando aprovação)
  completeTask: (groupId: string, taskId: string, proof?: string) => Result & { gained: number; pending: boolean };
  reviewCompletion: (groupId: string, memberId: string, taskId: string, period: string, approve: boolean) => void;
  addPost: (groupId: string, text: string) => Promise<void>;
  // ADM
  setAdmin: (groupId: string, memberId: string, admin: boolean) => void;
  removeMember: (groupId: string, memberId: string) => void;
  updateSettings: (groupId: string, settings: Partial<GroupSettings>) => void;
  setGroupPhoto: (groupId: string, uri: string | null) => void;
  // Encontros (entram na agenda)
  addEvent: (groupId: string, input: { title: string; day: string; time: string | null; place: string }) => Result;
  toggleGoing: (groupId: string, eventId: string) => void;
  removeEvent: (groupId: string, eventId: string) => void;
};

export const GroupsContext = createContext<GroupsContextType | null>(null);

export function GroupsProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const xpContext = useContext(XPContext);
  const userContext = useContext(UserContext);
  const finance = useContext(FinanceContext);
  const routine = useContext(RoutineContext);
  // Registro inteiro (inclui grupos de outras contas deste aparelho)
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [ready, setReady] = useState(!uid);

  const allRef = useRef<Group[]>([]);
  allRef.current = allGroups;

  // Tempo real: qualquer mudança feita por outro membro chega aqui
  useEffect(() => {
    if (!uid) return;
    return service.subscribe(
      uid,
      (saved) => {
        setAllGroups(saved);
        setReady(true);
      },
      () => setReady(true), // sem conexão/permissão: abre vazio e não grava nada
    );
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    service.save(uid, allGroups);
  }, [uid, ready, allGroups]);

  const user = userContext?.user;
  const me = { id: uid, name: user ? displayName(user) : "Você" };

  const groups = allGroups.filter((g) => isMember(g, uid));

  const update = (groupId: string, change: (g: Group) => Group) =>
    setAllGroups((prev) => prev.map((g) => (g.id === groupId ? change(g) : g)));

  const getGroup = (id: string) => groups.find((g) => g.id === id);

  const createGroup = (name: string) => {
    const error = validateGroupName(name);
    if (error) return { error };
    if (groups.length >= MAX_GROUPS) {
      return { error: `Você pode participar de até ${MAX_GROUPS} grupos.` };
    }
    if (groups.some((g) => g.name.toLowerCase() === name.trim().toLowerCase())) {
      return { error: "Você já tem um grupo com esse nome." };
    }
    const group = newGroup(name, me);
    setAllGroups((prev) => [...prev, group]);
    return { error: null, id: group.id };
  };

  const joinByCode = async (code: string): Promise<Result & { id?: string }> => {
    const clean = normalizeCode(code);
    if (!/^FOCUS-[A-Z0-9]{4}$/.test(clean)) {
      return { error: "Digite um código no formato FOCUS-XXXX." };
    }
    const mine = allGroups.find((g) => g.code === clean);
    if (mine) return { error: "Você já participa desse grupo.", id: mine.id };
    if (groups.length >= MAX_GROUPS) {
      return { error: `Você pode participar de até ${MAX_GROUPS} grupos.` };
    }

    // Se havia convite para o seu @usuário ou e-mail, ele é aceito ao entrar
    const myHandles = [
      user?.username ? user.username.toLowerCase() : "",
      user?.username ? `@${user.username.toLowerCase()}` : "",
      user?.email?.toLowerCase() ?? "",
    ].filter(Boolean);

    const result = await service.join(clean, me, myHandles);
    if (result.error || !result.id) return result;

    // Espera o grupo chegar pelo tempo real (até 4 s) antes de abrir a tela
    for (let i = 0; i < 20 && !allRef.current.some((g) => g.id === result.id); i++) {
      await new Promise((r) => setTimeout(r, 200));
    }
    return result;
  };

  const leaveGroup = (id: string) => {
    update(id, (g) => ({ ...g, members: g.members.filter((m) => m.id !== uid) }));
  };

  const deleteGroup = (id: string) => {
    setAllGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const removeDemoMembers = (id: string) => {
    update(id, (g) => ({ ...g, members: g.members.filter((m) => !m.isDemo) }));
  };

  const invite = (groupId: string, handle: string) => {
    const error = validateInvite(handle);
    if (error) return { error };
    const clean = handle.trim().toLowerCase();
    const group = getGroup(groupId);
    if (group?.invites.some((i) => i.handle === clean)) {
      return { error: "Esse convite já foi registrado." };
    }
    update(groupId, (g) => ({
      ...g,
      invites: [...g.invites, { handle: clean, invitedAt: Date.now(), status: "pendente" }],
    }));
    return { error: null };
  };

  const addTask = (groupId: string, title: string, frequency: Frequency, rule: TaskRule = "livre") => {
    const error = validateTaskTitle(title);
    if (error) return { error };
    const group = getGroup(groupId);
    if (!group) return { error: "Grupo não encontrado." };
    if (!canManageTasks(group, uid)) return { error: "Só os ADMs do grupo criam tarefas." };
    if (group.tasks.length >= MAX_GROUP_TASKS) {
      return { error: `O grupo pode ter até ${MAX_GROUP_TASKS} tarefas.` };
    }
    if (group.tasks.some((t) => t.title.toLowerCase() === title.trim().toLowerCase())) {
      return { error: "O grupo já tem uma tarefa com esse nome." };
    }
    update(groupId, (g) => ({
      ...g,
      tasks: [
        ...g.tasks,
        {
          id: `t-${Date.now()}`,
          title: title.trim(),
          frequency,
          createdBy: uid,
          createdAt: Date.now(),
          rule,
        },
      ],
    }));
    return { error: null };
  };

  const removeTask = (groupId: string, taskId: string) => {
    const group = getGroup(groupId);
    const task = group?.tasks.find((t) => t.id === taskId);
    if (!group || !task || (task.createdBy !== uid && !isAdmin(group, uid))) return;
    update(groupId, (g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }));
  };

  const credit = (group: Group, taskTitle: string, period: string, xp: number) =>
    !!xpContext?.completeChallenge(`grp-${group.id}-${period}`, xp, `Grupo ${group.name}: ${taskTitle}`);

  // Concluir tarefa do grupo seguindo a regra do ADM:
  // livre = XP na hora; prova = precisa de texto; aprovação = XP quando um ADM aprovar
  const completeTask = (groupId: string, taskId: string, proof = "") => {
    const none = { gained: 0, pending: false };
    const group = getGroup(groupId);
    const task = group?.tasks.find((t) => t.id === taskId);
    if (!group || !task || !xpContext || memberDone(group, uid, task)) return { error: null, ...none };

    const rule = task.rule ?? "livre";
    const cleanProof = proof.trim();
    if (rule !== "livre" && cleanProof.length < 15) {
      return { error: "Conte como você fez (15+ letras) para concluir.", ...none };
    }

    const xp = taskXp(task);
    const period = taskPeriod(task);
    // ADM que conclui uma tarefa com aprovação não depende de outro ADM
    const pending = rule === "aprovacao" && !isAdmin(group, uid);
    if (!pending && !credit(group, task.title, period, xp)) return { error: null, ...none };

    update(groupId, (g) => ({
      ...g,
      completions: g.completions
        .filter((c) => !(c.memberId === uid && c.taskId === taskId && c.period === period))
        .concat({
          memberId: uid,
          taskId,
          period,
          xp,
          at: Date.now(),
          proof: cleanProof || undefined,
          status: pending ? "pendente" : "ok",
          credited: !pending,
        }),
    }));
    return { error: null, gained: pending ? 0 : xp, pending };
  };

  const reviewCompletion = (groupId: string, memberId: string, taskId: string, period: string, approve: boolean) => {
    const group = getGroup(groupId);
    if (!group || !isAdmin(group, uid)) return;
    update(groupId, (g) => ({
      ...g,
      completions: g.completions.map((c) =>
        c.memberId === memberId && c.taskId === taskId && c.period === period
          ? { ...c, status: approve ? "ok" : "recusada", reviewedBy: uid }
          : c,
      ),
    }));
  };

  // Aprovação feita por um ADM vira XP para o membro quando ele abre o app
  useEffect(() => {
    if (!ready || !uid || !xpContext) return;
    allGroups.forEach((g) => {
      g.completions.forEach((c) => {
        if (c.memberId !== uid || c.credited || (c.status ?? "ok") !== "ok") return;
        const task = g.tasks.find((t) => t.id === c.taskId);
        credit(g, task?.title ?? "tarefa", c.period, c.xp);
        update(g.id, (x) => ({
          ...x,
          completions: x.completions.map((y) =>
            y.memberId === c.memberId && y.taskId === c.taskId && y.period === c.period ? { ...y, credited: true } : y,
          ),
        }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, uid, allGroups]);

  // ---------- Quanto cada um guardou (integra Minhas finanças) ----------

  const saved = finance?.savedThisMonth ?? 0;
  const month = monthKey();
  const compareKey = allGroups.map((g) => `${g.id}:${settingsOf(g).compareSavings}`).join();
  useEffect(() => {
    if (!ready || !uid) return;
    const comparing = allGroups.filter((g) => isMember(g, uid) && settingsOf(g).compareSavings);
    comparing.forEach((g) => {
      if (g.savings?.[month]?.[uid]?.saved === saved) return;
      update(g.id, (x) => ({
        ...x,
        savings: { ...(x.savings ?? {}), [month]: { ...(x.savings?.[month] ?? {}), [uid]: { name: me.name, saved } } },
      }));
    });
    // Bônus para quem mais guardou num mês que já fechou (uma vez por mês e grupo)
    comparing.forEach((g) => {
      Object.keys(g.savings ?? {})
        .filter((m) => m < month)
        .forEach((m) => {
          if (savingsRanking(g, m)[0]?.id !== uid) return;
          xpContext?.completeChallenge(
            `grp-bonus-${g.id}-${m}`,
            settingsOf(g).savingsBonus,
            `Grupo ${g.name}: quem mais guardou em ${m.slice(1)}`,
          );
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, uid, saved, month, compareKey]);

  // ---------- ADM ----------

  // Só o criador promove ou tira ADM
  const setAdmin = (groupId: string, memberId: string, admin: boolean) => {
    const group = getGroup(groupId);
    if (!group || group.ownerId !== uid || memberId === group.ownerId) return;
    update(groupId, (g) => ({
      ...g,
      admins: admin ? [...new Set([...(g.admins ?? []), memberId])] : (g.admins ?? []).filter((a) => a !== memberId),
    }));
  };

  const removeMember = (groupId: string, memberId: string) => {
    const group = getGroup(groupId);
    if (!group || !isAdmin(group, uid) || memberId === group.ownerId || memberId === uid) return;
    // ADM comum não remove outro ADM; só o criador
    if (isAdmin(group, memberId) && group.ownerId !== uid) return;
    update(groupId, (g) => ({
      ...g,
      members: g.members.filter((m) => m.id !== memberId),
      admins: (g.admins ?? []).filter((a) => a !== memberId),
    }));
  };

  const updateSettings = (groupId: string, settings: Partial<GroupSettings>) => {
    const group = getGroup(groupId);
    if (!group || !isAdmin(group, uid)) return;
    update(groupId, (g) => ({ ...g, settings: { ...settingsOf(g), ...settings } }));
  };

  // Foto do grupo: só ADM troca
  const setGroupPhoto = (groupId: string, uri: string | null) => {
    const group = getGroup(groupId);
    if (!group || !isAdmin(group, uid)) return;
    update(groupId, (g) => ({ ...g, photo: uri }));
  };

  // ---------- Encontros ----------

  const addEvent = (groupId: string, input: { title: string; day: string; time: string | null; place: string }) => {
    const group = getGroup(groupId);
    if (!group) return { error: "Grupo não encontrado." };
    if (input.title.trim().length < 3) return { error: "Dê um nome ao encontro." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return { error: "Data inválida (dd/mm/aa)." };
    if (input.day < dayKey()) return { error: "Escolha uma data de hoje em diante." };
    if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return { error: "Horário inválido." };
    const title = input.title.trim().slice(0, 60);
    const place = input.place.trim().slice(0, 60);
    const when = `${input.day.split("-").reverse().join("/")}${input.time ? ` às ${input.time}` : ""}`;
    update(groupId, (g) => ({
      ...g,
      events: [
        ...(g.events ?? []),
        { id: `e-${Date.now()}`, title, day: input.day, time: input.time, place, createdBy: uid, createdAt: Date.now(), going: [uid] },
      ],
      // Convite aparece no mural para todos
      posts: [
        { id: `p-${Date.now()}`, authorId: uid, text: `Convite: ${title} — ${when}${place ? ` · ${place}` : ""}`, createdAt: Date.now() },
        ...g.posts,
      ],
    }));
    // "Organizar um encontro com amigos" (mensal): só encontros deste mês
    if (`M${input.day.slice(0, 7)}` === month) {
      const task = routine?.tasks.find((t) => t.id === "mes-soc-encontro");
      if (task && !routine?.isDone(task)) routine?.completeTask(task);
    }
    return { error: null };
  };

  const toggleGoing = (groupId: string, eventId: string) =>
    update(groupId, (g) => ({
      ...g,
      events: (g.events ?? []).map((e) =>
        e.id === eventId ? { ...e, going: e.going.includes(uid) ? e.going.filter((x) => x !== uid) : [...e.going, uid] } : e,
      ),
    }));

  const removeEvent = (groupId: string, eventId: string) => {
    const group = getGroup(groupId);
    const event = group?.events?.find((e) => e.id === eventId);
    if (!group || !event || (event.createdBy !== uid && !isAdmin(group, uid))) return;
    update(groupId, (g) => ({ ...g, events: (g.events ?? []).filter((e) => e.id !== eventId) }));
  };

  const addPost = async (groupId: string, text: string) => {
    if (!getGroup(groupId)) throw new Error("Grupo não encontrado.");
    update(groupId, (g) => ({
      ...g,
      posts: [
        { id: `p-${Date.now()}`, authorId: uid, text, createdAt: Date.now() },
        ...g.posts,
      ],
    }));
  };

  return (
    <GroupsContext.Provider
      value={{
        ready,
        groups,
        getGroup,
        createGroup,
        joinByCode,
        leaveGroup,
        deleteGroup,
        removeDemoMembers,
        invite,
        addTask,
        removeTask,
        completeTask,
        reviewCompletion,
        addPost,
        setAdmin,
        removeMember,
        updateSettings,
        setGroupPhoto,
        addEvent,
        toggleGoing,
        removeEvent,
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
}
