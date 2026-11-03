import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { QuickSave } from "@/components/FinanceWidgets";
import PostComposer from "@/components/PostComposer";
import { formatDay, maskDate, maskTime, parseDate } from "@/components/ScreenShell";
import { formatMoney } from "@/constants/finance";
import UserAvatar from "@/components/UserAvatar";
import { Frequency, FREQUENCY_LABEL } from "@/constants/challenges";
import { monthKey, resetHint, XP_BY_FREQUENCY } from "@/constants/gamification";
import { GroupsContext } from "@/context/GroupsContext";
import { displayName, UserContext } from "@/context/UserContext";
import {
  canManageTasks,
  groupRanking,
  isAdmin,
  MAX_GROUP_TASKS,
  memberDone,
  memberPending,
  RULE_LABEL,
  savingsRanking,
  settingsOf,
  TaskRule,
  taskXp,
} from "@/services/groupsService";
import { confirmAction } from "@/utils/feedback";
import { pickImage } from "@/utils/files";

type Section = "tarefas" | "encontros" | "ranking" | "mural" | "membros";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "tarefas", label: "Tarefas" },
  { key: "encontros", label: "Encontros" },
  { key: "ranking", label: "Ranking" },
  { key: "mural", label: "Mural" },
  { key: "membros", label: "Membros" },
];

const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly"];
const RULES: TaskRule[] = ["livre", "prova", "aprovacao"];
const MEDAL_COLORS = ["#FCD34D", "#D1D5DB", "#D97706"];

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const groupsContext = useContext(GroupsContext);
  const userContext = useContext(UserContext);

  const [section, setSection] = useState<Section>("tarefas");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskFrequency, setTaskFrequency] = useState<Frequency>("daily");
  const [taskRule, setTaskRule] = useState<TaskRule>("livre");
  const [inviteHandle, setInviteHandle] = useState("");
  const [proofFor, setProofFor] = useState<string | null>(null);
  const [proofText, setProofText] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventPlace, setEventPlace] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // A tela fica montada entre grupos diferentes: volta para Tarefas ao trocar
  useEffect(() => {
    setSection("tarefas");
    setMessage(null);
  }, [id]);

  useEffect(() => {
    if (!message || message.error) return;
    const timer = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  if (!groupsContext || !userContext) throw new Error("Contexto não encontrado");

  const {
    getGroup,
    addTask,
    removeTask,
    completeTask,
    invite,
    addPost,
    deleteGroup,
    leaveGroup,
    removeDemoMembers,
    reviewCompletion,
    setAdmin,
    removeMember,
    updateSettings,
    setGroupPhoto,
    addEvent,
    toggleGoing,
    removeEvent,
  } = groupsContext;
  const { user } = userContext;
  const group = id ? getGroup(id) : undefined;

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/groups");

  if (!group) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
          <View style={styles.notFound}>
            <Text style={styles.emptyText}>Grupo não encontrado.</Text>
            <TouchableOpacity style={styles.primary} onPress={() => router.replace("/groups")}>
              <Text style={styles.primaryText}>Ver meus grupos</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const ranking = groupRanking(group);
  const memberName = (memberId: string) =>
    memberId === user.uid
      ? displayName(user)
      : group.members.find((m) => m.id === memberId)?.name ?? "Membro";

  const admin = isAdmin(group, user.uid);
  const settings = settingsOf(group);
  const roleOf = (memberId: string) =>
    memberId === group.ownerId ? "criador" : (group.admins ?? []).includes(memberId) ? "ADM" : "membro";

  const handleAddTask = () => {
    const result = addTask(group.id, taskTitle, taskFrequency, taskRule);
    if (result.error) {
      setMessage({ text: result.error, error: true });
      return;
    }
    setTaskTitle("");
    setMessage({ text: "Tarefa criada para todos do grupo.", error: false });
  };

  const handleComplete = (taskId: string, proof = "") => {
    const task = group.tasks.find((t) => t.id === taskId);
    // Regra com prova: abre o campo antes de concluir
    if (task && (task.rule ?? "livre") !== "livre" && proofFor !== taskId) {
      setProofFor(taskId);
      setProofText("");
      return;
    }
    const result = completeTask(group.id, taskId, proof);
    if (result.error) {
      setMessage({ text: result.error, error: true });
      return;
    }
    setProofFor(null);
    if (result.pending) setMessage({ text: "Enviado! Um ADM do grupo vai aprovar.", error: false });
    else if (result.gained > 0) setMessage({ text: `+${result.gained} XP e +${result.gained} pts no grupo!`, error: false });
  };

  const pendingReviews = group.completions.filter((c) => c.status === "pendente" && c.memberId !== user.uid);

  const handleAddEvent = () => {
    const day = parseDate(eventDate);
    if (!day) {
      setMessage({ text: "Data no formato dd/mm/aa.", error: true });
      return;
    }
    const result = addEvent(group.id, { title: eventTitle, day, time: eventTime || null, place: eventPlace });
    if (result.error) {
      setMessage({ text: result.error, error: true });
      return;
    }
    setEventTitle("");
    setEventDate("");
    setEventTime("");
    setEventPlace("");
    setMessage({ text: "Encontro marcado! Ele aparece na agenda de todos do grupo.", error: false });
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    const ok = await confirmAction("Remover do grupo", `Remover ${name} do grupo? Os pontos já ganhos continuam no histórico.`, "Remover");
    if (ok) removeMember(group.id, memberId);
  };

  const month = monthKey();
  const savings = savingsRanking(group, month);

  const handleRemoveTask = async (taskId: string, title: string) => {
    const ok = await confirmAction(
      "Remover tarefa do grupo",
      `Remover "${title}" para todos? Os pontos já ganhos continuam.`,
      "Remover",
    );
    if (ok) removeTask(group.id, taskId);
  };

  const handleInvite = () => {
    const result = invite(group.id, inviteHandle);
    if (result.error) {
      setMessage({ text: result.error, error: true });
      return;
    }
    setInviteHandle("");
    setMessage({ text: "Convite registrado (envio depende do servidor).", error: false });
  };

  const handleLeave = async () => {
    const ok = await confirmAction(
      "Sair do grupo",
      `Sair de "${group.name}"? Seus pontos no grupo continuam registrados e o XP ganho fica com você.`,
      "Sair",
    );
    if (!ok) return;
    leaveGroup(group.id);
    router.replace("/groups");
  };

  const handleRemoveDemo = async () => {
    const ok = await confirmAction(
      "Remover exemplos",
      "Remover os “Amigos exemplo” do ranking deste grupo?",
      "Remover",
    );
    if (ok) removeDemoMembers(group.id);
  };

  const handleDelete = async () => {
    const ok = await confirmAction(
      "Excluir grupo",
      `Excluir "${group.name}"? Tarefas, ranking e mural do grupo serão apagados deste aparelho.`,
      "Excluir",
    );
    if (!ok) return;
    deleteGroup(group.id);
    router.replace("/groups");
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.title} numberOfLines={1}>
              {group.name}
            </Text>

            <View style={{ width: 25 }} />
          </View>

          {/* FOTO DO GRUPO (ADM troca) */}
          <View style={styles.photoWrap}>
            <TouchableOpacity
              disabled={!admin}
              onPress={async () => {
                const f = await pickImage();
                if (f) setGroupPhoto(group.id, f.uri);
              }}
              accessibilityRole="button"
              accessibilityLabel={admin ? "Trocar a foto do grupo" : "Foto do grupo"}
            >
              {group.photo ? (
                <Image source={{ uri: group.photo }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.photoEmpty]}>
                  <Ionicons name="people" size={38} color="#DDD6FE" />
                </View>
              )}
              {admin ? (
                <View style={styles.photoBadge}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                </View>
              ) : null}
            </TouchableOpacity>
            {admin && group.photo ? (
              <TouchableOpacity onPress={() => setGroupPhoto(group.id, null)} hitSlop={8}>
                <Text style={styles.photoRemove}>Remover foto</Text>
              </TouchableOpacity>
            ) : admin ? (
              <Text style={styles.photoRemove}>Toque para pôr uma foto</Text>
            ) : null}
          </View>

          <Text style={styles.subtitle}>
            {group.members.length} {group.members.length === 1 ? "membro" : "membros"} ·
            código de convite {group.code}
          </Text>

          {/* SEÇÕES */}
          <View style={styles.tabs}>
            {SECTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={section === s.key ? styles.activeTab : styles.tab}
                onPress={() => {
                  setSection(s.key);
                  setMessage(null);
                }}
                accessibilityRole="tab"
                aria-selected={section === s.key}
              >
                <Text style={styles.tabText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {message ? (
            <Text
              style={[styles.message, message.error && styles.messageError]}
              accessibilityLiveRegion="polite"
            >
              {message.text}
            </Text>
          ) : null}

          {/* TAREFAS DO GRUPO */}
          {section === "tarefas" && (
            <>
              <Text style={styles.hint}>
                Tarefas que todos do grupo devem cumprir. Cada conclusão vale XP para
                você e pontos no ranking do grupo.
              </Text>

              {group.tasks.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    Nenhuma tarefa ainda. Crie a primeira para o grupo competir!
                  </Text>
                </View>
              ) : (
                group.tasks.map((task) => {
                  const done = memberDone(group, user.uid, task);
                  const pending = memberPending(group, user.uid, task);
                  const rule = task.rule ?? "livre";
                  return (
                    <View key={task.id}>
                    <View style={styles.taskRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, done && styles.checkboxDone]}
                        onPress={() => handleComplete(task.id)}
                        disabled={done}
                        accessibilityRole="checkbox"
                        aria-checked={done}
                        accessibilityLabel={`${task.title}, ${taskXp(task)} XP`}
                      >
                        {done ? <Ionicons name={pending ? "time-outline" : "checkmark"} size={18} color="#FFF" /> : null}
                      </TouchableOpacity>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskTitle, done && styles.taskDone]}>
                          {task.title}
                        </Text>
                        <Text style={styles.taskMeta}>
                          {FREQUENCY_LABEL[task.frequency]} · +{taskXp(task)} XP ·{" "}
                          {resetHint(task.frequency).toLowerCase()} · criada por{" "}
                          {memberName(task.createdBy)}
                        </Text>
                        <Text style={styles.taskMeta}>
                          Regra: {RULE_LABEL[rule]}
                          {pending ? " · aguardando aprovação" : ""}
                        </Text>
                      </View>

                      {task.createdBy === user.uid || admin ? (
                        <TouchableOpacity
                          onPress={() => handleRemoveTask(task.id, task.title)}
                          style={styles.iconButton}
                          accessibilityRole="button"
                          accessibilityLabel={`Remover ${task.title}`}
                        >
                          <Ionicons name="close" size={18} color="#f87171" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {proofFor === task.id && !done ? (
                      <View style={[styles.formCard, { marginTop: 0, marginBottom: 8 }]}>
                        <Text style={styles.taskMeta}>
                          {rule === "aprovacao" ? "Conte como fez. Um ADM vai conferir e aprovar." : "Conte como você fez para concluir."}
                        </Text>
                        <TextInput
                          value={proofText}
                          onChangeText={setProofText}
                          placeholder="Ex.: estudei 2h de física, capítulo 3"
                          placeholderTextColor="#9E94AB"
                          style={[styles.input, { marginTop: 8 }]}
                          multiline
                        />
                        <TouchableOpacity style={styles.primary} onPress={() => handleComplete(task.id, proofText)}>
                          <Text style={styles.primaryText}>Enviar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    </View>
                  );
                })
              )}

              {/* APROVAÇÕES (ADM) */}
              {admin && pendingReviews.length > 0 ? (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Aguardando sua aprovação</Text>
                  {pendingReviews.map((c) => (
                    <View key={c.memberId + c.period} style={styles.reviewRow}>
                      <Text style={styles.taskTitle}>
                        {memberName(c.memberId)} · {group.tasks.find((t) => t.id === c.taskId)?.title ?? "tarefa"}
                      </Text>
                      {c.proof ? <Text style={styles.taskMeta}>“{c.proof}”</Text> : null}
                      <View style={styles.chips}>
                        <TouchableOpacity style={[styles.chip, styles.chipActive]} onPress={() => reviewCompletion(group.id, c.memberId, c.taskId, c.period, true)}>
                          <Text style={styles.chipText}>Aprovar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chip} onPress={() => reviewCompletion(group.id, c.memberId, c.taskId, c.period, false)}>
                          <Text style={styles.chipText}>Recusar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {canManageTasks(group, user.uid) ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Nova tarefa do grupo</Text>
                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Ex.: Estudar 2 horas"
                  placeholderTextColor="#9E94AB"
                  style={styles.input}
                  maxLength={60}
                  onSubmitEditing={handleAddTask}
                  accessibilityLabel="Nome da tarefa do grupo"
                />
                <View style={styles.chips}>
                  {FREQUENCIES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.chip, taskFrequency === f && styles.chipActive]}
                      onPress={() => setTaskFrequency(f)}
                      accessibilityRole="radio"
                      aria-checked={taskFrequency === f}
                    >
                      <Text style={styles.chipText}>
                        {FREQUENCY_LABEL[f]} · +{XP_BY_FREQUENCY[f]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.taskMeta, { marginTop: 10 }]}>Regra para concluir</Text>
                <View style={styles.chips}>
                  {RULES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, taskRule === r && styles.chipActive]}
                      onPress={() => setTaskRule(r)}
                      accessibilityRole="radio"
                      aria-checked={taskRule === r}
                    >
                      <Text style={styles.chipText}>{RULE_LABEL[r]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.primary,
                    (!taskTitle.trim() || group.tasks.length >= MAX_GROUP_TASKS) &&
                      styles.disabled,
                  ]}
                  onPress={handleAddTask}
                  disabled={!taskTitle.trim() || group.tasks.length >= MAX_GROUP_TASKS}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryText}>Criar tarefa</Text>
                </TouchableOpacity>
                <Text style={styles.limit}>
                  {group.tasks.length} de {MAX_GROUP_TASKS} tarefas
                </Text>
              </View>
              ) : (
                <Text style={styles.limit}>Só os ADMs criam tarefas neste grupo.</Text>
              )}
            </>
          )}

          {/* ENCONTROS (entram na agenda) */}
          {section === "encontros" && (
            <>
              <Text style={styles.hint}>
                Marque um encontro: ele vira convite no mural e aparece na agenda de todos do grupo.
              </Text>
              {(group.events ?? []).length === 0 ? (
                <Text style={styles.emptyText}>Nenhum encontro marcado.</Text>
              ) : (
                [...(group.events ?? [])]
                  .sort((a, b) => (a.day + (a.time ?? "")).localeCompare(b.day + (b.time ?? "")))
                  .map((e) => {
                    const going = e.going.includes(user.uid);
                    return (
                      <View key={e.id} style={styles.taskRow}>
                        <Ionicons name="calendar" size={22} color="#A78BFA" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskTitle}>{e.title}</Text>
                          <Text style={styles.taskMeta}>
                            {formatDay(e.day)}
                            {e.time ? ` às ${e.time}` : ""}
                            {e.place ? ` · ${e.place}` : ""} · {e.going.length} confirmado(s)
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.chip, going && styles.chipActive]}
                          onPress={() => toggleGoing(group.id, e.id)}
                          accessibilityRole="checkbox"
                          aria-checked={going}
                        >
                          <Text style={styles.chipText}>{going ? "Vou" : "Confirmar"}</Text>
                        </TouchableOpacity>
                        {e.createdBy === user.uid || admin ? (
                          <TouchableOpacity
                            onPress={async () => {
                              if (await confirmAction("Cancelar encontro", `Cancelar "${e.title}" para todos?`, "Cancelar encontro")) removeEvent(group.id, e.id);
                            }}
                            style={styles.iconButton}
                            accessibilityLabel={`Cancelar ${e.title}`}
                          >
                            <Ionicons name="close" size={18} color="#f87171" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })
              )}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Marcar encontro</Text>
                <TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="Ex.: estudar juntos na biblioteca" placeholderTextColor="#9E94AB" style={styles.input} />
                <View style={[styles.chips, { flexWrap: "nowrap" }]}>
                  <TextInput value={eventDate} onChangeText={(t) => setEventDate(maskDate(t))} placeholder="dd/mm/aa" placeholderTextColor="#9E94AB" style={[styles.input, { flex: 1 }]} keyboardType="number-pad" />
                  <TextInput value={eventTime} onChangeText={(t) => setEventTime(maskTime(t))} placeholder="hh:mm" placeholderTextColor="#9E94AB" style={[styles.input, { flex: 1 }]} keyboardType="number-pad" />
                </View>
                <TextInput value={eventPlace} onChangeText={setEventPlace} placeholder="Onde (opcional)" placeholderTextColor="#9E94AB" style={[styles.input, { marginTop: 10 }]} />
                <TouchableOpacity style={styles.primary} onPress={handleAddEvent}>
                  <Text style={styles.primaryText}>Marcar e convidar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* RANKING DO GRUPO */}
          {section === "ranking" && (
            <>
              <Text style={styles.hint}>
                Pontos = XP das tarefas do grupo concluídas. Os “Amigos exemplo” têm
                pontos fixos só para demonstração.
              </Text>
              {ranking.map((row) => {
                const isMe = row.id === user.uid;
                return (
                  <View key={row.id} style={[styles.rankRow, isMe && styles.rankMe]}>
                    {row.position <= 3 ? (
                      <Ionicons name="medal" size={20} color={MEDAL_COLORS[row.position - 1]} style={{ width: 28 }} />
                    ) : (
                      <Text style={styles.rankPosition}>{row.position}</Text>
                    )}
                    <UserAvatar
                      uri={isMe ? user.avatar : null}
                      size={30}
                      style={styles.rankAvatar}
                    >
                      <Ionicons name="person" size={16} color="#cbd5f5" />
                    </UserAvatar>
                    <Text style={styles.rankName} numberOfLines={1}>
                      {isMe ? `${displayName(user)} (você)` : row.name}
                    </Text>
                    {row.isDemo ? <Text style={styles.demoTag}>exemplo</Text> : null}
                    <Text style={styles.rankPoints}>{row.points} pts</Text>
                  </View>
                );
              })}

              {/* QUEM MAIS GUARDOU (Minhas finanças) */}
              {settings.compareSavings ? (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Quem mais guardou no mês</Text>
                  <Text style={styles.taskMeta}>
                    Vem dos cofrinhos de Minhas finanças. No fim do mês, quem guardou mais ganha +{settings.savingsBonus} XP.
                  </Text>
                  <QuickSave />
                  <Text style={[styles.formTitle, { marginTop: 14, marginBottom: 6 }]}>Ranking do mês</Text>
                  {savings.length === 0 ? (
                    <Text style={styles.emptyText}>Ninguém guardou ainda neste mês.</Text>
                  ) : (
                    savings.map((r, i) => (
                      <View key={r.id} style={[styles.rankRow, r.id === user.uid && styles.rankMe]}>
                        <Text style={styles.rankPosition}>{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rankName}>{r.id === user.uid ? `${r.name} (você)` : r.name}</Text>
                          <View style={styles.saveBar}>
                            <View style={[styles.saveFill, { width: `${(r.saved / savings[0].saved) * 100}%` }]} />
                          </View>
                        </View>
                        <Text style={styles.rankPoints}>{formatMoney(r.saved)}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </>
          )}

          {/* MURAL (só para o grupo) */}
          {section === "mural" && (
            <>
              <Text style={styles.hint}>
                Publicações visíveis só para os membros deste grupo.
              </Text>
              <PostComposer
                onSubmit={(text) => addPost(group.id, text)}
                placeholder="Escreva para o grupo..."
                imageNotice="Fotos no mural do grupo (vistas só pelos membros) ficam disponíveis quando o armazenamento de arquivos for integrado ao servidor."
              />
              {group.posts.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma publicação no grupo ainda.</Text>
              ) : (
                group.posts.map((p) => (
                  <View key={p.id} style={styles.post}>
                    <Text style={styles.postAuthor}>{memberName(p.authorId)}</Text>
                    <Text style={styles.postText}>{p.text}</Text>
                    <Text style={styles.postDate}>
                      {new Date(p.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}

          {/* MEMBROS E CONVITES */}
          {section === "membros" && (
            <>
              {group.members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    disabled={m.isDemo}
                    onPress={() => router.push({ pathname: "/user", params: { id: m.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver perfil de ${m.name}`}
                  >
                    <Text style={styles.memberName}>
                      {m.id === user.uid ? `${displayName(user)} (você)` : m.name}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.memberRole}>{m.isDemo ? "exemplo" : roleOf(m.id)}</Text>
                  {/* Só o criador promove ou tira ADM */}
                  {group.ownerId === user.uid && !m.isDemo && m.id !== group.ownerId ? (
                    <TouchableOpacity
                      style={[styles.chip, { marginLeft: 6, paddingVertical: 4 }]}
                      onPress={() => setAdmin(group.id, m.id, roleOf(m.id) !== "ADM")}
                    >
                      <Text style={styles.chipText}>{roleOf(m.id) === "ADM" ? "Tirar ADM" : "Tornar ADM"}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {admin && m.id !== user.uid && m.id !== group.ownerId && (group.ownerId === user.uid || roleOf(m.id) !== "ADM") ? (
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(m.id, m.name)}
                      style={styles.iconButton}
                      accessibilityLabel={`Remover ${m.name}`}
                    >
                      <Ionicons name="person-remove-outline" size={17} color="#f87171" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}

              {/* CONFIGURAÇÕES (ADM) */}
              {admin ? (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Configurações do grupo (ADM)</Text>
                  {[
                    { key: "onlyAdminsTasks" as const, label: "Só ADMs criam e removem tarefas" },
                    { key: "compareSavings" as const, label: "Comparar quanto cada um guardou (com bônus)" },
                  ].map((opt) => (
                    <View key={opt.key} style={[styles.memberRow, { backgroundColor: "transparent", paddingHorizontal: 0 }]}>
                      <Text style={[styles.memberName, { flex: 1 }]}>{opt.label}</Text>
                      <TouchableOpacity
                        style={[styles.chip, settings[opt.key] && styles.chipActive]}
                        onPress={() => updateSettings(group.id, { [opt.key]: !settings[opt.key] })}
                        accessibilityRole="switch"
                        aria-checked={settings[opt.key]}
                      >
                        <Text style={styles.chipText}>{settings[opt.key] ? "Sim" : "Não"}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {settings.compareSavings ? (
                    <View style={styles.chips}>
                      {[100, 200, 300].map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.chip, settings.savingsBonus === b && styles.chipActive]}
                          onPress={() => updateSettings(group.id, { savingsBonus: b })}
                        >
                          <Text style={styles.chipText}>Bônus +{b} XP</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {group.invites.map((i) => (
                <View key={i.handle} style={styles.memberRow}>
                  <Text style={styles.memberName}>{i.handle}</Text>
                  <Text style={styles.memberRole}>convite pendente</Text>
                </View>
              ))}

              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Convidar amigo</Text>
                <TextInput
                  value={inviteHandle}
                  onChangeText={setInviteHandle}
                  placeholder="@usuario ou e-mail"
                  placeholderTextColor="#9E94AB"
                  style={styles.input}
                  autoCapitalize="none"
                  onSubmitEditing={handleInvite}
                  accessibilityLabel="Usuário ou e-mail do amigo"
                />
                <TouchableOpacity
                  style={[styles.primary, !inviteHandle.trim() && styles.disabled]}
                  onPress={handleInvite}
                  disabled={!inviteHandle.trim()}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryText}>Registrar convite</Text>
                </TouchableOpacity>
                <Text style={styles.limit}>
                  Para entrar, o amigo usa o código {group.code} em Grupos › Entrar
                  com código. Neste aparelho já funciona; o envio do convite e a
                  entrada a partir de outros aparelhos dependem do servidor.
                </Text>
              </View>

              {group.ownerId === user.uid && group.members.some((m) => m.isDemo) ? (
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={handleRemoveDemo}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryText}>Remover participantes de exemplo</Text>
                </TouchableOpacity>
              ) : null}

              {group.ownerId === user.uid ? (
                <TouchableOpacity
                  style={styles.danger}
                  onPress={handleDelete}
                  accessibilityRole="button"
                >
                  <Text style={styles.dangerText}>Excluir grupo</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.danger}
                  onPress={handleLeave}
                  accessibilityRole="button"
                >
                  <Text style={styles.dangerText}>Sair do grupo</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },

  content: { padding: 15, paddingBottom: 110 },

  notFound: { flex: 1, justifyContent: "center", padding: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  back: { color: "#FFF", fontSize: 25 },

  title: { color: "#FFF", fontSize: 20, fontWeight: "600", flex: 1, textAlign: "center" },

  subtitle: { color: "#C7BADB", fontSize: 12, textAlign: "center", marginBottom: 12 },
  photoWrap: { alignItems: "center", marginBottom: 8 },
  photo: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: "#A78BFA" },
  photoEmpty: { backgroundColor: "#3B2A5A", alignItems: "center", justifyContent: "center" },
  photoBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#43247D",
  },
  photoRemove: { color: "#DDD6FE", fontSize: 12, marginTop: 6, textDecorationLine: "underline" },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 4,
    marginBottom: 10,
  },

  // Largura pelo texto: as 5 seções cabem em telas de 320 px
  activeTab: {
    flexGrow: 1,
    paddingHorizontal: 4,
    backgroundColor: "#5B21B6",
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: "center",
  },

  tab: { flexGrow: 1, paddingHorizontal: 4, paddingVertical: 9, alignItems: "center" },

  tabText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  message: {
    color: "#86EFAC",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(54,211,91,0.12)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },

  messageError: { color: "#FCA5A5", backgroundColor: "rgba(248,113,113,0.12)" },

  hint: { color: "#C7BADB", fontSize: 12, lineHeight: 17, marginBottom: 10 },

  empty: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },

  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center", marginVertical: 6 },

  taskRow: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E0EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  checkboxDone: { backgroundColor: "#7C3AED", borderColor: "#A78BFA" },

  checkText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  taskTitle: { color: "#FFF", fontSize: 14 },

  taskDone: { color: "#9E94AB", textDecorationLine: "line-through" },

  taskMeta: { color: "#C7BADB", fontSize: 11, marginTop: 2 },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  removeText: { color: "#f87171", fontSize: 16 },

  reviewRow: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingVertical: 8 },

  formCard: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
  },

  formTitle: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 10 },

  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  chips: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },

  chip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#5B21B6",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },

  chipText: { color: "#FFF", fontSize: 12 },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 12,
    minHeight: 46,
  },

  disabled: { opacity: 0.45 },

  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  limit: { color: "#C7BADB", fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 17 },

  rankRow: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

  rankMe: { borderColor: "#A78BFA" },

  rankPosition: { color: "#FFF", width: 28, fontSize: 15, textAlign: "center" },

  rankAvatar: { backgroundColor: "#7774D6", marginHorizontal: 8 },

  rankName: { color: "#FFF", fontSize: 14, flex: 1 },

  demoTag: {
    color: "#C7BADB",
    fontSize: 10,
    borderWidth: 1,
    borderColor: "#5B21B6",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginRight: 6,
  },

  rankPoints: { color: "#B83CE5", fontSize: 14, fontWeight: "700" },
  saveBar: { height: 6, backgroundColor: "#57356F", borderRadius: 6, marginTop: 4, overflow: "hidden" },
  saveFill: { height: "100%", backgroundColor: "#0EA5E9" },

  post: {
    backgroundColor: "#25193A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },

  postAuthor: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  postText: { color: "#E2E8F0", fontSize: 14, marginTop: 4 },

  postDate: { color: "#9E94AB", fontSize: 11, marginTop: 6 },

  memberRow: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  memberName: { color: "#FFF", fontSize: 14, flex: 1 },

  memberRole: { color: "#C7BADB", fontSize: 12 },

  secondary: {
    borderWidth: 1,
    borderColor: "#5B21B6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },

  secondaryText: { color: "#DDD6FE", fontSize: 14, fontWeight: "600" },

  danger: {
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.5)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },

  dangerText: { color: "#f87171", fontSize: 14, fontWeight: "600" },
});
