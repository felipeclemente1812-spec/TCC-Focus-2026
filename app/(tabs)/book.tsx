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
  View,
} from "react-native";

import BookCover from "@/components/BookCover";
import { BOOK_DONE_XP } from "@/constants/gamification";
import { largeCover } from "@/services/bookSearch";
import { BooksContext, BookStatus, STATUS_LABEL } from "@/context/BooksContext";
import { confirmAction } from "@/utils/feedback";

const QUICK_PAGES = [5, 10, 20];

// Detalhes de um livro: progresso, registrar leitura, anotações, editar e remover
export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const ctx = useContext(BooksContext);

  const [pagesRead, setPagesRead] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", pages: "", coverUrl: "" });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const book = id ? ctx?.getBook(id) : undefined;

  // A tela fica montada entre livros: recarrega os campos ao trocar
  useEffect(() => {
    setNotes(book?.notes ?? "");
    setEditing(false);
    setMessage(null);
    setPagesRead("");
    setPageNumber("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!message || message.error) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  if (!ctx) throw new Error("BooksContext não encontrado");
  const { logReading, setCurrentPage, setStatus, saveNotes, updateBook, removeBook, logs, canEarnBookXp } = ctx;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/bookshelf"));

  if (!book) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#6B4A91", "#43247D"]} style={[styles.background, styles.center]}>
          <Text style={styles.emptyText}>Livro não encontrado.</Text>
          <TouchableOpacity style={styles.primary} onPress={() => router.replace("/bookshelf")}>
            <Text style={styles.primaryText}>Ver minha estante</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const pct = book.pages ? Math.min(100, Math.round((book.currentPage / book.pages) * 100)) : null;
  const bookLogs = logs.filter((l) => l.bookId === book.id);
  const totalLogged = bookLogs.reduce((s, l) => s + l.pages, 0);

  const show = (error: string | null, ok: string) =>
    setMessage(error ? { text: error, error: true } : { text: ok, error: false });

  const handleLog = (n: number) => {
    const before = book.status;
    const error = logReading(book.id, n);
    setPagesRead("");
    show(
      error,
      before !== "concluido" && book.pages && book.currentPage + n >= book.pages
        ? `Livro concluído! +${BOOK_DONE_XP} XP`
        : `+${n} páginas registradas`,
    );
  };

  const handleSetPage = () => {
    const n = Number(pageNumber);
    const finishes = !!book.pages && n >= book.pages && book.currentPage < book.pages;
    const error = setCurrentPage(book.id, n);
    setPageNumber("");
    show(error, finishes ? `Livro concluído! +${BOOK_DONE_XP} XP` : "Página atualizada");
  };

  const handleStatus = (s: BookStatus) => {
    if (s === "concluido" && !canEarnBookXp(book.id)) {
      setStatus(book.id, s);
      show(null, "Marcado como concluído (sem XP: nenhuma leitura registrada)");
      return;
    }
    setStatus(book.id, s);
    show(null, s === "concluido" ? `Livro concluído! +${BOOK_DONE_XP} XP` : `Status: ${STATUS_LABEL[s]}`);
  };

  const startEdit = () => {
    setForm({
      title: book.title,
      author: book.author,
      pages: book.pages ? String(book.pages) : "",
      coverUrl: book.coverUrl ?? "",
    });
    setEditing(true);
    setMessage(null);
  };

  const handleSaveEdit = () => {
    const error = updateBook(book.id, form);
    if (error) {
      show(error, "");
      return;
    }
    setEditing(false);
    show(null, "Livro atualizado");
  };

  const handleRemove = async () => {
    const ok = await confirmAction(
      "Remover livro",
      `Remover "${book.title}" da estante? O XP e as páginas já registradas continuam valendo.`,
      "Remover",
    );
    if (!ok) return;
    removeBook(book.id);
    router.replace("/bookshelf");
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <View style={styles.fixedHeader}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>
            <Text style={styles.title}>Livro</Text>
            <TouchableOpacity onPress={editing ? () => setEditing(false) : startEdit} hitSlop={10} accessibilityRole="button">
              <Text style={styles.link}>{editing ? "Cancelar" : "Editar"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {message ? (
            <Text style={[styles.message, message.error && styles.messageError]} accessibilityLiveRegion="polite">
              {message.text}
            </Text>
          ) : null}

          {editing ? (
            <View style={styles.card}>
              {(
                [
                  ["title", "Título *"],
                  ["author", "Autor"],
                  ["pages", "Total de páginas"],
                  ["coverUrl", "Link da capa"],
                ] as const
              ).map(([field, label]) => (
                <TextInput
                  key={field}
                  value={form[field]}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, [field]: field === "pages" ? t.replace(/\D/g, "") : t }))
                  }
                  placeholder={label}
                  placeholderTextColor="#9E94AB"
                  keyboardType={field === "pages" ? "number-pad" : "default"}
                  autoCapitalize={field === "coverUrl" ? "none" : "sentences"}
                  style={styles.input}
                  accessibilityLabel={label}
                />
              ))}
              <TouchableOpacity style={styles.primary} onPress={handleSaveEdit} accessibilityRole="button">
                <Text style={styles.primaryText}>Salvar alterações</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.danger} onPress={handleRemove} accessibilityRole="button">
                <Text style={styles.dangerText}>Remover da estante</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* CABEÇALHO DO LIVRO */}
              <View style={[styles.card, styles.top]}>
                <BookCover uri={largeCover(book.coverUrl)} title={book.title} width={90} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  {book.author ? <Text style={styles.bookAuthor}>{book.author}</Text> : null}
                  <Text style={styles.meta}>
                    {book.pages ? `${book.pages} páginas` : "Total de páginas não informado"}
                  </Text>
                  {totalLogged > 0 ? (
                    <Text style={styles.meta}>
                      {totalLogged} páginas registradas em {bookLogs.length}{" "}
                      {bookLogs.length === 1 ? "leitura" : "leituras"}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* STATUS */}
              <View style={styles.tabs}>
                {(["quero", "lendo", "concluido"] as BookStatus[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={book.status === s ? styles.activeTab : styles.tab}
                    onPress={() => book.status !== s && handleStatus(s)}
                    accessibilityRole="tab"
                    aria-selected={book.status === s}
                  >
                    <Text style={styles.tabText}>{STATUS_LABEL[s]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* PROGRESSO */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Progresso</Text>
                {pct !== null ? (
                  <>
                    <Text style={styles.progressText}>
                      Página {book.currentPage} de {book.pages} · {pct}%
                    </Text>
                    <View style={styles.bar}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                  </>
                ) : (
                  <Text style={styles.progressText}>Página atual: {book.currentPage}</Text>
                )}

                {book.status !== "concluido" ? (
                  <>
                    <Text style={styles.label}>Li agora:</Text>
                    <View style={styles.row}>
                      {QUICK_PAGES.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={styles.chip}
                          onPress={() => handleLog(n)}
                          accessibilityRole="button"
                          accessibilityLabel={`Registrar ${n} páginas`}
                        >
                          <Text style={styles.chipText}>+{n}</Text>
                        </TouchableOpacity>
                      ))}
                      <TextInput
                        value={pagesRead}
                        onChangeText={(t) => setPagesRead(t.replace(/\D/g, ""))}
                        placeholder="páginas"
                        placeholderTextColor="#9E94AB"
                        keyboardType="number-pad"
                        maxLength={4}
                        style={styles.smallInput}
                        onSubmitEditing={() => pagesRead && handleLog(Number(pagesRead))}
                        accessibilityLabel="Quantas páginas leu"
                      />
                      <TouchableOpacity
                        style={[styles.chip, styles.chipActive, !pagesRead && styles.disabled]}
                        onPress={() => handleLog(Number(pagesRead))}
                        disabled={!pagesRead}
                        accessibilityRole="button"
                      >
                        <Text style={styles.chipText}>Registrar</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Ou estou na página:</Text>
                    <View style={styles.row}>
                      <TextInput
                        value={pageNumber}
                        onChangeText={(t) => setPageNumber(t.replace(/\D/g, ""))}
                        placeholder={String(book.currentPage)}
                        placeholderTextColor="#9E94AB"
                        keyboardType="number-pad"
                        maxLength={5}
                        style={styles.smallInput}
                        onSubmitEditing={() => pageNumber && handleSetPage()}
                        accessibilityLabel="Página atual"
                      />
                      <TouchableOpacity
                        style={[styles.chip, !pageNumber && styles.disabled]}
                        onPress={handleSetPage}
                        disabled={!pageNumber}
                        accessibilityRole="button"
                      >
                        <Text style={styles.chipText}>Atualizar</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.hint}>
                      Avançar a página conta para a meta do dia; voltar é só uma correção.
                    </Text>
                  </>
                ) : (
                  <Text style={styles.done}>
                    <Ionicons name="checkmark-circle" /> Concluído
                    {book.finishedAt ? ` em ${new Date(book.finishedAt).toLocaleDateString("pt-BR")}` : ""}
                  </Text>
                )}
              </View>

              {/* ANOTAÇÕES */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Anotações</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ideias, citações, o que aprendeu..."
                  placeholderTextColor="#9E94AB"
                  multiline
                  maxLength={2000}
                  style={[styles.input, styles.notes]}
                  accessibilityLabel="Anotações do livro"
                />
                <TouchableOpacity
                  style={[styles.primary, notes === book.notes && styles.disabled]}
                  onPress={() => {
                    saveNotes(book.id, notes);
                    show(null, "Anotações salvas");
                  }}
                  disabled={notes === book.notes}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryText}>Salvar anotações</Text>
                </TouchableOpacity>
              </View>
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
  center: { justifyContent: "center", padding: 20 },
  // Cabeçalho fixo: fica parado no topo enquanto o conteúdo rola
  fixedHeader: { paddingHorizontal: 15, paddingTop: 15 },
  content: { paddingHorizontal: 15, paddingTop: 4, paddingBottom: 110 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  back: { color: "#FFF", fontSize: 25 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },
  link: { color: "#DDD6FE", fontSize: 14, textDecorationLine: "underline" },

  message: {
    color: "#86EFAC",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(54,211,91,0.12)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  messageError: { color: "#FCA5A5", backgroundColor: "rgba(248,113,113,0.12)" },

  card: { backgroundColor: "#25193A", borderRadius: 10, padding: 14, marginBottom: 10 },
  top: { flexDirection: "row", gap: 12, alignItems: "center" },
  cover: { width: 80, height: 116, borderRadius: 8, backgroundColor: "#3B2A5A" },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  bookTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  bookAuthor: { color: "#C7BADB", fontSize: 13, marginTop: 2 },
  meta: { color: "#9E94AB", fontSize: 12, marginTop: 4 },

  tabs: { flexDirection: "row", backgroundColor: "#25193A", borderRadius: 8, padding: 4, marginBottom: 10 },
  activeTab: { flex: 1, backgroundColor: "#5B21B6", borderRadius: 6, paddingVertical: 9, alignItems: "center" },
  tab: { flex: 1, paddingVertical: 9, alignItems: "center" },
  tabText: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "600", marginBottom: 6 },
  progressText: { color: "#DDD6FE", fontSize: 13 },
  bar: { height: 8, backgroundColor: "#57356F", borderRadius: 8, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#B832E5" },
  label: { color: "#C7BADB", fontSize: 12, marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: { borderRadius: 14, borderWidth: 1, borderColor: "#5B21B6", paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: "#5B21B6", borderColor: "#A78BFA" },
  chipText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  smallInput: {
    width: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    color: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },
  hint: { color: "#9E94AB", fontSize: 11, marginTop: 8 },
  done: { color: "#86EFAC", fontSize: 14, fontWeight: "600", marginTop: 8 },

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
  notes: { minHeight: 90, textAlignVertical: "top" },

  primary: { backgroundColor: "#7C3AED", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  primaryText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  danger: {
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.5)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  dangerText: { color: "#f87171", fontSize: 14, fontWeight: "600" },
  emptyText: { color: "#C7BADB", fontSize: 14, textAlign: "center", marginBottom: 12 },
});
