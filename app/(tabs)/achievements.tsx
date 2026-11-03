import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { ACHIEVEMENTS, computeStats } from "@/constants/gamification";
import { HabitsContext } from "@/context/HabitsContext";
import { XPContext } from "@/context/XPContext";

type Filter = "all" | "unlocked" | "recent";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "unlocked", label: "Conquistadas" },
  { key: "recent", label: "Recentes" },
];

export default function Achievements() {
  const xpContext = useContext(XPContext);
  const habits = useContext(HabitsContext);
  const [filter, setFilter] = useState<Filter>("all");
  if (!xpContext) throw new Error("XPContext não encontrado");

  const { unlockedAt, history } = xpContext;

  // Mesmas estatísticas usadas para desbloquear (AchievementsWatcher)
  const stats = { ...computeStats(history), habitStreak: habits?.habitStreak ?? 0 };

  const achievements = ACHIEVEMENTS.map((a) => {
    const p = a.progress?.(stats);
    return {
      ...a,
      unlocked: !!unlockedAt[a.id],
      unlockedAt: unlockedAt[a.id],
      current: p ? Math.min(p.current, p.target) : null,
      target: p?.target ?? null,
    };
  });

  const unlockedList = achievements.filter((a) => a.unlocked);
  const unlockedCount = unlockedList.length;
  // Só contam as que têm critério verificável hoje
  const availableCount = achievements.filter((a) => a.check).length;

  const visible =
    filter === "unlocked"
      ? unlockedList
      : filter === "recent"
        ? [...unlockedList]
            .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
            .slice(0, 4)
        : achievements;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6B4A91", "#43247D"]}
        style={styles.background}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/challenges")
              }
            >
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>

            <Text style={styles.title}>Conquistas</Text>

            <View style={{ width: 25 }} />
          </View>

          {/* RESUMO */}
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {achievements.length > availableCount
                ? `${unlockedCount} de ${availableCount} disponíveis conquistadas · ${
                    achievements.length - availableCount
                  } indisponíveis`
                : `${unlockedCount} de ${achievements.length} conquistadas`}
            </Text>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progress,
                  { width: `${availableCount ? (unlockedCount / availableCount) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.tabs}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={filter === f.key ? styles.activeTab : styles.tab}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                aria-selected={filter === f.key}
              >
                <Text style={styles.tabText}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {visible.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Nenhuma conquista ainda. Conclua desafios para desbloquear!
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {visible.map((achievement) => (
                <View
                  key={achievement.id}
                  accessible
                  accessibilityLabel={`${achievement.title}: ${
                    achievement.unlocked ? "conquistada" : "bloqueada"
                  }. ${achievement.description}`}
                  style={[
                    styles.card,
                    !achievement.unlocked && styles.locked,
                  ]}
                >
                  <Ionicons name={achievement.icon} style={styles.icon} color="#FFF" />

                  <Text style={styles.cardTitle}>
                    {achievement.title}
                  </Text>

                  <Text style={styles.description}>
                    {achievement.description}
                  </Text>

                  {achievement.unlockedAt ? (
                    <>
                      {achievement.message ? (
                        <Text style={styles.message}>“{achievement.message}”</Text>
                      ) : null}
                      <Text style={styles.demoLabel}>
                        Conquistada em{" "}
                        {new Date(achievement.unlockedAt).toLocaleDateString("pt-BR")}
                      </Text>
                    </>
                  ) : achievement.target ? (
                    <View style={styles.cardProgress}>
                      <View style={styles.cardBar}>
                        <View
                          style={[
                            styles.cardBarFill,
                            {
                              width: `${((achievement.current ?? 0) / achievement.target) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.cardProgressText}>
                        <Ionicons name="lock-closed" size={11} /> {achievement.current}/{achievement.target}
                      </Text>
                    </View>
                  ) : achievement.pendingReason ? (
                    <Text style={styles.demoLabel}>{achievement.pendingReason}</Text>
                  ) : null}

                  {achievement.unlocked && (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" style={styles.checkText} />
                    </View>
                  )}
                </View>
              ))}
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

  content: {
    padding: 15,
    paddingBottom: 110,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  back: {
    color: "#FFF",
    fontSize: 25,
  },

  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "600",
  },

  summary: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  summaryText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },

  progressBackground: {
    height: 8,
    backgroundColor: "#57356F",
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
  },

  progress: {
    height: "100%",
    backgroundColor: "#B832E5",
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
    padding: 8,
    alignItems: "center",
  },

  tab: {
    flex: 1,
    padding: 8,
    alignItems: "center",
  },

  tabText: {
    color: "#FFF",
    fontSize: 12,
  },

  empty: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },

  emptyText: {
    color: "#C7BADB",
    fontSize: 13,
    textAlign: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    minHeight: 145,
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  locked: {
    opacity: 0.7,
  },

  icon: {
    fontSize: 35,
    marginBottom: 8,
  },

  cardTitle: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },

  description: {
    color: "#BDB1CE",
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
  },

  demoLabel: {
    color: "#A78BFA",
    fontSize: 11,
    marginTop: 6,
  },

  message: {
    color: "#E9DFFF",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
  },

  cardProgress: {
    alignSelf: "stretch",
    marginTop: 8,
  },

  cardBar: {
    height: 6,
    backgroundColor: "#57356F",
    borderRadius: 6,
    overflow: "hidden",
  },

  cardBarFill: {
    height: "100%",
    backgroundColor: "#B832E5",
  },

  cardProgressText: {
    color: "#C7BADB",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

  check: {
    position: "absolute",
    right: 7,
    top: 7,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  checkText: {
    color: "#FFF",
    fontSize: 12,
  },
});
