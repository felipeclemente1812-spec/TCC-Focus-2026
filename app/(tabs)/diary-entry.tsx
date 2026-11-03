import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useContext, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenShell, ui } from "@/components/ScreenShell";
import {
  accentOf,
  DIARY_COLORS,
  DIARY_FONTS,
  DIARY_MIN_CHARS,
  DIARY_SIZES,
  DiaryContext,
  DiaryFont,
  fontFamilyOf,
} from "@/context/DiaryContext";

// Uma anotação do diário (telas new / edit / view da Angela numa rota só):
//   /diary-entry                     -> nova
//   /diary-entry?id=...&mode=edit    -> editar
//   /diary-entry?id=...&mode=view    -> ler
// A fonte e o tamanho da letra ficam salvos em cada anotação.
export default function DiaryEntryScreen() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const diary = useContext(DiaryContext);
  const entry = id ? diary?.getEntry(id) : undefined;
  const viewing = mode === "view" && !!entry;
  // Nova anotação começa com a fonte e o tamanho da última escrita
  const last = diary?.entries[0];

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(DIARY_COLORS[0].code);
  const [font, setFont] = useState<DiaryFont>("padrao");
  const [size, setSize] = useState(16);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  // As abas mantêm a tela montada: ao abrir (nova, editar ou ler), recomeça
  // com os dados da anotação certa
  useFocusEffect(
    useCallback(() => {
      setTitle(entry?.title ?? "");
      setContent(entry?.content ?? "");
      setColor(entry ? accentOf(entry.color) : DIARY_COLORS[0].code);
      setFont(entry?.font ?? last?.font ?? "padrao");
      setSize(entry?.size ?? last?.size ?? 16);
      setToast("");
      setError("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, mode]),
  );

  if (!diary) return null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/diary"));
  const letters = content.replace(/\s/g, "").length;
  const family = fontFamilyOf(font);
  const textStyle = { fontFamily: family, fontSize: size, lineHeight: Math.round(size * 1.5) };

  const save = () => {
    if (!title.trim() && !content.trim()) return goBack();
    const input = { title, content, color, font, size };
    const result = entry ? diary.updateEntry(entry.id, input) : diary.addEntry(input);
    if (result.error) return setError(result.error);
    setError("");
    setToast(result.counted ? "Salvo · “Escrever no diário” concluído" : "Salvo");
    setTimeout(goBack, 1200);
  };

  if (id && !entry) {
    return (
      <ScreenShell title="Diário">
        <View style={ui.card}>
          <Text style={ui.muted}>Essa anotação não existe mais.</Text>
          <TouchableOpacity onPress={() => router.replace("/diary")} style={{ marginTop: 10, alignSelf: "center" }}>
            <Text style={ui.link}>Voltar ao diário</Text>
          </TouchableOpacity>
        </View>
      </ScreenShell>
    );
  }

  // ---------- LER ----------
  if (viewing) {
    const date = new Date(entry.createdAt);
    return (
      <ScreenShell
        title="Diário"
        right={
          <TouchableOpacity onPress={() => router.setParams({ mode: "edit" })} hitSlop={10} accessibilityLabel="Editar">
            <Ionicons name="create-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      >
        <View style={[ui.card, styles.paper, { borderTopColor: accentOf(entry.color) }]}>
          <Text style={[styles.viewTitle, { fontFamily: fontFamilyOf(entry.font) }]}>{entry.title || "Sem título"}</Text>
          <Text style={styles.meta}>
            {date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            {entry.updatedAt !== entry.createdAt ? ` · editado em ${new Date(entry.updatedAt).toLocaleDateString("pt-BR")}` : ""}
          </Text>
          <Text
            style={[
              styles.body,
              {
                fontFamily: fontFamilyOf(entry.font),
                fontSize: entry.size ?? 16,
                lineHeight: Math.round((entry.size ?? 16) * 1.5),
              },
            ]}
            selectable
          >
            {entry.content}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  // ---------- ESCREVER / EDITAR ----------
  return (
    <ScreenShell title={entry ? "Editar anotação" : "Nova anotação"}>
      <View style={[ui.card, styles.paper, { borderTopColor: color }]}>
        <TextInput
          style={[styles.titleInput, { fontFamily: family }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Título"
          placeholderTextColor="#9E94AB"
          maxLength={60}
          returnKeyType="next"
          accessibilityLabel="Título"
        />
        <TextInput
          style={[styles.body, styles.bodyInput, textStyle]}
          value={content}
          onChangeText={(t) => {
            setContent(t);
            setError("");
          }}
          placeholder="Como foi o seu dia? O que você sentiu?"
          placeholderTextColor="#9E94AB"
          multiline
          textAlignVertical="top"
          autoFocus={!entry}
          accessibilityLabel="Texto do diário"
        />
        <Text style={[styles.meta, letters >= DIARY_MIN_CHARS && { color: "#86EFAC" }]}>
          {letters >= DIARY_MIN_CHARS ? "Pronto para valer XP hoje." : `${letters}/${DIARY_MIN_CHARS} letras para valer XP hoje.`}
        </Text>
      </View>

      {/* FONTE, TAMANHO E COR */}
      <View style={ui.card}>
        <Text style={styles.label}>
          <Ionicons name="text-outline" /> Fonte
        </Text>
        <View style={ui.chips}>
          {DIARY_FONTS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[ui.chip, font === f.id && ui.chipActive]}
              onPress={() => setFont(f.id)}
              accessibilityRole="radio"
              aria-checked={font === f.id}
            >
              <Text style={[ui.chipText, { fontFamily: f.family }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>
          <Ionicons name="resize-outline" /> Tamanho da letra
        </Text>
        <View style={ui.chips}>
          {DIARY_SIZES.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[ui.chip, styles.sizeChip, size === s.id && ui.chipActive]}
              onPress={() => setSize(s.id)}
              accessibilityRole="radio"
              aria-checked={size === s.id}
              accessibilityLabel={`Tamanho ${s.label}`}
            >
              <Text style={[ui.chipText, { fontSize: Math.min(s.id, 19) }]}>A</Text>
              <Text style={styles.sizeLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>
          <Ionicons name="color-palette-outline" /> Cor
        </Text>
        <View style={ui.chips}>
          {DIARY_COLORS.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.colorDot, { backgroundColor: c.code }, color === c.code && styles.colorDotActive]}
              onPress={() => setColor(c.code)}
              accessibilityRole="radio"
              aria-checked={color === c.code}
              accessibilityLabel={`Cor ${c.id}`}
            />
          ))}
        </View>
      </View>

      {error ? <Text style={ui.error}>{error}</Text> : null}
      {toast ? (
        <Text style={[ui.ok, { textAlign: "center" }]} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" /> {toast}
        </Text>
      ) : null}

      <View style={[ui.row, { marginTop: 4 }]}>
        <TouchableOpacity style={[styles.button, styles.cancel]} onPress={goBack} accessibilityRole="button">
          <Text style={ui.primaryText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#7C3AED" }]} onPress={save} accessibilityRole="button">
          <Text style={ui.primaryText}>
            <Ionicons name="save-outline" /> Salvar
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  paper: { borderTopWidth: 4 },
  titleInput: { color: "#FFF", fontSize: 18, fontWeight: "600", paddingVertical: 6 },
  viewTitle: { color: "#FFF", fontSize: 20, fontWeight: "700" },
  meta: { color: "#9E94AB", fontSize: 12, marginTop: 6, textTransform: "none" },
  body: { color: "#F3EEFF", marginTop: 12 },
  bodyInput: {
    minHeight: 220,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 12,
  },
  label: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  sizeChip: { flexDirection: "row", alignItems: "baseline", gap: 4, minWidth: 52, justifyContent: "center" },
  sizeLabel: { color: "#C7BADB", fontSize: 11 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
  colorDotActive: { borderColor: "#FFF" },
  button: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", minHeight: 46 },
  cancel: { borderWidth: 1, borderColor: "#A78BFA" },
});
