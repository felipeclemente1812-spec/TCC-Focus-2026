import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import HabitsManager from "@/components/HabitsManager";
import { UsageMeter } from "@/components/PremiumGate";
import { CATEGORY_BY_ID } from "@/constants/challenges";
import { HabitsContext } from "@/context/HabitsContext";
import {
  CYCLE_BONUS,
  resetHint,
  XP_BY_FREQUENCY,
} from "@/constants/gamification";
import {
  CYCLE_LABEL,
  Frequency,
  MAX_TASKS,
  RoutineContext,
  RoutineTask,
} from "@/context/RoutineContext";
import { confirmAction } from "@/utils/feedback";

type Tab = Frequency | "habitos";

const TABS: { key: Tab; label: string }[] = [
  { key: "daily", label: "Diários" },
  { key: "weekly", label: "Semanais" },
  { key: "monthly", label: "Mensais" },
  { key: "habitos", label: "Hábitos" },
];

export default function Routine() {
  const routine = useContext(RoutineContext);
  const habits = useContext(HabitsContext);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>("daily");
  const [message, setMessage] = useState("");

  // Atalho "Criar hábito" abre direto na aba Hábitos
  useEffect(() => {
    if (params.tab === "habitos") setTab("habitos");
  }, [params.tab]);

  if (!routine) throw new Error("RoutineContext não encontrado");

  const { tasks, removeTask, isDone, cycleStatus } = routine;

  const frequency: Frequency = tab === "habitos" ? "daily" : tab;
  const list = tasks.filter((t) => t.frequency === frequency);
  const status = cycleStatus(frequency);
  const max = MAX_TASKS[frequency];
  const isFull = list.length >= max;

  const handleRemove = async (task: RoutineTask) => {
    const ok = await confirmAction(
      "Remover desafio",
      `Remover "${task.title}" da sua rotina? O XP já ganho continua com você.`,
      "Remover",
    );
    if (!ok) return;
    removeTask(task.id);
    setMessage(`"${task.title}" saiu da sua rotina.`);
  };

  const openCatalog = () => {
    router.push({ pathname: "/catalog", params: { frequency } });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/challenges")
              }
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>

            <Text style={styles.title}>Minha rotina</Text>

            <View style={{ width: 25 }} />
          </View>

          <Text style={styles.subtitle}>
            Escolha desafios do catálogo ou crie seus hábitos. Tudo reinicia
            sozinho a cada dia, semana ou mês.
          </Text>

          {/* ABAS */}
          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={tab === t.key ? styles.activeTab : styles.tab}
                onPress={() => {
                  setTab(t.key);
                  setMessage("");
                }}
                accessibilityRole="tab"
                aria-selected={tab === t.key}
              >
                <Text style={styles.tabText} numberOfLines={1}>
                  {t.label}
                </Text>
                <Text style={styles.tabCount}>
                  {t.key === "habitos"
                    ? habits?.habits.length ?? 0
                    : tasks.filter((x) => x.frequency === t.key).length}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cotas do plano grátis */}
          {tab === "weekly" ? <UsageMeter limit="semanais" label="Desafios semanais na rotina" /> : null}
          {tab === "monthly" ? <UsageMeter limit="mensais" label="Desafios mensais na rotina" /> : null}
          {tab === "habitos" ? <UsageMeter limit="habitos" label="Hábitos criados" /> : null}

          {tab === "habitos" ? (
            // Só os hábitos: as "metas próprias" saíram daqui (pedido do grupo)
            <HabitsManager />
          ) : (
          <>

          {/* RESUMO DO CICLO */}
          <View style={styles.cycleCard}>
            <View style={styles.cycleTop}>
              <Text style={styles.cycleTitle}>{CYCLE_LABEL[frequency]}</Text>
              <Text style={styles.cycleCount}>
                {status.done}/{status.total}
              </Text>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progress,
                  {
                    width: `${status.total ? (status.done / status.total) * 100 : 0}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.cycleHint}>
              {status.closed
                ? `Bônus de +${CYCLE_BONUS[frequency]} XP deste ciclo já recebido.${
                    status.done < status.total
                      ? ` Os desafios novos ainda dão +${XP_BY_FREQUENCY[frequency]} XP cada.`
                      : ""
                  }`
                : `Cada desafio vale +${XP_BY_FREQUENCY[frequency]} XP. Complete todos para ganhar +${
                    CYCLE_BONUS[frequency]
                  } XP de bônus. ${resetHint(frequency)}.`}
            </Text>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* LISTA */}
          {list.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" style={styles.emptyIcon} color="#DDD6FE" />
              <Text style={styles.emptyText}>
                Nenhum desafio{" "}
                {frequency === "daily" ? "diário" : frequency === "weekly" ? "semanal" : "mensal"}{" "}
                na sua rotina ainda.
              </Text>
            </View>
          ) : (
            list.map((task) => {
              const done = isDone(task);
              const category = CATEGORY_BY_ID[task.category];
              return (
                <View key={task.id} style={styles.taskRow}>
                  <View style={styles.taskIcon}>
                    <Ionicons name={category.icon} style={styles.taskIconText} color="#FFF" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.taskTitle, done && styles.taskTitleDone]}
                      numberOfLines={2}
                    >
                      {task.title}
                    </Text>
                    <Text style={styles.taskMeta}>
                      {category.label} · {done ? "feito" : `+${task.xp} XP`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleRemove(task)}
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${task.title}`}
                  >
                    <Ionicons name="close" style={styles.removeText} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={[styles.addButton, isFull && styles.disabled]}
            onPress={openCatalog}
            disabled={isFull}
            accessibilityRole="button"
          >
            <Text style={styles.addText}>＋ Escolher desafios no catálogo</Text>
          </TouchableOpacity>

          <Text style={styles.limit}>
            {isFull
              ? `Limite de ${max} desafios neste ciclo. Remova um para trocar.`
              : `${list.length} de ${max} desafios neste ciclo`}
          </Text>
          </>
          )}

          <Text style={styles.note}>
            Sua rotina fica salva neste aparelho. Sincronizar com a conta (em
            outros aparelhos) depende do backend.
          </Text>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },

  content: { padding: 15, paddingBottom: 110 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  back: { color: "#FFF", fontSize: 25 },

  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  subtitle: {
    color: "#C7BADB",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 19,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },

  activeTab: {
    flex: 1,
    backgroundColor: "#5B21B6",
    borderRadius: 6,
    padding: 9,
    alignItems: "center",
  },

  tab: { flex: 1, padding: 9, alignItems: "center" },

  tabText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  tabCount: { color: "#C7BADB", fontSize: 11, marginTop: 1 },

  cycleCard: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  cycleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cycleTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  cycleCount: { color: "#B83CE5", fontSize: 15, fontWeight: "700" },

  progressBackground: {
    height: 8,
    backgroundColor: "#57356F",
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },

  progress: { height: "100%", backgroundColor: "#B832E5" },

  cycleHint: { color: "#C7BADB", fontSize: 12, marginTop: 8, lineHeight: 17 },

  message: {
    color: "#86EFAC",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },

  empty: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 18,
    marginBottom: 8,
    alignItems: "center",
  },

  emptyIcon: { fontSize: 28, marginBottom: 6 },

  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center" },

  taskRow: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#3B2A5A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  taskIconText: { fontSize: 20 },

  taskTitle: { color: "#FFF", fontSize: 14 },

  taskTitleDone: { color: "#9E94AB", textDecorationLine: "line-through" },

  taskMeta: { color: "#C7BADB", fontSize: 12, marginTop: 2 },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  removeText: { color: "#f87171", fontSize: 17 },

  addButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    minHeight: 48,
  },

  disabled: { opacity: 0.45 },

  addText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  limit: { color: "#C7BADB", fontSize: 12, textAlign: "center", marginTop: 8 },

  note: {
    color: "#C7BADB",
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    opacity: 0.8,
  },
});
