import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useContext, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import {
  DIARY_FONTS,
  DIARY_MIN_CHARS,
  DIARY_SIZES,
  DIARY_THEMES,
  DiaryContext,
  DiaryFont,
  fontFamilyOf,
  themeOf,
} from "@/context/DiaryContext";
import { confirmAction } from "@/utils/feedback";

const PAD = 14;

// Folha pautada: linhas atrás do texto, no mesmo espaçamento das linhas dele
function Lined({ lineHeight, height }: { lineHeight: number; height: number }) {
  const count = Math.max(12, Math.ceil(height / lineHeight) + 1);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.rule, { top: PAD + (i + 1) * lineHeight - 1 }]} />
      ))}
    </View>
  );
}

// Uma anotação do diário (Figma do Lucas): papel colorido sobre o fundo da cor.
//   /diary-entry                     -> nova
//   /diary-entry?id=...&mode=edit    -> editar
//   /diary-entry?id=...&mode=view    -> ler
// A fonte e o tamanho da letra ficam salvos em cada anotação.
export default function DiaryEntryScreen() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const diary = useContext(DiaryContext);
  const entry = id ? diary?.getEntry(id) : undefined;
  const viewing = mode === "view" && !!entry;
  // Nova anotação começa com a cor, a fonte e o tamanho da última escrita
  const last = diary?.entries[0];

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(DIARY_THEMES[0].paper);
  const [font, setFont] = useState<DiaryFont>("padrao");
  const [size, setSize] = useState(16);
  const [textHeight, setTextHeight] = useState(0);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  // As abas mantêm a tela montada: ao abrir (nova, editar ou ler), recomeça
  // com os dados da anotação certa
  useFocusEffect(
    useCallback(() => {
      setTitle(entry?.title ?? "");
      setContent(entry?.content ?? "");
      setColor(themeOf(entry?.color ?? last?.color).paper);
      setFont(entry?.font ?? last?.font ?? "padrao");
      setSize(entry?.size ?? last?.size ?? 16);
      setToast("");
      setError("");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, mode]),
  );

  if (!diary) return null;

  const theme = themeOf(viewing ? entry.color : color);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/diary"));
  const letters = content.replace(/\s/g, "").length;
  const lineHeight = Math.round((viewing ? (entry.size ?? 16) : size) * 1.6);
  const date = new Date(entry?.createdAt ?? Date.now());
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).toUpperCase();

  const save = () => {
    if (!title.trim() && !content.trim()) return goBack();
    const input = { title, content, color, font, size };
    const result = entry ? diary.updateEntry(entry.id, input) : diary.addEntry(input);
    if (result.error) return setError(result.error);
    setError("");
    setToast(result.counted ? "Salvo · “Escrever no diário” concluído" : "Salvo");
    setTimeout(goBack, 1200);
  };

  const remove = async () => {
    if (!entry) return;
    if (await confirmAction("Apagar anotação?", `"${entry.title || "Sem título"}" sai do seu diário.`, "Apagar")) {
      diary.removeEntry(entry.id);
      router.replace("/diary");
    }
  };

  const header = (
    <View style={[styles.header, { backgroundColor: theme.header }]}>
      <TouchableOpacity onPress={goBack} hitSlop={10} accessibilityLabel="Voltar">
        <Ionicons name="chevron-back" size={22} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Meu diário</Text>
      {viewing ? (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.setParams({ mode: "edit" })} hitSlop={10} accessibilityLabel="Editar">
            <Ionicons name="create-outline" size={21} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={remove} hitSlop={10} accessibilityLabel="Apagar">
            <Ionicons name="trash-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  if (id && !entry) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg }]}>
        {header}
        <View style={styles.content}>
          <Text style={styles.dateText}>Essa anotação não existe mais.</Text>
          <TouchableOpacity onPress={() => router.replace("/diary")} style={{ marginTop: 12 }}>
            <Text style={[styles.dateText, { textDecorationLine: "underline" }]}>Voltar ao diário</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{weekday}</Text>
          <Text style={styles.dateText}>{date.getFullYear()}</Text>
        </View>

        {/* ---------- LER ---------- */}
        {viewing ? (
          <>
            <View style={styles.titleBox}>
              <Text style={[styles.titleInput, { fontFamily: fontFamilyOf(entry.font) }]}>{entry.title || "Sem título"}</Text>
            </View>
            <View style={[styles.paper, { backgroundColor: theme.paper }]} onLayout={(e) => setTextHeight(e.nativeEvent.layout.height)}>
              <Lined lineHeight={lineHeight} height={textHeight} />
              <Text
                style={[styles.body, { fontFamily: fontFamilyOf(entry.font), fontSize: entry.size ?? 16, lineHeight }]}
                selectable
              >
                {entry.content}
              </Text>
            </View>
            {entry.updatedAt !== entry.createdAt ? (
              <Text style={[styles.hint, { marginTop: 8 }]}>Editado em {new Date(entry.updatedAt).toLocaleDateString("pt-BR")}</Text>
            ) : null}
          </>
        ) : (
          /* ---------- ESCREVER / EDITAR ---------- */
          <>
            <View style={styles.titleBox}>
              <TextInput
                style={[styles.titleInput, { fontFamily: fontFamilyOf(font) }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Título"
                placeholderTextColor="rgba(255,255,255,0.6)"
                maxLength={60}
                returnKeyType="next"
                accessibilityLabel="Título"
              />
            </View>
            <View style={[styles.paper, { backgroundColor: theme.paper }]}>
              <Lined lineHeight={lineHeight} height={textHeight} />
              <TextInput
                style={[styles.body, styles.bodyInput, { fontFamily: fontFamilyOf(font), fontSize: size, lineHeight, minHeight: lineHeight * 12 }]}
                value={content}
                onChangeText={(t) => {
                  setContent(t);
                  setError("");
                }}
                onContentSizeChange={(e) => setTextHeight(e.nativeEvent.contentSize.height)}
                placeholder="Como foi o seu dia? O que você sentiu?"
                placeholderTextColor="#8A7A62"
                multiline
                textAlignVertical="top"
                autoFocus={!entry}
                accessibilityLabel="Texto do diário"
              />
            </View>
            <Text style={[styles.hint, letters >= DIARY_MIN_CHARS && { color: "#BBF7D0" }]}>
              {letters >= DIARY_MIN_CHARS ? "Pronto para valer XP hoje." : `${letters}/${DIARY_MIN_CHARS} letras para valer XP hoje.`}
            </Text>

            {/* COR DO PAPEL */}
            <View style={styles.swatches}>
              {DIARY_THEMES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.swatch, { backgroundColor: t.paper }, color === t.paper && styles.swatchActive]}
                  onPress={() => setColor(t.paper)}
                  accessibilityRole="radio"
                  aria-checked={color === t.paper}
                  accessibilityLabel={`Papel ${t.id}`}
                >
                  {color === t.paper ? <Ionicons name="checkmark" size={20} color="#2B2116" /> : null}
                </TouchableOpacity>
              ))}
            </View>

            {/* FONTE E TAMANHO DA LETRA */}
            <View style={styles.options}>
              <Text style={styles.optionLabel}>Fonte</Text>
              <View style={styles.optionRow}>
                {DIARY_FONTS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.option, font === f.id && { backgroundColor: theme.paper }]}
                    onPress={() => setFont(f.id)}
                    accessibilityRole="radio"
                    aria-checked={font === f.id}
                  >
                    <Text style={[styles.optionText, { fontFamily: f.family }, font === f.id && styles.optionTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.optionLabel, { marginTop: 10 }]}>Tamanho da letra</Text>
              <View style={styles.optionRow}>
                {DIARY_SIZES.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.option, styles.sizeOption, size === s.id && { backgroundColor: theme.paper }]}
                    onPress={() => setSize(s.id)}
                    accessibilityRole="radio"
                    aria-checked={size === s.id}
                    accessibilityLabel={`Tamanho ${s.label}`}
                  >
                    <Text style={[styles.optionText, { fontSize: Math.min(s.id, 19) }, size === s.id && styles.optionTextActive]}>A</Text>
                    <Text style={[styles.optionText, { fontSize: 11 }, size === s.id && styles.optionTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {toast ? (
              <Text style={styles.toast} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark-circle" /> {toast}
              </Text>
            ) : null}

            <View style={styles.buttons}>
              <TouchableOpacity style={[styles.button, { backgroundColor: theme.header }]} onPress={goBack} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: theme.paper }]} onPress={save} accessibilityRole="button">
                <Text style={styles.saveText}>Salvar anotação</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#FFF", fontSize: 17, fontWeight: "700", flex: 1 },
  headerActions: { flexDirection: "row", gap: 18 },
  content: { padding: 16, paddingBottom: 120 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  dateText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  titleBox: { backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 8, paddingHorizontal: 12, minHeight: 46, justifyContent: "center", marginBottom: 12 },
  titleInput: { color: "#FFF", fontSize: 17, fontWeight: "700", paddingVertical: 10 },
  paper: { borderRadius: 8, padding: PAD, overflow: "hidden" },
  rule: { position: "absolute", left: PAD, right: PAD, height: 1, backgroundColor: "rgba(60,45,25,0.14)" },
  body: { color: "#2B2116" },
  bodyInput: { padding: 0 },
  hint: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 8 },
  swatches: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 16 },
  swatch: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: "#FFF" },
  options: { backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 10, padding: 12, marginTop: 16 },
  optionLabel: { color: "#FFF", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderRadius: 8, paddingHorizontal: 12, minHeight: 36, justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  sizeOption: { flexDirection: "row", alignItems: "baseline", gap: 4, minWidth: 52 },
  optionText: { color: "#FFF", fontSize: 13 },
  optionTextActive: { color: "#2B2116", fontWeight: "700" },
  error: { color: "#FECACA", fontSize: 13, marginTop: 12, textAlign: "center" },
  toast: { color: "#BBF7D0", fontSize: 13, marginTop: 12, textAlign: "center", fontWeight: "600" },
  buttons: { flexDirection: "row", gap: 12, marginTop: 16 },
  button: { flex: 1, borderRadius: 10, minHeight: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  saveText: { color: "#2B2116", fontSize: 14, fontWeight: "700" },
});
