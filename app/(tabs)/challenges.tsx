import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { FocusLogo } from "@/components/FocusLogo";
import { openPremium, PERIOD, usePremium, useRemaining } from "@/components/PremiumGate";
import UserAvatar from "@/components/UserAvatar";
import {
  ACHIEVEMENTS,
  CYCLE_BONUS,
  HABIT_XP,
  PUNCTUALITY_BONUS,
  PUNCTUALITY_WINDOW_MIN,
  resetHint,
} from "@/constants/gamification";
import type { IconName } from "@/constants/icons";
import { featureOf, isAutoTask, isEditableTask } from "@/constants/taskFeatures";
import { BooksContext } from "@/context/BooksContext";
import { FocusContext, formatTimer, PHASE_LABEL } from "@/context/FocusContext";
import {
  CYCLE_LABEL,
  Frequency,
  RoutineContext,
  RoutineTask,
} from "@/context/RoutineContext";
import { GroupsContext } from "@/context/GroupsContext";
import { TaskExtrasContext, timerMinutes } from "@/context/TaskExtrasContext";
import { Habit, HabitsContext, minutesFromTime } from "@/context/HabitsContext";
import { UserContext } from "@/context/UserContext";
import { XPContext } from "@/context/XPContext";
import { groupRanking } from "@/services/groupsService";

// Início com no máximo 6 blocos (pedido do grupo): bem-vindo, ciclo de foco,
// hábitos, desafios, atalhos e ranking. Foco, Desafios (rotina) e Grupos foram
// para a barra de baixo; Conquistas, Progresso e Histórico de XP ficam no Perfil.
const SHORTCUTS = [
  { label: "Diário", icon: "journal-outline", href: "/diary", limit: "diarioDia" },
  { label: "Agenda", icon: "today-outline", href: "/agenda", limit: "agendaMes" },
  { label: "Desenvolvimento pessoal", icon: "layers-outline", href: "/projects", limit: "projetos" },
  { label: "Minha Estante", icon: "library-outline", href: "/bookshelf", limit: "livros" },
  { label: "Finanças", icon: "wallet-outline", href: "/finance", limit: "lancamentosMes" },
  { label: "Lembretes", icon: "notifications-outline", href: "/reminders", limit: "lembretes" },
] as const;

// O que mais aparece no cartão "Seu plano grátis" do topo
const TOP_QUOTAS = [
  { key: "focoProfundoMes", label: "Foco 50/10" },
  { key: "habitos", label: "Hábitos" },
  { key: "livros", label: "Livros" },
  { key: "grupos", label: "Grupos" },
] as const;

const CYCLE_TABS = [
  { id: "daily", label: "Diários" },
  { id: "weekly", label: "Semanais" },
  { id: "monthly", label: "Mensais" },
] as const;

export default function Challenges() {
  const { width } = useWindowDimensions();

  /*
   * Base do Figma:
   * aproximadamente 236px de largura.
   *
   * Tudo abaixo é calculado proporcionalmente à largura
   * disponível do aparelho.
   */
  const BASE_WIDTH = 236;
  const scale = width / BASE_WIDTH;

  // Limita a escala entre 0,85x e 1,35x do valor do Figma
  // (evita textos minúsculos e tudo gigante em tablets)
  const s = (value: number) =>
    Math.max(value * 0.85, Math.min(value * scale, value * 1.35));

  const xpContext = useContext(XPContext);
  const userContext = useContext(UserContext);
  const routine = useContext(RoutineContext);
  const focus = useContext(FocusContext);
  const groupsContext = useContext(GroupsContext);
  const habitsContext = useContext(HabitsContext);
  const extras = useContext(TaskExtrasContext);
  const booksContext = useContext(BooksContext);

  const [xpText, setXpText] = useState("");
  const [cycleBanner, setCycleBanner] = useState("");
  const [cycleTab, setCycleTab] = useState<Frequency>("daily");
  const [xpAnim] = useState(new Animated.Value(0));

  // O aviso de LEVEL UP fica no layout das abas (components/LevelUpOverlay)
  const level = xpContext?.level ?? 1;

  // Aviso rápido quando a conclusão libera uma conquista.
  // Guarda o valor visto ao abrir a tela: conquista antiga não gera aviso.
  const lastUnlocked = xpContext?.lastUnlocked;
  const [seenUnlocked, setSeenUnlocked] = useState(lastUnlocked);
  const [achievementBanner, setAchievementBanner] = useState("");

  useEffect(() => {
    if (lastUnlocked === seenUnlocked) return;
    setSeenUnlocked(lastUnlocked);
    if (!lastUnlocked || lastUnlocked.length === 0) return;
    const unlocked = ACHIEVEMENTS.filter((a) => lastUnlocked.includes(a.id));
    // Mensagem de reconhecimento da conquista (quando houver)
    const message = unlocked.find((a) => a.message)?.message;
    setAchievementBanner(
      unlocked.map((a) => a.title).join(", ") + (message ? `\n“${message}”` : ""),
    );
  }, [lastUnlocked, seenUnlocked]);

  // Esconder fica num efeito próprio, para outra conclusão não cancelar o timer
  useEffect(() => {
    if (!achievementBanner) return;
    const timer = setTimeout(() => setAchievementBanner(""), 4500);
    return () => clearTimeout(timer);
  }, [achievementBanner]);

  useEffect(() => {
    if (!cycleBanner) return;
    const timer = setTimeout(() => setCycleBanner(""), 3500);
    return () => clearTimeout(timer);
  }, [cycleBanner]);

  if (!xpContext || !routine || !focus) throw new Error("Contexto não encontrado");

  const { xpToNext, progress, streakDays, activeToday, weeklyXp } = xpContext;
  const { tasks, completeTask, isDone, cycleStatus } = routine;
  // "Bem-vindo, Ana!": só o primeiro nome
  const userName = userContext?.user.name.trim().split(" ")[0];
  // Plano grátis com limites de uso; o cartão abaixo convida para o Premium
  const isPremium = usePremium();
  const remaining = useRemaining();
  const avatar = userContext?.user.avatar ?? null;

  // Melhor colocação entre os grupos do usuário
  const uid = userContext?.user.uid ?? "";
  const best = (groupsContext?.groups ?? [])
    .map((g) => ({ group: g, row: groupRanking(g).find((r) => r.id === uid) }))
    .filter((x) => x.row)
    .sort((a, b) => a.row!.position - b.row!.position)[0];

  // Rotina: tarefas diárias e semanais reiniciam sozinhas a cada período
  const tasksOf = (frequency: Frequency) =>
    tasks
      .filter((t) => t.frequency === frequency)
      .map((t) => ({ ...t, done: isDone(t) }));

  const openTask = (id: string) => router.push({ pathname: "/task", params: { id } });
  // Diárias têm lembrete próprio; semanais/mensais seguem o "reveja seus objetivos"
  const isDaily = (id: string) => tasks.find((t) => t.id === id)?.frequency === "daily";
  const reminderOn = (id: string) =>
    isDaily(id) ? !!extras?.reminders[id]?.on : !!extras?.digest.on;

  // Só mostra o lápis quando já existe algo salvo para editar
  const canEdit = (id: string) => {
    if (!extras || !isEditableTask(id)) return false;
    if (featureOf(id).modules.some((m) => m.kind === "flashcards")) return extras.cards.length > 0;
    return extras.entriesOf(id).length > 0;
  };

  // Linha de apoio: progresso do critério e horário do lembrete
  const taskHint = (id: string, done: boolean) => {
    const parts: { icon: IconName; text: string }[] = [];
    if (!done && extras) {
      const minutes = timerMinutes(id);
      const kinds = featureOf(id).modules.map((m) => m.kind);
      if (minutes) {
        parts.push({ icon: "stopwatch-outline", text: `${Math.floor(extras.timerElapsed(id) / 60000)}/${minutes} min` });
      } else if (kinds.includes("gratitude")) {
        parts.push({ icon: "heart-outline", text: `${extras.entriesOf(id, extras.today).length}/3` });
      } else if (kinds.includes("todo3")) {
        parts.push({ icon: "checkbox-outline", text: `${extras.todosToday.filter((t) => t.done).length}/3` });
      } else if (id === "lei-20pg") {
        parts.push({ icon: "book-outline", text: `${booksContext?.pagesToday ?? 0}/20 pág.` });
      } else if (kinds.includes("backlog")) {
        const late = extras.backlog.filter((b) => !b.doneAt && b.due && b.due < extras.today).length;
        if (late) parts.push({ icon: "warning-outline", text: `${late} atrasada${late > 1 ? "s" : ""}` });
      }
    }
    if (isDaily(id) && extras?.reminders[id]?.on) {
      const time = extras.reminderTime(id);
      if (time) parts.push({ icon: "notifications", text: time });
    }
    return parts;
  };

  const handleComplete = (task: RoutineTask) => {
    if (isDone(task)) return;

    const result = completeTask(task);
    if (result.gained === 0) return;

    if (result.cycleClosed) {
      setCycleBanner(
        `${CYCLE_LABEL[task.frequency]} completo! +${CYCLE_BONUS[task.frequency]} XP de bônus`,
      );
    }

    floatXp(result.gained);
  };

  const floatXp = (gained: number) => {
    setXpText(`+${gained} XP`);

    Animated.timing(xpAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      xpAnim.setValue(0);
      setXpText("");
    });
  };

  // Hábitos de hoje: XP do hábito + bônus se marcado dentro do horário
  const handleHabit = (habit: Habit) => {
    if (!habitsContext || habitsContext.isDoneToday(habit)) return;
    const result = habitsContext.completeHabit(habit);
    if (result.gained === 0) return;
    if (result.punctual) {
      setCycleBanner(`No horário! +${PUNCTUALITY_BONUS} XP de pontualidade`);
    }
    floatXp(result.gained);
  };

  // Texto do horário: dentro da janela, antes ou depois
  const timeHint = (habit: Habit) => {
    if (!habit.time) return "";
    const diff = minutesFromTime(habit.time);
    if (Math.abs(diff) <= PUNCTUALITY_WINDOW_MIN) return ` · ${habit.time} · agora vale bônus`;
    return ` · ${habit.time}`;
  };

  const translateY = xpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -s(25)],
  });

  const opacity = xpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6B4A91", "#43247D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.background}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingHorizontal: s(9),
              paddingTop: s(14),
              paddingBottom: 110,
            },
          ]}
        >
          {/* MARCA: logo do Focus no topo do Início */}
          <View style={[styles.brandBar, { marginBottom: s(8) }]}>
            <FocusLogo size={s(78)} />
          </View>

          {/* CONVITE PREMIUM (só no plano grátis) */}
          {!isPremium ? (
            <TouchableOpacity
              onPress={openPremium}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[styles.premiumBanner, { borderRadius: s(7), padding: s(8), marginBottom: s(8) }]}
            >
              <Text style={[styles.premiumTitle, { fontSize: s(10) }]}>
                <Ionicons name="diamond" /> Conheça o Focus Premium
              </Text>
              <Text style={[styles.premiumText, { fontSize: s(8), marginTop: s(2) }]}>
                Libere todas as ferramentas da sua rotina.
              </Text>
              {/* Quanto ainda resta no plano grátis */}
              <Text style={[styles.premiumText, { fontSize: s(7), marginTop: s(5), fontWeight: "700" }]}>
                Seu plano grátis · ainda restam:
              </Text>
              <View style={[styles.quotaRow, { gap: s(4), marginTop: s(3) }]}>
                {TOP_QUOTAS.map((q) => (
                  <View
                    key={q.key}
                    style={[
                      styles.quotaChip,
                      { borderRadius: s(5), paddingHorizontal: s(5), paddingVertical: s(2) },
                      remaining[q.key] === 0 && styles.quotaChipOut,
                    ]}
                  >
                    <Text style={[styles.quotaNumber, { fontSize: s(10) }, remaining[q.key] === 0 && { color: "#2B1A00" }]}>
                      {remaining[q.key]}
                    </Text>
                    <Text style={[styles.quotaLabel, { fontSize: s(6.5) }, remaining[q.key] === 0 && { color: "#2B1A00" }]}>
                      {q.label}
                      {PERIOD[q.key] ? ` ${PERIOD[q.key]}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ) : null}

          {/* BEM-VINDO */}

          <View
            style={[
              styles.welcomeCard,
              {
                borderRadius: s(7),
                paddingHorizontal: s(9),
                paddingVertical: s(8),
                marginBottom: s(8),
              },
            ]}
          >
            <View style={styles.welcomeTop}>
              <TouchableOpacity
                onPress={() => router.push("/profile")}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Abrir perfil"
                style={[
                  styles.welcomeAvatar,
                  {
                    width: s(34),
                    height: s(34),
                    borderRadius: s(18),
                    marginRight: s(7),
                    borderWidth: s(1.5),
                  },
                ]}
              >
                <UserAvatar uri={avatar} size={s(34) - s(3)}>
                  <Text
                    style={[
                      styles.avatarFace,
                      {
                        fontSize: s(16),
                      },
                    ]}
                  >
                    <Ionicons name="person" />
                  </Text>
                </UserAvatar>
              </TouchableOpacity>

              <View style={styles.welcomeTexts}>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.welcomeText,
                      {
                        fontSize: s(12),
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {userName ? `Bem-vindo, ${userName}!` : "Bem-vindo!"}
                  </Text>

                  <View
                    style={[
                      styles.levelBadge,
                      {
                        borderRadius: s(7),
                        paddingHorizontal: s(6),
                        paddingVertical: s(2),
                        marginLeft: s(6),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeText,
                        {
                          fontSize: s(7),
                        },
                      ]}
                    >
                      Nível {level}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.welcomeSubtitle,
                    {
                      fontSize: s(8),
                      marginTop: s(2),
                    },
                  ]}
                  numberOfLines={1}
                >
                  Vamos evoluir seus objetivos hoje?
                </Text>
              </View>
            </View>

            {/* XP */}

            <View
              style={[
                styles.xpBarBackground,
                {
                  height: s(10),
                  borderRadius: s(10),
                  marginTop: s(8),
                },
              ]}
            >
              <View
                style={[
                  styles.xpBar,
                  {
                    width: `${progress}%`,
                    borderRadius: s(10),
                  },
                ]}
              />
            </View>

            <Text
              style={[
                styles.xpNext,
                {
                  fontSize: s(8),
                  marginTop: s(5),
                },
              ]}
            >
              {xpToNext} XP para o próximo nível
            </Text>

            {/* Sequência e XP da semana (antes eram cartões separados) */}
            <View style={[styles.miniStats, { gap: s(10), marginTop: s(6) }]}>
              <Text style={[styles.miniStat, { fontSize: s(8) }]}>
                <Ionicons name="flame" color="#FB923C" /> {streakDays} {streakDays === 1 ? "dia" : "dias"} seguidos
                {activeToday ? "" : " · conclua algo hoje"}
              </Text>
              <Text style={[styles.miniStat, { fontSize: s(8) }]}>+{weeklyXp} XP na semana</Text>
            </View>

            {xpText !== "" && (
              <Animated.Text
                style={[
                  styles.xpFloating,
                  {
                    top: s(40),
                    right: s(10),
                    fontSize: s(12),
                    transform: [{ translateY }],
                    opacity,
                  },
                ]}
              >
                {xpText}
              </Animated.Text>
            )}
          </View>

          {achievementBanner !== "" && (
            <TouchableOpacity
              onPress={() => router.push("/achievements")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLiveRegion="polite"
              style={[
                styles.achievementBanner,
                {
                  borderRadius: s(7),
                  padding: s(7),
                  marginBottom: s(8),
                },
              ]}
            >
              <Text style={[styles.achievementBannerText, { fontSize: s(9) }]}>
                Nova conquista: {achievementBanner}
              </Text>
            </TouchableOpacity>
          )}

          {cycleBanner !== "" && (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.cycleBanner,
                {
                  borderRadius: s(7),
                  padding: s(7),
                  marginBottom: s(8),
                },
              ]}
            >
              <Text style={[styles.achievementBannerText, { fontSize: s(9) }]}>
                {cycleBanner}
              </Text>
            </View>
          )}

          {/* CICLO DE FOCO (Figma: sempre visível; mostra o tempo quando está rodando) */}

          <TouchableOpacity
            onPress={() => router.push("/focus")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              focus.status === "idle" ? "Abrir ciclo de foco" : `${PHASE_LABEL[focus.phase]} ${formatTimer(focus.remainingMs)}`
            }
            style={[
              styles.focusBanner,
              {
                borderRadius: s(7),
                paddingHorizontal: s(9),
                paddingVertical: s(7),
                marginBottom: s(10),
              },
            ]}
          >
            <Text style={[styles.focusBannerText, { fontSize: s(10) }]}>
              <Ionicons name="stopwatch-outline" />{" "}
              {focus.status === "idle"
                ? "Ciclo de foco"
                : `${PHASE_LABEL[focus.phase]} ${focus.status === "paused" ? "pausado" : "em andamento"}`}
            </Text>
            <Text style={[styles.focusBannerTime, { fontSize: s(12) }]}>
              {formatTimer(focus.remainingMs)}
            </Text>
          </TouchableOpacity>

          {/* HÁBITOS DE HOJE (criados pela pessoa) */}

          <View
            style={[
              styles.tasksCard,
              { borderRadius: s(7), padding: s(9), marginBottom: s(10) },
            ]}
          >
            <View style={styles.tasksHeader}>
              <Text style={[styles.tasksTitle, { fontSize: s(13) }]}>Hábitos de Hoje</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/routine", params: { tab: "habitos" } })}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Gerenciar hábitos"
              >
                <Text style={[styles.manageLink, { fontSize: s(8) }]}>
                  {habitsContext?.habits.length ? "Gerenciar" : "Criar hábito"}
                </Text>
              </TouchableOpacity>
            </View>

            {!habitsContext?.habits.length ? (
              <Text style={[styles.cycleHint, { fontSize: s(8), paddingVertical: s(5) }]}>
                Crie hábitos com dias e horário (opcional). Cumprir no horário dá bônus.
              </Text>
            ) : habitsContext.todayHabits.length === 0 ? (
              <Text style={[styles.cycleHint, { fontSize: s(8), paddingVertical: s(5) }]}>
                Nenhum hábito programado para hoje. Aproveite o descanso!
              </Text>
            ) : (
              habitsContext.todayHabits.map((h) => {
                const done = habitsContext.isDoneToday(h);
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.taskRow, { minHeight: s(32) }]}
                    onPress={() => handleHabit(h)}
                    disabled={done}
                    activeOpacity={0.8}
                    accessibilityRole="checkbox"
                    aria-checked={done}
                    aria-disabled={done}
                    accessibilityLabel={`${h.title}, hábito, ${HABIT_XP} XP${h.time ? `, horário ${h.time}` : ""}`}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          width: s(28),
                          height: s(28),
                          borderRadius: s(7),
                          borderWidth: s(2.5),
                          marginRight: s(5),
                        },
                        done && styles.checkboxDone,
                      ]}
                    >
                      {done && <Ionicons name="checkmark" style={[styles.check, { fontSize: s(16) }]} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[styles.taskText, { fontSize: s(9) }, done && styles.taskTextDone]}
                        numberOfLines={2}
                      >
                        {h.title}
                      </Text>
                      {h.time ? (
                        <Text style={[styles.cycleHint, { fontSize: s(7) }]} numberOfLines={1}>
                          {done ? `feito${timeHint(h)}` : `hábito${timeHint(h)}`}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.taskXp,
                        { borderRadius: s(6), paddingHorizontal: s(5), paddingVertical: s(2) },
                      ]}
                    >
                      <Text style={[styles.taskXpText, { fontSize: s(7) }]}>+{HABIT_XP} XP</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* DESAFIOS: um bloco só, com abas Diários / Semanais / Mensais */}

          {[cycleTab].map((frequency) => {
            const list = tasksOf(frequency);
            const status = cycleStatus(frequency);

            return (
          <View
            key={frequency}
            style={[
              styles.tasksCard,
              {
                borderRadius: s(7),
                padding: s(9),
                marginBottom: s(10),
              },
            ]}
          >
            <View style={styles.tasksHeader}>
              <Text
                style={[
                  styles.tasksTitle,
                  {
                    fontSize: s(13),
                  },
                ]}
              >
                Desafios
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/routine")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Gerenciar rotina"
              >
                <Text style={[styles.manageLink, { fontSize: s(8) }]}>
                  Gerenciar
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cycleTabs, { borderRadius: s(6), padding: s(2), marginTop: s(6) }]}>
              {CYCLE_TABS.map((t) => {
                const st = cycleStatus(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setCycleTab(t.id)}
                    accessibilityRole="tab"
                    aria-selected={cycleTab === t.id}
                    style={[styles.cycleTab, { borderRadius: s(5), paddingVertical: s(5) }, cycleTab === t.id && styles.cycleTabActive]}
                  >
                    <Text style={[styles.cycleTabText, { fontSize: s(8) }]} numberOfLines={1}>
                      {t.label} {st.done}/{st.total}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Progresso do ciclo */}
            <View style={[styles.cycleRow, { marginTop: s(4), marginBottom: s(6) }]}>
              <View
                style={[
                  styles.cycleBarBackground,
                  { height: s(5), borderRadius: s(5) },
                ]}
              >
                <View
                  style={[
                    styles.cycleBar,
                    {
                      width: `${status.total ? (status.done / status.total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.cycleText, { fontSize: s(7), marginLeft: s(5) }]}>
                {status.closed
                  ? status.done >= status.total
                    ? "ciclo completo"
                    : `${status.done}/${status.total} · bônus já recebido`
                  : `${status.done}/${status.total} · bônus +${CYCLE_BONUS[frequency]} XP`}
              </Text>
            </View>

            {frequency !== "daily" && !status.closed && (
              <Text style={[styles.cycleHint, { fontSize: s(7), marginBottom: s(4) }]}>
                {resetHint(frequency)}
              </Text>
            )}

            {list.length === 0 && (
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: "/catalog", params: { frequency } })
                }
                accessibilityRole="button"
              >
                <Text style={[styles.cycleHint, { fontSize: s(8), paddingVertical: s(6) }]}>
                  Nenhum desafio neste ciclo. Toque para escolher no catálogo.
                </Text>
              </TouchableOpacity>
            )}

            {list.map((item) => {
              // Desafios com critério (cronômetro, 3 gratidões...) abrem o detalhe
              const auto = isAutoTask(item.id);
              const hint = taskHint(item.id, item.done);
              return (
              <View key={item.id} style={styles.taskRow}>
              <TouchableOpacity
                style={[
                  styles.taskRow,
                  {
                    minHeight: s(32),
                    flex: 1,
                    minWidth: 0,
                  },
                ]}
                onPress={() => (auto ? openTask(item.id) : handleComplete(item))}
                disabled={item.done && !auto}
                activeOpacity={0.8}
                accessibilityRole={auto ? "button" : "checkbox"}
                aria-checked={item.done}
                aria-disabled={item.done}
                accessibilityLabel={`${item.title}, ${item.xp} XP${auto && !item.done ? ", abrir para cumprir" : ""}`}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      width: s(28),
                      height: s(28),
                      borderRadius: s(7),
                      borderWidth: s(2.5),
                      marginRight: s(5),
                    },
                    item.done && styles.checkboxDone,
                  ]}
                >
                  {item.done && (
                    <Text
                      style={[
                        styles.check,
                        {
                          fontSize: s(16),
                        },
                      ]}
                    >
                      <Ionicons name="checkmark" />
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.taskText,
                      {
                        fontSize: s(9),
                      },
                      item.done && styles.taskTextDone,
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {hint.length ? (
                    <Text style={[styles.cycleHint, { fontSize: s(7) }]} numberOfLines={1}>
                      {hint.map((h, i) => (
                        <Text key={h.icon}>
                          {i > 0 ? " · " : ""}
                          <Ionicons name={h.icon} /> {h.text}
                        </Text>
                      ))}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.taskXp,
                    {
                      borderRadius: s(6),
                      paddingHorizontal: s(5),
                      paddingVertical: s(2),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.taskXpText,
                      {
                        fontSize: s(7),
                      },
                    ]}
                  >
                    +{item.xp} XP
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Lápis: abre direto no que já foi salvo, para ver e editar */}
              {canEdit(item.id) && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/task", params: { id: item.id, edit: "1" } })}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar o que você salvou em ${item.title}`}
                  style={[
                    styles.bellButton,
                    {
                      width: s(20),
                      height: s(20),
                      borderRadius: s(10),
                      marginLeft: s(5),
                    },
                  ]}
                >
                  <Ionicons name="create-outline" size={s(10)} color="#DDD6FE" />
                </TouchableOpacity>
              )}

              {/* Sininho: mostra se o lembrete está ligado e abre o detalhe */}
              <TouchableOpacity
                onPress={() => openTask(item.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}: lembrete ${reminderOn(item.id) ? "ligado" : "desligado"}. Abrir`}
                style={[
                  styles.bellButton,
                  reminderOn(item.id) && styles.bellButtonOn,
                  {
                    width: s(20),
                    height: s(20),
                    borderRadius: s(10),
                    marginLeft: s(5),
                  },
                ]}
              >
                <Ionicons
                  name={reminderOn(item.id) ? "notifications" : "notifications-off-outline"}
                  size={s(10)}
                  color={reminderOn(item.id) ? "#FFF" : "#9E94AB"}
                />
              </TouchableOpacity>
              </View>
              );
            })}
          </View>
            );
          })}

          {/* ATALHOS */}

          <View
            style={[
              styles.shortcutsGrid,
              {
                gap: s(7),
                marginBottom: s(10),
              },
            ]}
          >
            {SHORTCUTS.map((item) => (
              <TouchableOpacity
                key={item.href}
                style={[
                  styles.shortcutCard,
                  {
                    borderRadius: s(7),
                    paddingVertical: s(8),
                    paddingHorizontal: s(8),
                  },
                ]}
                onPress={() => router.push(item.href)}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon} size={s(15)} color="#DDD6FE" style={{ marginRight: s(5) }} />

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.shortcutText,
                      {
                        fontSize: s(10),
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                    {!isPremium ? <Text style={styles.premiumTag}> · Premium</Text> : null}
                  </Text>
                  {!isPremium ? (
                    <Text
                      style={[styles.quotaLine, { fontSize: s(7) }, remaining[item.limit] === 0 && { color: "#FBBF24" }]}
                      numberOfLines={1}
                    >
                      {remaining[item.limit] === 0
                        ? "limite atingido"
                        : `restam ${remaining[item.limit]}${PERIOD[item.limit] ? ` ${PERIOD[item.limit]}` : ""}`}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* RANKING */}

          <Text
            style={[
              styles.rankingTitle,
              {
                fontSize: s(12),
                marginBottom: s(3),
              },
            ]}
          >
            Ranking entre amigos
          </Text>

          <TouchableOpacity
            onPress={() => router.push(best ? "/ranking" : "/groups")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              best
                ? `Você está em ${best.row!.position}º lugar no grupo ${best.group.name}. Ver ranking`
                : "Criar um grupo com amigos"
            }
            style={[
              styles.rankingCard,
              {
                minHeight: s(60),
                borderRadius: s(7),
                paddingHorizontal: s(12),
                paddingVertical: s(8),
              },
            ]}
          >
            <Text
              style={[
                styles.rankingPosition,
                {
                  fontSize: s(28),
                  marginRight: s(10),
                },
              ]}
            >
              {best ? `${best.row!.position}º` : <Ionicons name="people" />}
            </Text>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.rankingXp,
                  {
                    fontSize: s(best ? 13 : 11),
                  },
                ]}
                numberOfLines={1}
              >
                {best ? `${best.row!.points} pts em ${best.group.name}` : "Crie um grupo com amigos"}
              </Text>

              <Text style={[styles.demoLabelLight, { fontSize: s(6) }]}>
                {best ? "sua melhor colocação" : "e disputem tarefas juntos"}
              </Text>
            </View>

            <Text style={[styles.rankingLink, { fontSize: s(9) }]}>Ver ›</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#45247D",
  },

  background: {
    flex: 1,
  },

  scroll: {
    paddingBottom: 110,
  },

  avatarFace: {
    textAlign: "center",
  },

  /* WELCOME */

  welcomeCard: {
    backgroundColor: "#25193A",
    position: "relative",
  },

  welcomeTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  welcomeAvatar: {
    backgroundColor: "#6D6DD5",
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#AAA2FF",
  },

  welcomeTexts: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  welcomeText: {
    color: "#FFFFFF",
    fontWeight: "500",
    flexShrink: 1,
  },

  welcomeSubtitle: {
    color: "#BDB1CE",
  },

  levelBadge: {
    backgroundColor: "#9234D7",
    flexShrink: 0,
  },

  levelBadgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  xpBarBackground: {
    backgroundColor: "#57356F",
    overflow: "hidden",
  },

  xpBar: {
    height: "100%",
    backgroundColor: "#B832E5",
  },

  xpNext: {
    color: "#FFFFFF",
  },

  xpFloating: {
    position: "absolute",
    color: "#36D35B",
    fontWeight: "bold",
  },

  /* TAREFAS */

  tasksCard: {
    backgroundColor: "#25193A",
  },

  brandBar: {
    flexDirection: "row",
    alignItems: "center",
  },

  premiumBanner: {
    backgroundColor: "#25193A",
    borderWidth: 1.5,
    borderColor: "#FBBF24",
  },

  premiumTitle: {
    color: "#FBBF24",
    fontWeight: "700",
  },

  premiumText: {
    color: "#E9D5FF",
  },

  premiumTag: {
    color: "#FBBF24",
    fontWeight: "700",
  },

  quotaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  quotaChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    backgroundColor: "rgba(251,191,36,0.15)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.6)",
  },

  quotaChipOut: {
    backgroundColor: "#FBBF24",
  },

  quotaNumber: {
    color: "#FBBF24",
    fontWeight: "800",
  },

  quotaLabel: {
    color: "#F5E9FF",
  },

  quotaLine: {
    color: "#C7BADB",
    marginTop: 1,
  },

  cycleTabs: {
    flexDirection: "row",
    backgroundColor: "#1A1129",
  },

  cycleTab: {
    flex: 1,
    alignItems: "center",
  },

  cycleTabActive: {
    backgroundColor: "#7C3AED",
  },

  cycleTabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  miniStats: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  miniStat: {
    color: "#E9D5FF",
  },

  tasksTitle: {
    color: "#FFFFFF",
  },

  taskRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkbox: {
    borderColor: "#E5E0EC",
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxDone: {
    backgroundColor: "#7C3AED",
    borderColor: "#A78BFA",
  },

  check: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  taskText: {
    color: "#FFFFFF",
    flex: 1,
    minWidth: 0,
  },

  taskTextDone: {
    textDecorationLine: "line-through",
    color: "#9E94AB",
  },

  taskXp: {
    backgroundColor: "#15A638",
    flexShrink: 0,
  },

  taskXpText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  /* ESTATÍSTICAS */

  statsRow: {
    flexDirection: "row",
  },

  streakCard: {
    flex: 1,
    backgroundColor: "#FFB900",
  },

  streakTitle: {
    color: "#FF5B22",
  },

  streakContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  fire: {},

  streakNumber: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  weekCard: {
    flex: 1,
    backgroundColor: "#25193A",
    justifyContent: "center",
    alignItems: "center",
  },

  weekTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },

  weekXp: {
    color: "#B83CE5",
    fontWeight: "500",
  },

  achievementBanner: {
    backgroundColor: "#5B21B6",
    borderWidth: 1,
    borderColor: "#A78BFA",
  },

  achievementBannerText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },

  demoLabel: {
    color: "#7A2E00",
    opacity: 0.8,
  },

  demoLabelLight: {
    color: "#C7BADB",
    opacity: 0.8,
  },

  /* ATALHOS */

  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  shortcutCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#25193A",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5B21B6",
  },

  shortcutText: {
    color: "#FFFFFF",
    fontWeight: "500",
    flexShrink: 1,
  },

  /* RANKING */

  rankingTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },

  rankingCard: {
    backgroundColor: "#25193A",
    flexDirection: "row",
    alignItems: "center",
  },

  rankingPosition: {
    color: "#B83CE5",
    fontWeight: "600",
  },

  rankingLink: {
    color: "#C7BADB",
    fontWeight: "600",
  },

  /* CICLOS */

  tasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  manageLink: {
    color: "#C7BADB",
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  cycleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  cycleBarBackground: {
    flex: 1,
    backgroundColor: "#57356F",
    overflow: "hidden",
  },

  cycleBar: {
    height: "100%",
    backgroundColor: "#B832E5",
  },

  cycleText: {
    color: "#C7BADB",
  },

  cycleHint: {
    color: "#9E94AB",
  },

  cycleBanner: {
    backgroundColor: "#15803D",
    borderWidth: 1,
    borderColor: "#36D35B",
  },

  focusBanner: {
    backgroundColor: "#25193A",
    borderWidth: 1,
    borderColor: "#B832E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  focusBannerText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },

  focusBannerTime: {
    color: "#B83CE5",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  rankingXp: {
    color: "#D4B7E8",
  },

  /* LEMBRETES */

  bellButton: {
    borderWidth: 1,
    borderColor: "#57356F",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  bellButtonOn: {
    backgroundColor: "#5B21B6",
    borderColor: "#A78BFA",
  },

  reminderTip: {
    backgroundColor: "#25193A",
    borderWidth: 1,
    borderColor: "#B832E5",
  },

  reminderTipTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  reminderTipTitle: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  reminderTipText: {
    color: "#C7BADB",
  },

  reminderTipActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  reminderTipButton: {
    backgroundColor: "#7C3AED",
  },

  reminderTipButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  reminderTipError: {
    color: "#FCA5A5",
  },
});