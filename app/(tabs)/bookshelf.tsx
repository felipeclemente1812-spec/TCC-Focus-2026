import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import BookCover from "@/components/BookCover";
import { BOOK_DONE_XP, READING_GOAL_XP } from "@/constants/gamification";
import { BooksContext, BookStatus, STATUS_LABEL } from "@/context/BooksContext";

type Filter = "todos" | BookStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "quero", label: "Quero ler" },
  { key: "lendo", label: "Lendo" },
  { key: "concluido", label: "Concluído" },
];
const GOAL_OPTIONS = [10, 20, 30];

export default function Bookshelf() {
  const ctx = useContext(BooksContext);
  const [filter, setFilter] = useState<Filter>("todos");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<BookStatus>("quero");
  const [error, setError] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const params = useLocalSearchParams<{ manual?: string }>();
  const { width } = useWindowDimensions();

  // Vindo de "Não encontrou? Cadastrar manualmente" na busca
  useEffect(() => {
    if (params.manual === "1") setShowForm(true);
  }, [params.manual]);

  // Grade de capas com 3 colunas, ajustada à largura da tela
  const coverWidth = Math.floor((Math.min(width, 520) - 30 - 2 * 12) / 3);

  if (!ctx) throw new Error("BooksContext não encontrado");
  const { books, dailyGoal, pagesToday, goalReachedToday, addBook, setDailyGoal } = ctx;

  const list = filter === "todos" ? books : books.filter((b) => b.status === filter);
  const count = (s: BookStatus) => books.filter((b) => b.status === s).length;

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setPages("");
    setCoverUrl("");
    setStatus("quero");
    setError("");
  };

  const handleAdd = () => {
    const result = addBook({ title, author, pages, coverUrl, status });
    if (result.error) {
      setError(result.error);
      return;
    }
    resetForm();
    setShowForm(false);
    if (result.id) router.push({ pathname: "/book", params: { id: result.id } });
  };

  const applyCustomGoal = () => {
    const n = Number(customGoal);
    if (!Number.isInteger(n) || n < 1 || n > 500) return;
    setDailyGoal(n);
    setCustomGoal("");
  };

  const remaining = dailyGoal ? Math.max(0, dailyGoal - pagesToday) : 0;
  const goalPercent = dailyGoal ? Math.min(100, Math.round((pagesToday / dailyGoal) * 100)) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>
            <Text style={styles.title}>Minha Estante</Text>
            <View style={{ width: 25 }} />
          </View>

          {/* META DIÁRIA */}
          <View style={styles.goalCard}>
            <View style={styles.goalTop}>
              <Text style={styles.goalTitle}><Ionicons name="book-outline" /> Meta de leitura de hoje</Text>
              {goalReachedToday ? <Text style={styles.goalBadge}><Ionicons name="checkmark" /> alcançada</Text> : null}
            </View>

            {dailyGoal ? (
              <>
                <Text style={styles.goalNumbers}>
                  {pagesToday} de {dailyGoal} páginas
                  {goalReachedToday ? "" : ` · faltam ${remaining}`}
                </Text>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${goalPercent}%` }]} />
                </View>
                <Text style={styles.goalHint}>
                  {goalPercent}% · bater a meta vale +{READING_GOAL_XP} XP (1x por dia)
                </Text>
              </>
            ) : (
              <Text style={styles.goalHint}>
                Defina quantas páginas quer ler por dia. Registre a leitura em cada livro.
              </Text>
            )}

            <View style={styles.chips}>
              {GOAL_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, dailyGoal === g && styles.chipActive]}
                  onPress={() => setDailyGoal(g)}
                  accessibilityRole="radio"
                  aria-checked={dailyGoal === g}
                >
                  <Text style={styles.chipText}>{g} pág.</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                value={customGoal}
                onChangeText={(t) => setCustomGoal(t.replace(/\D/g, ""))}
                onSubmitEditing={applyCustomGoal}
                onBlur={applyCustomGoal}
                placeholder="Outra"
                placeholderTextColor="#9E94AB"
                keyboardType="number-pad"
                maxLength={3}
                style={styles.goalInput}
                accessibilityLabel="Outra meta de páginas"
              />
              {dailyGoal ? (
                <TouchableOpacity onPress={() => setDailyGoal(null)} hitSlop={8}>
                  <Text style={styles.link}>Sem meta</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* FILTROS */}
          <View style={styles.tabs}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={filter === f.key ? styles.activeTab : styles.tab}
                onPress={() => setFilter(f.key)}
                accessibilityRole="tab"
                aria-selected={filter === f.key}
              >
                <Text style={styles.tabText} numberOfLines={1}>
                  {f.label}
                  {f.key !== "todos" ? ` (${count(f.key)})` : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* LISTA */}
          {list.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="library-outline" style={styles.emptyIcon} color="#DDD6FE" />
              <Text style={styles.emptyText}>
                {books.length === 0
                  ? "Sua estante está vazia. Adicione o primeiro livro!"
                  : "Nenhum livro com esse status."}
              </Text>
            </View>
          ) : (
            /* ESTANTE EM GRADE DE CAPAS */
            <View style={styles.grid}>
              {list.map((b) => {
                const pct = b.pages ? Math.min(100, Math.round((b.currentPage / b.pages) * 100)) : null;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={{ width: coverWidth }}
                    onPress={() => router.push({ pathname: "/book", params: { id: b.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${b.title}, ${STATUS_LABEL[b.status]}${
                      pct !== null ? `, ${pct}% lido` : ""
                    }. Ver detalhes`}
                  >
                    <View>
                      <BookCover uri={b.coverUrl} title={b.title} width={coverWidth} />
                      <Text style={[styles.statusBadge, styles[`status_${b.status}`]]}>
                        {b.status === "concluido" ? <Ionicons name="checkmark" /> : STATUS_LABEL[b.status]}
                      </Text>
                    </View>
                    {pct !== null && b.status !== "quero" ? (
                      <View style={styles.smallBar}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                    ) : null}
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {b.title}
                    </Text>
                    {pct !== null && b.status === "lendo" ? (
                      <Text style={styles.bookProgress}>{pct}% lido</Text>
                    ) : b.author ? (
                      <Text style={styles.bookAuthor} numberOfLines={1}>
                        {b.author}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* CADASTRO */}
          {showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Novo livro</Text>
              <TextInput
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (error) setError("");
                }}
                placeholder="Título *"
                placeholderTextColor="#9E94AB"
                style={styles.input}
                maxLength={80}
                accessibilityLabel="Título do livro"
              />
              <TextInput
                value={author}
                onChangeText={setAuthor}
                placeholder="Autor (opcional)"
                placeholderTextColor="#9E94AB"
                style={styles.input}
                maxLength={60}
                accessibilityLabel="Autor"
              />
              <TextInput
                value={pages}
                onChangeText={(t) => setPages(t.replace(/\D/g, ""))}
                placeholder="Total de páginas (opcional)"
                placeholderTextColor="#9E94AB"
                keyboardType="number-pad"
                style={styles.input}
                maxLength={5}
                accessibilityLabel="Total de páginas"
              />
              <TextInput
                value={coverUrl}
                onChangeText={setCoverUrl}
                placeholder="Link da capa (opcional)"
                placeholderTextColor="#9E94AB"
                autoCapitalize="none"
                style={styles.input}
                accessibilityLabel="Link da capa"
              />
              <View style={styles.chips}>
                {(["quero", "lendo"] as BookStatus[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, status === s && styles.chipActive]}
                    onPress={() => setStatus(s)}
                    accessibilityRole="radio"
                    aria-checked={status === s}
                  >
                    <Text style={styles.chipText}>{STATUS_LABEL[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.primary, !title.trim() && styles.disabled]}
                onPress={handleAdd}
                disabled={!title.trim()}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Adicionar à estante</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowForm(false);
                }}
                style={styles.cancel}
              >
                <Text style={styles.link}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primary}
                onPress={() => router.push("/book-search")}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}><Ionicons name="search" /> Buscar livro pela capa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                style={styles.cancel}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Cadastrar manualmente</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.note}>
            Cadastrar livros não dá XP. Concluir um livro registrando a leitura vale +
            {BOOK_DONE_XP} XP. Sua estante fica salva neste aparelho.
          </Text>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  content: { padding: 15, paddingBottom: 110 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  back: { color: "#FFF", fontSize: 25 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  goalCard: { backgroundColor: "#25193A", borderRadius: 10, padding: 12, marginBottom: 12 },
  goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  goalBadge: {
    color: "#FFF",
    backgroundColor: "#15A638",
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
  },
  goalNumbers: { color: "#DDD6FE", fontSize: 13, marginTop: 6 },
  goalHint: { color: "#C7BADB", fontSize: 12, marginTop: 6, lineHeight: 17 },
  goalInput: {
    width: 70,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    color: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },

  bar: { height: 8, backgroundColor: "#57356F", borderRadius: 8, marginTop: 8, overflow: "hidden" },
  smallBar: { height: 6, backgroundColor: "#57356F", borderRadius: 6, marginTop: 6, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#B832E5" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  chip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#5B21B6",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },
  chipText: { color: "#FFF", fontSize: 13 },

  tabs: { flexDirection: "row", backgroundColor: "#25193A", borderRadius: 8, padding: 4, marginBottom: 10 },
  activeTab: { flex: 1, backgroundColor: "#5B21B6", borderRadius: 6, paddingVertical: 8, alignItems: "center" },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center" },
  tabText: { color: "#FFF", fontSize: 12, fontWeight: "600" },

  empty: { backgroundColor: "#25193A", borderRadius: 10, padding: 18, alignItems: "center", marginBottom: 10 },
  emptyIcon: { fontSize: 30, marginBottom: 6 },
  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 6 },
  bookTitle: { color: "#FFF", fontSize: 12, fontWeight: "600", marginTop: 5 },
  bookAuthor: { color: "#C7BADB", fontSize: 11, marginTop: 1 },
  statusBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  status_quero: { backgroundColor: "#475569" },
  status_lendo: { backgroundColor: "#5B21B6" },
  status_concluido: { backgroundColor: "#15A638" },
  bookProgress: { color: "#C7BADB", fontSize: 11, marginTop: 3 },

  formCard: { backgroundColor: "#25193A", borderRadius: 10, padding: 14, marginTop: 6 },
  formTitle: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 10 },
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
  },
  error: { color: "#FCA5A5", fontSize: 13, marginTop: 8 },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
    minHeight: 46,
  },
  disabled: { opacity: 0.45 },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  cancel: { alignItems: "center", paddingVertical: 10 },
  link: { color: "#DDD6FE", fontSize: 13, textDecorationLine: "underline" },

  note: { color: "#C7BADB", fontSize: 11, textAlign: "center", marginTop: 12, lineHeight: 16 },
});
