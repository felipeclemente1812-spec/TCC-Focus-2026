import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CATALOG,
  CATEGORIES,
  CATEGORY_BY_ID,
  CatalogChallenge,
  CategoryId,
  Frequency,
  FREQUENCY_LABEL,
  normalize,
} from "@/constants/challenges";
import { XP_BY_FREQUENCY } from "@/constants/gamification";
import { MAX_TASKS, RoutineContext } from "@/context/RoutineContext";

type FrequencyFilter = "all" | Frequency;

const FREQUENCY_FILTERS: { key: FrequencyFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "daily", label: "Diários" },
  { key: "weekly", label: "Semanais" },
  { key: "monthly", label: "Mensais" },
];

export default function Catalog() {
  const routine = useContext(RoutineContext);
  const params = useLocalSearchParams<{ frequency?: string }>();

  const [search, setSearch] = useState("");
  const [frequency, setFrequency] = useState<FrequencyFilter>("all");
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  // A rotina abre o catálogo já filtrado no ciclo que você está vendo
  useEffect(() => {
    if (
      params.frequency === "daily" ||
      params.frequency === "weekly" ||
      params.frequency === "monthly"
    ) {
      setFrequency(params.frequency);
    }
  }, [params.frequency]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!routine) throw new Error("RoutineContext não encontrado");

  const { tasks, isSelected, addFromCatalog, removeTask } = routine;

  const term = normalize(search);
  const results = CATALOG.filter(
    (c) =>
      (frequency === "all" || c.frequency === frequency) &&
      (!category || c.category === category) &&
      (!term ||
        normalize(c.title).includes(term) ||
        normalize(c.description).includes(term) ||
        normalize(CATEGORY_BY_ID[c.category].label).includes(term)),
  );

  const countIn = (f: Frequency) => tasks.filter((t) => t.frequency === f).length;

  const toggle = (item: CatalogChallenge) => {
    if (isSelected(item.id)) {
      removeTask(item.id);
      setFeedback({ text: `"${item.title}" saiu da rotina.`, error: false });
      return;
    }
    const error = addFromCatalog(item.id);
    setFeedback(
      error
        ? { text: error, error: true }
        : { text: `"${item.title}" entrou na sua rotina!`, error: false },
    );
  };

  const clearFilters = () => {
    setSearch("");
    setCategory(null);
    setFrequency("all");
  };

  const renderItem = ({ item }: { item: CatalogChallenge }) => {
    const selected = isSelected(item.id);
    const cat = CATEGORY_BY_ID[item.category];

    return (
      <View style={[styles.card, selected && styles.cardSelected]}>
        <View style={styles.cardIcon}>
          <Ionicons name={cat.icon} style={styles.cardIconText} color="#FFF" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>

          <View style={styles.tags}>
            <Text
              style={[
                styles.tag,
                item.frequency === "weekly" && styles.tagWeekly,
                item.frequency === "monthly" && styles.tagMonthly,
              ]}
            >
              {FREQUENCY_LABEL[item.frequency]}
            </Text>
            <Text style={styles.tagMuted}>{cat.label}</Text>
            <Text style={styles.tagXp}>+{XP_BY_FREQUENCY[item.frequency]} XP</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, selected && styles.addButtonSelected]}
          onPress={() => toggle(item)}
          accessibilityRole="button"
          aria-checked={selected}
          accessibilityLabel={
            selected ? `Remover ${item.title} da rotina` : `Adicionar ${item.title} à rotina`
          }
        >
          <Ionicons name={selected ? "checkmark" : "add"} style={styles.addButtonText} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <View style={styles.fixedHeader}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace("/routine")
                }
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
              >
                <Ionicons name="arrow-back" style={styles.back} />
              </TouchableOpacity>

              <Text style={styles.title}>Catálogo de desafios</Text>

              <View style={{ width: 25 }} />
            </View>
            {/* BUSCA */}
            <View style={styles.searchBox}>
              <Ionicons name="search" style={styles.searchIcon} color="#C7BADB" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar desafio, ex.: água, ler, treino"
                placeholderTextColor="#9E94AB"
                style={styles.searchInput}
                accessibilityLabel="Buscar desafio"
                autoCorrect={false}
              />
              {search ? (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca"
                >
                  <Ionicons name="close" style={styles.clear} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* FREQUÊNCIA */}
            <View style={styles.tabs}>
              {FREQUENCY_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={frequency === f.key ? styles.activeTab : styles.tab}
                  onPress={() => setFrequency(f.key)}
                  accessibilityRole="tab"
                  aria-selected={frequency === f.key}
                >
                  <Text style={styles.tabText}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
        </View>
        <FlatList
          keyboardDismissMode="on-drag"
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              <Text style={styles.subtitle}>
                {CATALOG.length} desafios em {CATEGORIES.length} categorias. Diário
                +{XP_BY_FREQUENCY.daily} · semanal +{XP_BY_FREQUENCY.weekly} · mensal
                +{XP_BY_FREQUENCY.monthly} XP.
              </Text>

              {/* CATEGORIAS */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                <TouchableOpacity
                  style={[styles.chip, !category && styles.chipActive]}
                  onPress={() => setCategory(null)}
                  accessibilityRole="button"
                  aria-selected={!category}
                >
                  <Text style={styles.chipText}>Todas</Text>
                </TouchableOpacity>

                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, category === c.id && styles.chipActive]}
                    onPress={() => setCategory(category === c.id ? null : c.id)}
                    accessibilityRole="button"
                    aria-selected={category === c.id}
                  >
                    <Text style={styles.chipText}>
                      <Ionicons name={c.icon} /> {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* SITUAÇÃO DA ROTINA */}
              <View style={styles.status}>
                <Text style={styles.statusText}>
                  Na rotina: {countIn("daily")}/{MAX_TASKS.daily} diários ·{" "}
                  {countIn("weekly")}/{MAX_TASKS.weekly} semanais ·{" "}
                  {countIn("monthly")}/{MAX_TASKS.monthly} mensais
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/routine")}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.statusLink}>Ver rotina</Text>
                </TouchableOpacity>
              </View>

              {feedback ? (
                <Text
                  style={[styles.feedback, feedback.error && styles.feedbackError]}
                  accessibilityLiveRegion="polite"
                >
                  {feedback.text}
                </Text>
              ) : null}

              <Text style={styles.resultsCount}>
                {results.length} {results.length === 1 ? "desafio" : "desafios"}
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Nenhum desafio encontrado com esses filtros.
              </Text>
              <TouchableOpacity onPress={clearFilters} accessibilityRole="button">
                <Text style={styles.statusLink}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },

  fixedHeader: { paddingHorizontal: 15, paddingTop: 15 },
  content: { paddingHorizontal: 15, paddingTop: 4, paddingBottom: 110 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  back: { color: "#FFF", fontSize: 25 },

  title: { color: "#FFF", fontSize: 19, fontWeight: "600" },

  subtitle: {
    color: "#C7BADB",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25193A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5B21B6",
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  searchIcon: { fontSize: 14, marginRight: 8 },

  searchInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 14,
    paddingVertical: 11,
  },

  clear: { color: "#C7BADB", fontSize: 15, paddingLeft: 8 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 4,
    marginBottom: 10,
  },

  activeTab: {
    flex: 1,
    backgroundColor: "#5B21B6",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },

  tab: { flex: 1, padding: 8, alignItems: "center" },

  tabText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  chips: { gap: 8, paddingBottom: 4, marginBottom: 10 },

  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#5B21B6",
    backgroundColor: "#25193A",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },

  chipText: { color: "#FFF", fontSize: 13 },

  status: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  statusText: { color: "#C7BADB", fontSize: 12, flex: 1 },

  statusLink: {
    color: "#DDD6FE",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  feedback: {
    color: "#86EFAC",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(54,211,91,0.12)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },

  feedbackError: {
    color: "#FCA5A5",
    backgroundColor: "rgba(248,113,113,0.12)",
  },

  resultsCount: { color: "#C7BADB", fontSize: 12, marginBottom: 8 },

  card: {
    backgroundColor: "#25193A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

  cardSelected: { borderColor: "#A78BFA" },

  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3B2A5A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  cardIconText: { fontSize: 22 },

  cardTitle: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  cardDescription: { color: "#BDB1CE", fontSize: 12, marginTop: 2, lineHeight: 17 },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },

  tag: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "#5B21B6",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },

  tagWeekly: { backgroundColor: "#1E40AF" },

  tagMonthly: { backgroundColor: "#B45309" },

  tagMuted: {
    color: "#C7BADB",
    fontSize: 11,
    paddingVertical: 2,
  },

  tagXp: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "#15A638",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },

  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#A78BFA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  addButtonSelected: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },

  addButtonText: { color: "#FFF", fontSize: 18, fontWeight: "700" },

  empty: {
    backgroundColor: "#25193A",
    borderRadius: 8,
    padding: 18,
    alignItems: "center",
    gap: 8,
  },

  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center" },
});
