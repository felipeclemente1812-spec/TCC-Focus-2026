import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CATALOG,
  CATEGORIES,
  CATEGORY_BY_ID,
  CategoryId,
  DEFAULT_ROUTINE_IDS,
  Frequency,
} from "@/constants/challenges";
import { CYCLE_BONUS, XP_BY_FREQUENCY } from "@/constants/gamification";
import { MAX_TASKS, RoutineContext } from "@/context/RoutineContext";
import { displayName, UserContext } from "@/context/UserContext";

// Plano personalizado: aparece ao criar a conta (e pode ser refeito no Perfil).
// Passos: interesses -> diárias -> semanais -> mensais -> resumo.

const STEPS = ["interesses", "daily", "weekly", "monthly", "resumo"] as const;
type Step = (typeof STEPS)[number];

const STEP_TEXT: Record<Frequency, { title: string; subtitle: string }> = {
  daily: {
    title: "Hábitos diários",
    subtitle: "Pequenas ações para todo dia.",
  },
  weekly: {
    title: "Metas da semana",
    subtitle: "Coisas para fazer ao longo da semana.",
  },
  monthly: {
    title: "Desafios do mês",
    subtitle: "Objetivos maiores, que valem mais XP.",
  },
};

// Quantos já vêm marcados como sugestão em cada ciclo
const SUGGESTED: Record<Frequency, number> = { daily: 3, weekly: 2, monthly: 1 };

function suggestFor(categories: CategoryId[]) {
  const ids: string[] = [];
  (["daily", "weekly", "monthly"] as const).forEach((f) => {
    const pool = CATALOG.filter(
      (c) => c.frequency === f && categories.includes(c.category),
    );
    // Um de cada categoria escolhida, em rodízio, até o número sugerido
    const picked: string[] = [];
    let round = 0;
    while (picked.length < SUGGESTED[f] && round < 10) {
      categories.forEach((cat) => {
        const options = pool.filter((c) => c.category === cat);
        const item = options[round];
        if (item && picked.length < SUGGESTED[f]) picked.push(item.id);
      });
      round++;
    }
    ids.push(...picked);
  });
  return ids;
}

export default function Onboarding() {
  const userContext = useContext(UserContext);
  const routine = useContext(RoutineContext);

  const [step, setStep] = useState<Step>("interesses");
  const [categories, setCategories] = useState<CategoryId[]>([]);
  // Se já tem plano (refazendo pelo Perfil), começa com a rotina atual
  const [selected, setSelected] = useState<string[]>(
    routine?.planned ? routine.tasks.map((t) => t.id) : [],
  );
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");

  if (userContext?.authReady && !userContext.user.uid) {
    return <Redirect href="/login" />;
  }
  if (!routine || !userContext) return null;

  const stepIndex = STEPS.indexOf(step);
  const isFrequencyStep = step === "daily" || step === "weekly" || step === "monthly";

  const countOf = (f: Frequency) =>
    selected.filter((id) => CATALOG.find((c) => c.id === id)?.frequency === f).length;

  const toggleCategory = (id: CategoryId) => {
    setError("");
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleItem = (id: string, f: Frequency) => {
    setError("");
    if (selected.includes(id)) {
      setSelected((prev) => prev.filter((x) => x !== id));
      return;
    }
    if (countOf(f) >= MAX_TASKS[f]) {
      setError(`Máximo de ${MAX_TASKS[f]} neste ciclo. Desmarque um para trocar.`);
      return;
    }
    setSelected((prev) => [...prev, id]);
  };

  const next = () => {
    setError("");
    if (step === "interesses") {
      if (categories.length === 0) {
        setError("Escolha pelo menos uma área.");
        return;
      }
      // Pré-seleciona sugestões só na primeira vez
      if (selected.length === 0) setSelected(suggestFor(categories));
    }
    if (isFrequencyStep && countOf(step) === 0) {
      setError("Escolha pelo menos um desafio (você pode mudar depois).");
      return;
    }
    setShowAll(false);
    setStep(STEPS[stepIndex + 1]);
  };

  const back = () => {
    setError("");
    setShowAll(false);
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
    else if (routine.planned) router.back();
  };

  const finish = () => {
    routine.applyPlan(selected);
    router.replace("/challenges");
  };

  const skip = () => {
    routine.applyPlan(routine.planned ? routine.tasks.map((t) => t.id) : DEFAULT_ROUTINE_IDS);
    router.replace("/(tabs)");
  };

  const sumXp = (f: Frequency) => countOf(f) * XP_BY_FREQUENCY[f] + CYCLE_BONUS[f];

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#5B21B6", "#1E1B4B"]} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          {/* PROGRESSO DOS PASSOS */}
          <View style={styles.stepsRow}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[styles.stepBar, i <= stepIndex && styles.stepBarActive]}
              />
            ))}
          </View>

          {step === "interesses" && (
            <>
              <Text style={styles.title}>
                Olá{userContext.user.name ? `, ${displayName(userContext.user)}` : ""}!
              </Text>
              <Text style={styles.subtitle}>
                Vamos montar seu plano. Em quais áreas você quer evoluir?
              </Text>

              <View style={styles.grid}>
                {CATEGORIES.map((c) => {
                  const active = categories.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.areaCard, active && styles.areaCardActive]}
                      onPress={() => toggleCategory(c.id)}
                      accessibilityRole="checkbox"
                      aria-checked={active}
                    >
                      <Ionicons name={c.icon} style={styles.areaIcon} color="#FFF" />
                      <Text style={styles.areaLabel}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {isFrequencyStep && (
            <>
              <Text style={styles.title}>{STEP_TEXT[step].title}</Text>
              <Text style={styles.subtitle}>
                {STEP_TEXT[step].subtitle} Cada um vale +{XP_BY_FREQUENCY[step]} XP.
              </Text>
              <Text style={styles.counter}>
                {countOf(step)} de {MAX_TASKS[step]} escolhidos
              </Text>

              {CATALOG.filter(
                (c) =>
                  c.frequency === step &&
                  (showAll || categories.length === 0 || categories.includes(c.category)),
              ).map((c) => {
                const active = selected.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.item, active && styles.itemActive]}
                    onPress={() => toggleItem(c.id, step)}
                    accessibilityRole="checkbox"
                    aria-checked={active}
                    accessibilityLabel={c.title}
                  >
                    <Ionicons name={CATEGORY_BY_ID[c.category].icon} style={styles.itemIcon} color="#FFF" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{c.title}</Text>
                      <Text style={styles.itemDescription}>{c.description}</Text>
                    </View>
                    <View style={[styles.check, active && styles.checkActive]}>
                      {active ? <Ionicons name="checkmark" style={styles.checkText} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity onPress={() => setShowAll((v) => !v)} style={styles.linkButton}>
                <Text style={styles.link}>
                  {showAll ? "Mostrar só as áreas escolhidas" : "Ver desafios de todas as áreas"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === "resumo" && (
            <>
              <Text style={styles.title}>Seu plano está pronto!</Text>
              <Text style={styles.subtitle}>
                Complete os desafios para ganhar XP. Fechar um ciclo inteiro dá bônus.
              </Text>

              {(["daily", "weekly", "monthly"] as const).map((f) => (
                <View key={f} style={styles.summaryCard}>
                  <View style={styles.summaryTop}>
                    <Text style={styles.summaryTitle}>{STEP_TEXT[f].title}</Text>
                    <Text style={styles.summaryXp}>até +{sumXp(f)} XP</Text>
                  </View>
                  {selected
                    .map((id) => CATALOG.find((c) => c.id === id))
                    .filter((c) => c?.frequency === f)
                    .map((c) => (
                      <Text key={c!.id} style={styles.summaryItem}>
                        <Ionicons name={CATEGORY_BY_ID[c!.category].icon} /> {c!.title}
                      </Text>
                    ))}
                </View>
              ))}

              <Text style={styles.note}>
                Você pode trocar os desafios quando quiser em Desafios › Minha rotina.
              </Text>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* NAVEGAÇÃO */}
          <TouchableOpacity
            style={styles.primary}
            onPress={step === "resumo" ? finish : next}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>
              {step === "resumo" ? "Começar meu plano" : "Continuar"}
            </Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            {stepIndex > 0 || routine.planned ? (
              <TouchableOpacity onPress={back} style={styles.linkButton}>
                <Text style={styles.link}>‹ Voltar</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity onPress={skip} style={styles.linkButton}>
              <Text style={styles.link}>
                {routine.planned ? "Manter plano atual" : "Pular e usar plano sugerido"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#5B21B6" },
  flex: { flex: 1 },

  content: { padding: 20, paddingBottom: 40 },

  stepsRow: { flexDirection: "row", gap: 6, marginBottom: 22 },

  stepBar: {
    flex: 1,
    height: 5,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  stepBarActive: { backgroundColor: "#A78BFA" },

  title: { color: "#FFF", fontSize: 24, fontWeight: "700", marginBottom: 6 },

  subtitle: { color: "#CFC4E8", fontSize: 14, lineHeight: 20, marginBottom: 16 },

  counter: { color: "#DDD6FE", fontSize: 13, fontWeight: "600", marginBottom: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  areaCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  areaCardActive: { backgroundColor: "#7C3AED", borderColor: "#C4B5FD" },

  areaIcon: { fontSize: 20 },

  areaLabel: { color: "#FFF", fontSize: 13, fontWeight: "600", flexShrink: 1 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },

  itemActive: { borderColor: "#C4B5FD", backgroundColor: "rgba(124,58,237,0.35)" },

  itemIcon: { fontSize: 20 },

  itemTitle: { color: "#FFF", fontSize: 14, fontWeight: "600" },

  itemDescription: { color: "#CFC4E8", fontSize: 12, marginTop: 2 },

  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#C4B5FD",
    alignItems: "center",
    justifyContent: "center",
  },

  checkActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },

  checkText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  summaryTitle: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  summaryXp: { color: "#86EFAC", fontSize: 13, fontWeight: "700" },

  summaryItem: { color: "#E9DFFF", fontSize: 13, marginTop: 4 },

  note: { color: "#CFC4E8", fontSize: 12, textAlign: "center", marginTop: 6 },

  error: { color: "#FCA5A5", fontSize: 13, textAlign: "center", marginTop: 12 },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 18,
    minHeight: 50,
  },

  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  linkButton: { paddingVertical: 10 },

  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline" },
});
