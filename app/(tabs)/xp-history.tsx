import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useContext, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  XP_CATEGORY_INFO,
  XpCategory,
  xpCategory,
} from "@/constants/gamification";
import { XPContext } from "@/context/XPContext";

const PAGE = 30;

function formatWhen(at: number) {
  const date = new Date(at);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) return `Hoje, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Ontem, ${time}`;
  return `${date.toLocaleDateString("pt-BR")}, ${time}`;
}

// De onde veio cada ponto: lê o MESMO histórico do XPContext (sem 2ª fonte)
export default function XpHistory() {
  const xpContext = useContext(XPContext);
  const [filter, setFilter] = useState<XpCategory | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  if (!xpContext) throw new Error("XPContext não encontrado");
  const { history, xp } = xpContext;

  // Resumo por categoria (só as que têm registros)
  const totals = new Map<XpCategory, { xp: number; count: number }>();
  history.forEach((c) => {
    const cat = xpCategory(c.id);
    const t = totals.get(cat) ?? { xp: 0, count: 0 };
    totals.set(cat, { xp: t.xp + c.xp, count: t.count + 1 });
  });
  const summary = [...totals.entries()].sort((a, b) => b[1].xp - a[1].xp);

  const list = filter === "all" ? history : history.filter((c) => xpCategory(c.id) === filter);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <View style={styles.fixedHeader}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>
            <Text style={styles.title}>Histórico de XP</Text>
            <View style={{ width: 25 }} />
          </View>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>XP total</Text>
            <Text style={styles.totalValue}>{xp.toLocaleString("pt-BR")} XP</Text>
            <Text style={styles.totalHint}>
              {history.length} {history.length === 1 ? "registro" : "registros"} · cada
              atividade conta uma vez por período
            </Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Você ainda não ganhou XP. Conclua um desafio, um hábito ou um foco
                e ele aparece aqui.
              </Text>
            </View>
          ) : (
            <>
              {/* RESUMO POR CATEGORIA (tocar filtra) */}
              <Text style={styles.sectionTitle}>De onde vem seu XP</Text>
              <View style={styles.summaryGrid}>
                {summary.map(([cat, t]) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.summaryCard, filter === cat && styles.summaryCardActive]}
                    onPress={() => {
                      setFilter(filter === cat ? "all" : cat);
                      setLimit(PAGE);
                    }}
                    accessibilityRole="button"
                    aria-selected={filter === cat}
                    accessibilityLabel={`${XP_CATEGORY_INFO[cat].label}: ${t.xp} XP. Filtrar`}
                  >
                    <Ionicons name={XP_CATEGORY_INFO[cat].icon} style={styles.summaryIcon} color="#DDD6FE" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryLabel} numberOfLines={1}>
                        {XP_CATEGORY_INFO[cat].label}
                      </Text>
                      <Text style={styles.summaryValue}>
                        +{t.xp} XP · {t.count}x
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* LISTA */}
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>
                  {filter === "all" ? "Todas as atividades" : XP_CATEGORY_INFO[filter].label}
                </Text>
                {filter !== "all" ? (
                  <TouchableOpacity onPress={() => setFilter("all")} hitSlop={8}>
                    <Text style={styles.link}>Ver todas</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.card}>
                {list.slice(0, limit).map((item, index) => {
                  const cat = xpCategory(item.id);
                  const isBonus = cat === "pontualidade" || cat === "ciclo";
                  return (
                    <View
                      key={item.id}
                      style={[styles.row, index > 0 && styles.divider, isBonus && styles.rowBonus]}
                    >
                      <Ionicons name={XP_CATEGORY_INFO[cat].icon} style={styles.rowIcon} color="#DDD6FE" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {isBonus ? "Bônus · " : ""}
                          {item.title ?? XP_CATEGORY_INFO[cat].label}
                        </Text>
                        <Text style={styles.rowMeta}>
                          {XP_CATEGORY_INFO[cat].label} · {formatWhen(item.at)}
                        </Text>
                      </View>
                      <Text style={[styles.rowXp, item.xp === 0 && styles.rowXpZero]}>
                        {item.xp > 0 ? `+${item.xp}` : "0"} XP
                      </Text>
                    </View>
                  );
                })}
              </View>

              {list.length > limit ? (
                <TouchableOpacity
                  style={styles.more}
                  onPress={() => setLimit((l) => l + PAGE)}
                  accessibilityRole="button"
                >
                  <Text style={styles.moreText}>
                    Mostrar mais ({list.length - limit} restantes)
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.note}>
                O bônus de pontualidade vale quando você marca a atividade dentro do
                horário planejado (informado por você, não verificado por sensores).
              </Text>
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
  // Cabeçalho fixo: fica parado no topo enquanto o conteúdo rola
  fixedHeader: { paddingHorizontal: 15, paddingTop: 15 },
  content: { paddingHorizontal: 15, paddingTop: 4, paddingBottom: 110 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  back: { color: "#FFF", fontSize: 25 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  totalCard: {
    backgroundColor: "#25193A",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: { color: "#C7BADB", fontSize: 13 },
  totalValue: { color: "#B83CE5", fontSize: 28, fontWeight: "800", marginTop: 2 },
  totalHint: { color: "#9E94AB", fontSize: 12, marginTop: 4, textAlign: "center" },

  empty: { backgroundColor: "#25193A", borderRadius: 10, padding: 18 },
  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center", lineHeight: 19 },

  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 8 },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  summaryCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#25193A",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  summaryCardActive: { borderColor: "#A78BFA", backgroundColor: "#3B2A5A" },
  summaryIcon: { fontSize: 20 },
  summaryLabel: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  summaryValue: { color: "#86EFAC", fontSize: 12, marginTop: 1 },

  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline", marginBottom: 8 },

  card: { backgroundColor: "#25193A", borderRadius: 10, paddingHorizontal: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowBonus: { opacity: 0.9 },
  divider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  rowIcon: { fontSize: 18, width: 30, textAlign: "center", marginRight: 6 },
  rowTitle: { color: "#FFF", fontSize: 13 },
  rowMeta: { color: "#9E94AB", fontSize: 12, marginTop: 2 },
  rowXp: { color: "#36D35B", fontSize: 13, fontWeight: "700", marginLeft: 8 },
  rowXpZero: { color: "#9E94AB" },

  more: {
    borderWidth: 1,
    borderColor: "#5B21B6",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 10,
  },
  moreText: { color: "#DDD6FE", fontSize: 13, fontWeight: "600" },

  note: { color: "#C7BADB", fontSize: 11, textAlign: "center", marginTop: 12, lineHeight: 16 },
});
