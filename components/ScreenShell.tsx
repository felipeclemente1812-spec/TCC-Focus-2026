import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Moldura das telas secundárias novas (mesmo visual de /task e /finance):
// fundo roxo em degradê, seta de voltar e título centralizado.
export function ScreenShell({
  title,
  right,
  scrollRef,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
  children: React.ReactNode;
}) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/challenges"));
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={{ flex: 1 }}>
        <ScrollView keyboardDismissMode="on-drag" ref={scrollRef} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
          <View style={ui.header}>
            <TouchableOpacity onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            {/* Título longo um pouco menor para caber em 2 linhas no celular pequeno */}
            <Text style={[ui.title, title.length > 24 && { fontSize: 17 }]} numberOfLines={2}>
              {title}
            </Text>
            <View style={{ minWidth: 24, alignItems: "flex-end" }}>{right}</View>
          </View>
          {children}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

// Ícone + título de card, no lugar dos emojis
export function CardTitle({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 }}>
      <Ionicons name={icon} size={17} color="#DDD6FE" />
      <Text style={ui.cardTitle}>{children}</Text>
    </View>
  );
}

export const maskTime = (t: string) => {
  const digits = t.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

// dd/mm/aa -> "AAAA-MM-DD" (ou null)
export const maskDate = (t: string) => {
  const d = t.replace(/\D/g, "").slice(0, 6);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
};
export const parseDate = (t: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(t);
  if (!m) return null;
  const [, dd, mm, yy] = m;
  const date = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd));
  if (date.getDate() !== Number(dd) || date.getMonth() !== Number(mm) - 1) return null;
  return `20${yy}-${mm}-${dd}`;
};
export const formatDay = (day: string) => {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

export const ui = StyleSheet.create({
  content: { padding: 15, paddingBottom: 110 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600", flex: 1, textAlign: "center" },

  card: { backgroundColor: "#25193A", borderRadius: 10, padding: 12, marginBottom: 12 },
  cardTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  subTitle: { color: "#FFF", fontSize: 13, fontWeight: "600", marginTop: 14, marginBottom: 4 },
  meta: { color: "#C7BADB", fontSize: 12 },
  desc: { color: "#DDD6FE", fontSize: 13, marginTop: 6 },
  hint: { color: "#C7BADB", fontSize: 12, marginTop: 6, lineHeight: 17 },
  muted: { color: "#C7BADB", fontSize: 13, textAlign: "center" },
  warn: { color: "#FCD34D", fontSize: 12, marginTop: 8 },
  error: { color: "#FCA5A5", fontSize: 13, marginTop: 8 },
  ok: { color: "#86EFAC", fontSize: 13, marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },

  toggle: { borderRadius: 14, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 12, paddingVertical: 5 },
  toggleOn: { backgroundColor: "#15A638", borderColor: "#36D35B" },
  toggleText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 12, paddingVertical: 6 },
  chipSmall: { borderRadius: 12, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 8, paddingVertical: 5 },
  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },
  chipText: { color: "#FFF", fontSize: 13 },
  wordChip: {
    color: "#FFF",
    backgroundColor: "#5B21B6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    overflow: "hidden",
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#FFF",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    marginTop: 8,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  timeInput: {
    width: 72,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    color: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: "center",
  },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
    minHeight: 46,
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  smallButton: {
    alignSelf: "flex-start",
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 8,
  },
  smallButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline" },

  bar: { height: 8, backgroundColor: "#57356F", borderRadius: 8, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#B832E5" },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingVertical: 9,
  },
  listText: { color: "#FFF", fontSize: 14, flex: 1 },
  listSub: { color: "#9E94AB", fontSize: 11, marginTop: 2 },
  doneBadge: {
    alignSelf: "flex-start",
    color: "#FFF",
    backgroundColor: "#15A638",
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 8,
    overflow: "hidden",
  },
});
