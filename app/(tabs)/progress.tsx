import { Ionicons } from "@expo/vector-icons";
import React, { useContext } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { isChallengeCompletion, xpForLevel } from "@/constants/gamification";
import { FocusContext } from "@/context/FocusContext";
import { CYCLE_LABEL, RoutineContext } from "@/context/RoutineContext";
import { XP_PER_LEVEL, XPContext } from "@/context/XPContext";

// Só as mais recentes aqui; a lista completa fica em Histórico de XP
const HISTORY_LIMIT = 5;

function formatWhen(at: number) {
  const date = new Date(at);
  const today = new Date();
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === today.toDateString()
    ? `Hoje, ${time}`
    : `${date.toLocaleDateString("pt-BR")}, ${time}`;
}

export default function Progress() {
  const xpContext = useContext(XPContext);
  const routine = useContext(RoutineContext);
  const focus = useContext(FocusContext);
  if (!xpContext || !routine || !focus) throw new Error("Contexto não encontrado");

  const {
    xp,
    level,
    xpInLevel,
    progress,
    completedCount,
    streakDays,
    weeklyXp,
    history,
  } = xpContext;

  const cycles = (["daily", "weekly", "monthly"] as const).map((f) => ({
    frequency: f,
    ...routine.cycleStatus(f),
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6B4A91", "#43247D"]}
        style={styles.background}
      >
        {/* Cabeçalho fixo */}
        <View style={styles.fixedHeader}>
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

          <Text style={styles.title}>Meu progresso</Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>

          <View style={styles.levelCard}>
            <Text style={styles.level}>Nível {level}</Text>

            <Text style={styles.xp}>
              {xpInLevel} / {XP_PER_LEVEL} XP neste nível · total{" "}
              {xp.toLocaleString("pt-BR")} XP
            </Text>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progress,
                  { width: `${progress}%` },
                ]}
              />
            </View>
          </View>

          {/* CAMINHO DE NÍVEIS */}
          <View style={styles.roadmap}>
            {[level, level + 1, level + 2, level + 3].map((n) => {
              const reached = n <= level;
              const missing = xpForLevel(n) - xp;
              return (
                <View key={n} style={styles.roadStep}>
                  <View style={[styles.roadDot, reached && styles.roadDotReached]}>
                    <Text style={styles.roadDotText}>{n}</Text>
                  </View>
                  <Text style={styles.roadLabel}>
                    {reached ? "atual" : `faltam ${missing} XP`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* RESUMO */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}><Ionicons name="flame" color="#FB923C" /> {streakDays}</Text>
              <Text style={styles.summaryLabel}>
                {streakDays === 1 ? "dia seguido" : "dias seguidos"}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>+{weeklyXp}</Text>
              <Text style={styles.summaryLabel}>XP na semana</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}><Ionicons name="stopwatch-outline" /> {focus.sessionsToday}</Text>
              <Text style={styles.summaryLabel}>focos hoje</Text>
            </View>
          </View>

          {/* CICLOS EM ANDAMENTO */}
          <Text style={styles.sectionTitle}>
            Ciclos em andamento
          </Text>

          {cycles.map((c) => (
            <TouchableOpacity
              key={c.frequency}
              style={styles.card}
              onPress={() => router.push("/challenges")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${CYCLE_LABEL[c.frequency]}: ${c.done} de ${c.total}. Abrir desafios`}
            >
              <Text style={styles.cardTitle}>
                {CYCLE_LABEL[c.frequency]}
              </Text>

              <Text style={styles.cardDescription}>
                {c.closed
                  ? c.done >= c.total
                    ? "Ciclo completo! Bônus recebido."
                    : `Bônus recebido · ${c.done} de ${c.total} concluídas`
                  : `${c.done} de ${c.total} tarefas concluídas`}
              </Text>

              <View style={styles.smallProgressBackground}>
                <View
                  style={[
                    styles.smallProgress,
                    { width: `${c.total ? (c.done / c.total) * 100 : 0}%` },
                  ]}
                />
              </View>

              <Text style={styles.counter}>
                {c.done}/{c.total}
              </Text>
            </TouchableOpacity>
          ))}

          {/* DESAFIOS CONCLUÍDOS */}
          <Text style={styles.sectionTitle}>
            Metas concluídas
          </Text>

          <View style={styles.completedCard}>
            <Ionicons name="trophy" style={styles.completedIcon} color="#FCD34D" />

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                Desafios concluídos
              </Text>

              <Text style={styles.cardDescription}>
                {completedCount === 0
                  ? "Nenhum desafio concluído ainda."
                  : `Concluiu ${completedCount} ${
                      completedCount === 1 ? "desafio" : "desafios"
                    }!`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/challenges")}
              accessibilityRole="button"
            >
              <Text style={styles.linkButtonText}>Ver desafios</Text>
            </TouchableOpacity>
          </View>

          {/* HISTÓRICO */}
          <Text style={styles.sectionTitle}>
            Histórico
          </Text>

          {history.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardDescription}>
                Suas conclusões aparecem aqui: tarefas, exercícios, ciclos de foco
                e bônus de ciclo.
              </Text>
            </View>
          ) : (
            <View style={styles.card}>
              {history.slice(0, HISTORY_LIMIT).map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.historyRow, index > 0 && styles.historyDivider]}
                >
                  <Ionicons
                    name={
                      isChallengeCompletion(item.id)
                        ? "checkmark-circle"
                        : item.id.startsWith("focus-")
                          ? "stopwatch-outline"
                          : "sparkles-outline"
                    }
                    style={styles.historyIcon}
                    color="#DDD6FE"
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {item.title ?? "Desafio"}
                    </Text>
                    <Text style={styles.historyWhen}>{formatWhen(item.at)}</Text>
                  </View>

                  <Text style={styles.historyXp}>
                    {item.xp > 0 ? `+${item.xp} XP` : "—"}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => router.push("/xp-history")}
                accessibilityRole="button"
                style={styles.historyLink}
              >
                <Text style={styles.historyMore}>
                  Ver histórico completo de XP ({history.length}) ›
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  background: {
    flex: 1,
  },

  fixedHeader: { paddingHorizontal: 15, paddingTop: 15 },

  content: {
    paddingHorizontal: 15,
    paddingTop: 4,
    paddingBottom: 110,
  },

  back: {
    color: "#FFF",
    fontSize: 25,
  },

  title: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 18,
    marginBottom: 15,
  },

  levelCard: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },

  level: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

  xp: {
    color: "#D8C5E7",
    fontSize: 12,
    marginTop: 5,
  },

  progressBackground: {
    height: 10,
    backgroundColor: "#57356F",
    borderRadius: 10,
    marginTop: 10,
    overflow: "hidden",
  },

  progress: {
    height: "100%",
    backgroundColor: "#B832E5",
  },

  sectionTitle: {
    color: "#FFF",
    fontSize: 14,
    marginBottom: 7,
    marginTop: 5,
  },

  demoLabel: {
    color: "#C7BADB",
    fontSize: 12,
    marginBottom: 7,
  },

  card: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  cardTitle: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },

  cardDescription: {
    color: "#BDB1CE",
    fontSize: 12,
    marginTop: 4,
  },

  smallProgressBackground: {
    height: 7,
    backgroundColor: "#57356F",
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },

  smallProgress: {
    height: "100%",
    backgroundColor: "#7C3AED",
  },

  counter: {
    color: "#DDD6FE",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },

  completedCard: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  roadmap: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#25193A",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
  },

  roadStep: {
    flex: 1,
    alignItems: "center",
  },

  roadDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },

  roadDotReached: {
    backgroundColor: "#B832E5",
    borderColor: "#B832E5",
  },

  roadDotText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  roadLabel: {
    color: "#C7BADB",
    fontSize: 11,
    marginTop: 5,
    textAlign: "center",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#25193A",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },

  summaryNumber: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  summaryLabel: {
    color: "#C7BADB",
    fontSize: 12,
    marginTop: 2,
  },

  linkButton: {
    backgroundColor: "#5B21B6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
  },

  linkButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  historyDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  historyIcon: {
    color: "#A78BFA",
    fontSize: 16,
    width: 28,
    textAlign: "center",
    marginRight: 6,
  },

  historyTitle: {
    color: "#FFF",
    fontSize: 13,
  },

  historyWhen: {
    color: "#9E94AB",
    fontSize: 12,
    marginTop: 1,
  },

  historyXp: {
    color: "#36D35B",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },

  historyLink: {
    paddingVertical: 8,
  },

  historyMore: {
    color: "#9E94AB",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },

  completedIcon: {
    fontSize: 30,
    marginRight: 10,
  },
});