import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { dayKey, monthKey } from "@/constants/gamification";
import { BooksContext } from "@/context/BooksContext";
import { DiaryContext } from "@/context/DiaryContext";
import { FinanceContext } from "@/context/FinanceContext";
import { GroupsContext } from "@/context/GroupsContext";
import { HabitsContext } from "@/context/HabitsContext";
import { PlannerContext } from "@/context/PlannerContext";
import { FREE_LIMITS, LimitKey, PremiumContext } from "@/context/PremiumContext";
import { RoutineContext } from "@/context/RoutineContext";
import { TaskExtrasContext } from "@/context/TaskExtrasContext";
import { XPContext } from "@/context/XPContext";

export const usePremium = () => useContext(PremiumContext)?.isPremium ?? false;

export const openPremium = () => router.push("/premium");

// Título do ciclo de foco profundo no histórico de XP (FocusContext)
export const DEEP_FOCUS_TITLE = "Ciclo de foco (50 min)";

// Quanto de cada cota do plano grátis já foi usado
export function useUsage(): Record<LimitKey, number> {
  const xp = useContext(XPContext);
  const routine = useContext(RoutineContext);
  const habits = useContext(HabitsContext);
  const diary = useContext(DiaryContext);
  const books = useContext(BooksContext);
  const planner = useContext(PlannerContext);
  const finance = useContext(FinanceContext);
  const extras = useContext(TaskExtrasContext);
  const groups = useContext(GroupsContext);
  const month = monthKey();
  const thisMonth = (at: number) => monthKey(new Date(at)) === month;

  return {
    focoProfundoMes: (xp?.history ?? []).filter((h) => h.title === DEEP_FOCUS_TITLE && thisMonth(h.at)).length,
    semanais: (routine?.tasks ?? []).filter((t) => t.frequency === "weekly").length,
    mensais: (routine?.tasks ?? []).filter((t) => t.frequency === "monthly").length,
    habitos: habits?.habits.length ?? 0,
    diarioDia: (diary?.entries ?? []).filter((e) => dayKey(new Date(e.createdAt)) === dayKey()).length,
    livros: books?.books.length ?? 0,
    projetos: (planner?.projects ?? []).filter((p) => !p.doneAt).length,
    agendaMes: (planner?.events ?? []).filter((e) => thisMonth(e.createdAt)).length,
    lancamentosMes: (finance?.transactions ?? []).filter((t) => thisMonth(t.createdAt)).length,
    cofrinhos: finance?.goals.length ?? 0,
    lembretes: Object.values(extras?.reminders ?? {}).filter((r) => r.on).length,
    grupos: groups?.groups.length ?? 0,
  };
}

// true quando a cota acabou (sempre false no Premium)
export function useLimitReached(key: LimitKey) {
  const isPremium = usePremium();
  const used = useUsage()[key];
  return !isPremium && used >= FREE_LIMITS[key];
}

// Quando a cota renova (para dizer "restam 7 este mês")
export const PERIOD: Record<LimitKey, string> = {
  focoProfundoMes: "este mês",
  agendaMes: "este mês",
  lancamentosMes: "este mês",
  diarioDia: "hoje",
  semanais: "",
  mensais: "",
  habitos: "",
  livros: "",
  projetos: "",
  cofrinhos: "",
  lembretes: "",
  grupos: "",
};

// Quanto ainda resta de cada cota no plano grátis
export function useRemaining(): Record<LimitKey, number> {
  const used = useUsage();
  return Object.fromEntries(
    (Object.keys(FREE_LIMITS) as LimitKey[]).map((k) => [k, Math.max(0, FREE_LIMITS[k] - used[k])]),
  ) as Record<LimitKey, number>;
}

// Contador da cota com destaque no que AINDA RESTA ("Restam 7 · 3 de 10 usados").
// Some no Premium. Ao acabar a cota, vira o convite para o Premium.
export function UsageMeter({ limit, label, compact }: { limit: LimitKey; label: string; compact?: boolean }) {
  const isPremium = usePremium();
  const used = useUsage()[limit];
  if (isPremium) return null;
  const max = FREE_LIMITS[limit];
  const left = Math.max(0, max - used);
  const full = left === 0;
  const period = PERIOD[limit];
  return (
    <TouchableOpacity
      onPress={openPremium}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${label}: restam ${left} de ${max}${period ? " " + period : ""} no plano grátis. Ver o Focus Premium`}
      style={[styles.meter, compact && styles.meterCompact, full && styles.meterFull]}
    >
      <View style={styles.row}>
        {/* Quanto ainda resta, bem grande */}
        <View style={[styles.leftBox, full && styles.leftBoxFull]}>
          {full ? (
            <Ionicons name="lock-closed" size={20} color="#2B1A00" />
          ) : (
            <Text style={styles.leftNumber}>{left}</Text>
          )}
          <Text style={[styles.leftCaption, full && { color: "#2B1A00" }]}>{full ? "acabou" : left === 1 ? "resta" : "restam"}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
          <Text style={styles.count}>
            {Math.min(used, max)} de {max} usados{period ? ` ${period}` : ""} · plano grátis
          </Text>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${Math.min(100, (used / max) * 100)}%` }, full && { backgroundColor: "#FBBF24" }]} />
          </View>
        </View>
      </View>
      <Text style={styles.hint}>
        <Ionicons name="diamond" color="#FBBF24" />{" "}
        {full ? "Limite atingido · toque para liberar sem limite com o Premium" : "No Premium é sem limite · toque para conhecer"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  meter: {
    backgroundColor: "rgba(20,10,40,0.45)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    padding: 10,
    marginBottom: 12,
  },
  meterCompact: { padding: 8, marginBottom: 8 },
  meterFull: { borderColor: "#FBBF24" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  leftBox: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.15)",
    borderWidth: 1.5,
    borderColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
  },
  leftBoxFull: { backgroundColor: "#FBBF24" },
  leftNumber: { color: "#FBBF24", fontSize: 24, fontWeight: "800", lineHeight: 28 },
  leftCaption: { color: "#FBBF24", fontSize: 10, fontWeight: "700" },
  label: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  count: { color: "#DDD6FE", fontSize: 12, marginTop: 2 },
  bar: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: "#A78BFA" },
  hint: { color: "#E9D5FF", fontSize: 11, marginTop: 8 },
});
