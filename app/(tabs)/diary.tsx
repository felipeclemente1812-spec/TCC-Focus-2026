import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenShell, ui } from "@/components/ScreenShell";
import { accentOf, DIARY_MIN_CHARS, DiaryContext, fontFamilyOf } from "@/context/DiaryContext";
import { confirmAction } from "@/utils/feedback";

// Diário: lista das anotações (telas da Angela com o visual do Focus).
// Toque na anotação para ler, no lápis para editar, na lixeira para apagar.
export default function Diary() {
  const diary = useContext(DiaryContext);
  if (!diary) return null;
  const { entries } = diary;

  const remove = async (id: string, title: string) => {
    if (await confirmAction("Apagar anotação?", `"${title || "Sem título"}" sai do seu diário.`, "Apagar")) {
      diary.removeEntry(id);
    }
  };

  return (
    <ScreenShell
      title="Meu diário"
      right={
        <TouchableOpacity onPress={() => router.push("/diary-entry")} hitSlop={10} accessibilityLabel="Nova anotação">
          <Ionicons name="add-circle-outline" size={26} color="#FFF" />
        </TouchableOpacity>
      }
    >
      {/* STATUS DA TAREFA "ESCREVER NO DIÁRIO" */}
      <View style={[ui.card, styles.status, diary.wroteToday && styles.statusDone]}>
        <Ionicons
          name={diary.wroteToday ? "checkmark-circle" : "create-outline"}
          size={24}
          color={diary.wroteToday ? "#36D35B" : "#DDD6FE"}
        />
        <View style={{ flex: 1 }}>
          <Text style={ui.cardTitle}>{diary.wroteToday ? "Você já escreveu hoje" : "Como foi o seu dia?"}</Text>
          <Text style={ui.hint}>
            {diary.wroteToday
              ? "“Escrever no diário” está concluído. Pode continuar escrevendo à vontade."
              : `Escreva ${DIARY_MIN_CHARS}+ letras hoje para concluir “Escrever no diário”.`}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={ui.primary} onPress={() => router.push("/diary-entry")} accessibilityRole="button">
        <Text style={ui.primaryText}>
          <Ionicons name="add-circle-outline" /> Nova anotação
        </Text>
      </TouchableOpacity>

      {entries.length === 0 ? (
        <View style={ui.card}>
          <Text style={ui.muted}>Seu diário está vazio. Toque em “Nova anotação” para começar.</Text>
        </View>
      ) : (
        <Text style={styles.count}>
          {entries.length} {entries.length === 1 ? "anotação" : "anotações"}
        </Text>
      )}

      {entries.map((item) => {
        const date = new Date(item.createdAt);
        const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
        const color = accentOf(item.color);
        return (
          <View key={item.id} style={[ui.card, styles.entry, { borderLeftColor: color }]}>
            <View style={ui.rowBetween}>
              <Text style={styles.date}>
                {date.toLocaleDateString("pt-BR")} · {weekday} · {date.getHours()}h
                {date.getMinutes().toString().padStart(2, "0")}
              </Text>
              <View style={ui.row}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/diary-entry", params: { id: item.id, mode: "edit" } })}
                  hitSlop={8}
                  accessibilityLabel="Editar"
                >
                  <Ionicons name="create-outline" size={19} color="#DDD6FE" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id, item.title)} hitSlop={8} accessibilityLabel="Apagar">
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/diary-entry", params: { id: item.id, mode: "view" } })}
              accessibilityRole="button"
              accessibilityLabel={`Ler ${item.title || "anotação sem título"}`}
            >
              <Text style={[styles.title, { fontFamily: fontFamilyOf(item.font) }]} numberOfLines={2}>
                {item.title || "Sem título"}
              </Text>
              {item.content ? (
                <Text style={[styles.preview, { fontFamily: fontFamilyOf(item.font) }]} numberOfLines={2}>
                  {item.content}
                </Text>
              ) : null}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDone: { borderWidth: 1, borderColor: "#36D35B" },
  count: { color: "#C7BADB", fontSize: 12, marginBottom: 8 },
  entry: { borderLeftWidth: 4 },
  date: { color: "#9E94AB", fontSize: 11, flex: 1, textTransform: "capitalize" },
  title: { color: "#FFF", fontSize: 17, fontWeight: "600", marginTop: 6 },
  preview: { color: "#DDD6FE", fontSize: 13, marginTop: 4, lineHeight: 18 },
});
