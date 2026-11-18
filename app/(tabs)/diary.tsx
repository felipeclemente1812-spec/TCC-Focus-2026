import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContext } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DIARY_MIN_CHARS, DiaryContext, DiaryEntry, fontFamilyOf, themeOf } from "@/context/DiaryContext";
import { confirmAction } from "@/utils/feedback";

const pad = (n: number) => n.toString().padStart(2, "0");
const monthTitle = (d: Date) => d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(" de ", " ").toUpperCase();

// Diário (Figma do Lucas): papel colorido, e o fundo da tela segue a cor da
// anotação mais recente. Toque no cartão para ler; lápis edita; lixeira apaga.
export default function Diary() {
  const diary = useContext(DiaryContext);
  if (!diary) return null;
  const { entries } = diary;
  const theme = themeOf(entries[0]?.color);

  const remove = async (id: string, title: string) => {
    if (await confirmAction("Apagar anotação?", `"${title || "Sem título"}" sai do seu diário.`, "Apagar")) {
      diary.removeEntry(id);
    }
  };

  // Agrupa por mês ("NOVEMBRO 2026")
  const months: { title: string; items: DiaryEntry[] }[] = [];
  for (const e of entries) {
    const title = monthTitle(new Date(e.createdAt));
    const last = months[months.length - 1];
    if (last?.title === title) last.items.push(e);
    else months.push({ title, items: [e] });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/challenges"))}
          hitSlop={10}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu diário</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hero}>Seu espaço para escrever.</Text>
        <Text style={styles.heroSub}>Guarde ideias, sentimentos e pequenas conquistas.</Text>

        {/* Ligação com a tarefa "Escrever no diário" */}
        <View style={styles.status}>
          <Ionicons name={diary.wroteToday ? "checkmark-circle" : "create-outline"} size={16} color={diary.wroteToday ? "#86EFAC" : "#FFF"} />
          <Text style={styles.statusText}>
            {diary.wroteToday
              ? "“Escrever no diário” concluído hoje."
              : `Escreva ${DIARY_MIN_CHARS}+ letras hoje para concluir “Escrever no diário”.`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: theme.paper }]}
          onPress={() => router.push("/diary-entry")}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color="#3A2E1F" />
          <Text style={styles.newButtonText}>Nova anotação</Text>
        </TouchableOpacity>

        {entries.length === 0 ? <Text style={styles.empty}>Seu diário está vazio. Toque em “Nova anotação” para começar.</Text> : null}

        {months.map((m) => (
          <View key={m.title}>
            <Text style={styles.month}>{m.title}</Text>
            {m.items.map((item) => {
              const date = new Date(item.createdAt);
              const paper = themeOf(item.color).paper;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, { backgroundColor: paper }]}
                  onPress={() => router.push({ pathname: "/diary-entry", params: { id: item.id, mode: "view" } })}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Ler ${item.title || "anotação sem título"}`}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardTitle, { fontFamily: fontFamilyOf(item.font) }]} numberOfLines={2}>
                      {item.title || "Sem título"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: "/diary-entry", params: { id: item.id, mode: "edit" } })}
                      hitSlop={8}
                      accessibilityLabel="Editar"
                    >
                      <Ionicons name="create-outline" size={18} color="#5B4A36" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item.id, item.title)} hitSlop={8} accessibilityLabel="Apagar">
                      <Ionicons name="trash-outline" size={17} color="#B42318" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardDate}>
                    {pad(date.getDate())}/{pad(date.getMonth() + 1)}/{date.getFullYear()} · {pad(date.getHours())}:{pad(date.getMinutes())}
                  </Text>
                  {item.content ? (
                    <Text style={[styles.cardPreview, { fontFamily: fontFamilyOf(item.font) }]} numberOfLines={2}>
                      {item.content}
                    </Text>
                  ) : null}
                  <Text style={styles.cardLink}>
                    Abrir anotação <Ionicons name="book-outline" />
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 120 },
  hero: { color: "#FFF", fontSize: 22, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusText: { color: "#FFF", fontSize: 12, flex: 1 },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    marginTop: 14,
  },
  newButtonText: { color: "#3A2E1F", fontSize: 14, fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 18 },
  month: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  card: { borderRadius: 10, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardTitle: { color: "#2B2116", fontSize: 16, fontWeight: "700", flex: 1 },
  cardDate: { color: "#6B5B45", fontSize: 11, marginTop: 4 },
  cardPreview: { color: "#3A2E1F", fontSize: 13, lineHeight: 19, marginTop: 8 },
  cardLink: { color: "#5B4A36", fontSize: 12, fontWeight: "600", marginTop: 10 },
});
