import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import BookCover from "@/components/BookCover";
import { BooksContext, BookStatus } from "@/context/BooksContext";
import {
  BookResult,
  largeCover,
  loadShelf,
  searchBooks,
  SHELVES,
} from "@/services/bookSearch";

type ShelfState = { status: "loading" | "ok" | "error"; books: BookResult[] };

// Adicionar livro pela capa: prateleiras de sugestões + busca na Open Library.
// O cadastro manual continua disponível (sem internet ou livro não encontrado).
export default function BookSearch() {
  const ctx = useContext(BooksContext);
  const { width } = useWindowDimensions();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [shelves, setShelves] = useState<Record<string, ShelfState>>({});
  const [selected, setSelected] = useState<BookResult | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean; bookId?: string } | null>(null);
  const lastQuery = useRef("");

  // Grade de 3 colunas que se ajusta à largura da tela
  const contentWidth = Math.min(width, 520) - 30;
  const gridCover = Math.floor((contentWidth - 2 * 12) / 3);
  const shelfCover = 92;

  // Carrega as prateleiras uma vez (resultado fica em cache no serviço)
  useEffect(() => {
    SHELVES.forEach((s) => {
      setShelves((prev) => ({ ...prev, [s.id]: { status: "loading", books: [] } }));
      loadShelf(s.query)
        .then((books) => setShelves((prev) => ({ ...prev, [s.id]: { status: "ok", books } })))
        .catch(() => setShelves((prev) => ({ ...prev, [s.id]: { status: "error", books: [] } })));
    });
  }, []);

  // Busca com espera de 0,5 s após parar de digitar
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      lastQuery.current = q;
      searchBooks(q)
        .then((r) => {
          if (lastQuery.current !== q) return; // resposta de uma busca antiga
          setResults(r);
          setSearchError("");
        })
        .catch((e: Error) => {
          if (lastQuery.current !== q) return;
          setResults([]);
          setSearchError(e.message);
        })
        .finally(() => {
          if (lastQuery.current === q) setSearching(false);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!message || message.error) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!ctx) throw new Error("BooksContext não encontrado");
  const { books, addBook } = ctx;

  const alreadyOnShelf = (b: BookResult) =>
    books.find((x) => x.title.toLowerCase() === b.title.toLowerCase());

  const handleAdd = (b: BookResult, status: BookStatus) => {
    const result = addBook({
      title: b.title,
      author: b.author,
      pages: b.pages ? String(b.pages) : "",
      coverUrl: b.coverUrl ?? "",
      status,
    });
    setSelected(null);
    setMessage(
      result.error
        ? { text: result.error, error: true }
        : { text: `“${b.title}” entrou na sua estante!`, error: false, bookId: result.id },
    );
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/bookshelf"));
  const goManual = () => router.replace({ pathname: "/bookshelf", params: { manual: "1" } });

  const renderTile = (b: BookResult, size: number) => {
    const owned = !!alreadyOnShelf(b);
    return (
      <TouchableOpacity
        key={b.key}
        style={{ width: size }}
        onPress={() => setSelected(b)}
        accessibilityRole="button"
        accessibilityLabel={`${b.title}${b.author ? `, de ${b.author}` : ""}${owned ? ", já na estante" : ""}`}
      >
        <View>
          <BookCover uri={b.coverUrl} title={b.title} width={size} />
          {owned ? (
            <View style={styles.ownedBadge}>
              <Ionicons name="checkmark" style={styles.ownedText} />
            </View>
          ) : null}
        </View>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {b.title}
        </Text>
        {b.author ? (
          <Text style={styles.tileAuthor} numberOfLines={1}>
            {b.author}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const isSearching = query.trim().length >= 2;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#6B4A91", "#43247D"]} style={styles.background}>
        <View style={styles.fixedHeader}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" style={styles.back} />
            </TouchableOpacity>
            <Text style={styles.title}>Adicionar livro</Text>
            <View style={{ width: 25 }} />
          </View>
        </View>
        <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* BUSCA */}
          <View style={styles.searchBox}>
            <Ionicons name="search" style={styles.searchIcon} color="#C7BADB" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Título ou autor, ex.: Hábitos Atômicos"
              placeholderTextColor="#9E94AB"
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Buscar livro por título ou autor"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar busca">
                <Ionicons name="close" style={styles.clear} />
              </TouchableOpacity>
            ) : null}
          </View>

          {message ? (
            <View style={[styles.message, message.error && styles.messageError]} accessibilityLiveRegion="polite">
              <Text style={styles.messageText}>{message.text}</Text>
              {message.bookId ? (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/book", params: { id: message.bookId } })}
                  hitSlop={8}
                >
                  <Text style={styles.messageLink}>Abrir livro ›</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {isSearching ? (
            /* RESULTADOS EM GRADE */
            <>
              <Text style={styles.sectionTitle}>
                {searching ? "Buscando..." : `${results.length} ${results.length === 1 ? "resultado" : "resultados"}`}
              </Text>

              {searching && results.length === 0 ? (
                <ActivityIndicator color="#C4B5FD" style={{ marginVertical: 30 }} />
              ) : searchError ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>{searchError}</Text>
                </View>
              ) : results.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    Nenhum livro encontrado. Tente outro título, o nome do autor ou
                    cadastre manualmente.
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>{results.map((b) => renderTile(b, gridCover))}</View>
              )}
            </>
          ) : (
            /* PRATELEIRAS DE SUGESTÕES */
            SHELVES.map((s) => {
              const state = shelves[s.id];
              if (state?.status === "error") return null;
              return (
                <View key={s.id} style={styles.shelf}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name={s.icon} /> {s.label}
                  </Text>
                  {!state || state.status === "loading" ? (
                    <View style={[styles.shelfLoading, { height: shelfCover * 1.5 }]}>
                      <ActivityIndicator color="#C4B5FD" />
                    </View>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.shelfRow}
                    >
                      {state.books.map((b) => renderTile(b, shelfCover))}
                    </ScrollView>
                  )}
                </View>
              );
            })
          )}

          {!isSearching && SHELVES.every((s) => shelves[s.id]?.status === "error") ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Não foi possível carregar as sugestões (sem internet?). Você ainda pode
                cadastrar o livro manualmente.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.manual} onPress={goManual} accessibilityRole="button">
            <Text style={styles.manualText}>Não encontrou? Cadastrar manualmente</Text>
          </TouchableOpacity>

          <Text style={styles.credit}>Dados e capas: Open Library (openlibrary.org)</Text>
        </ScrollView>

        {/* DETALHES DO LIVRO ESCOLHIDO */}
        {selected ? (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setSelected(null)}
            accessibilityLabel="Fechar detalhes"
          >
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <View style={styles.sheetTop}>
                <BookCover uri={largeCover(selected.coverUrl)} title={selected.title} width={110} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>{selected.title}</Text>
                  {selected.author ? <Text style={styles.sheetAuthor}>{selected.author}</Text> : null}
                  <Text style={styles.sheetMeta}>
                    {selected.pages ? `${selected.pages} páginas` : "Páginas não informadas"}
                    {selected.year ? ` · ${selected.year}` : ""}
                  </Text>
                  {!selected.inPortuguese ? (
                    <Text style={styles.sheetMeta}>Edição em português não encontrada</Text>
                  ) : null}
                </View>
              </View>

              {alreadyOnShelf(selected) ? (
                <>
                  <Text style={styles.sheetOwned}><Ionicons name="checkmark-circle" /> Este livro já está na sua estante</Text>
                  <TouchableOpacity
                    style={styles.primary}
                    onPress={() => {
                      const owned = alreadyOnShelf(selected);
                      setSelected(null);
                      if (owned) router.push({ pathname: "/book", params: { id: owned.id } });
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryText}>Abrir na estante</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.sheetButtons}>
                  <TouchableOpacity
                    style={[styles.primary, styles.flex]}
                    onPress={() => handleAdd(selected, "quero")}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryText}>Quero ler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondary, styles.flex]}
                    onPress={() => handleAdd(selected, "lendo")}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryText}>Já estou lendo</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={() => setSelected(null)} style={styles.close} accessibilityRole="button">
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : null}
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
  flex: { flex: 1 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  back: { color: "#FFF", fontSize: 25 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "600" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25193A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#7C3AED",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: "#FFF", fontSize: 15, paddingVertical: 12 },
  clear: { color: "#C7BADB", fontSize: 16, paddingLeft: 8 },

  message: {
    backgroundColor: "rgba(54,211,91,0.15)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  messageError: { backgroundColor: "rgba(248,113,113,0.15)" },
  messageText: { color: "#FFF", fontSize: 13, flex: 1 },
  messageLink: { color: "#86EFAC", fontSize: 13, fontWeight: "700" },

  sectionTitle: { color: "#FFF", fontSize: 15, fontWeight: "700", marginBottom: 8 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  shelf: { marginBottom: 16 },
  shelfRow: { gap: 10, paddingRight: 10 },
  shelfLoading: { justifyContent: "center", alignItems: "center" },

  tileTitle: { color: "#FFF", fontSize: 12, fontWeight: "600", marginTop: 5 },
  tileAuthor: { color: "#C7BADB", fontSize: 11, marginTop: 1 },

  ownedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#15A638",
    alignItems: "center",
    justifyContent: "center",
  },
  ownedText: { color: "#FFF", fontSize: 12, fontWeight: "800" },

  empty: { backgroundColor: "#25193A", borderRadius: 10, padding: 16, marginBottom: 10 },
  emptyText: { color: "#C7BADB", fontSize: 13, textAlign: "center", lineHeight: 19 },

  manual: {
    borderWidth: 1,
    borderColor: "#A78BFA",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  manualText: { color: "#DDD6FE", fontSize: 14, fontWeight: "600" },
  credit: { color: "#9E94AB", fontSize: 11, textAlign: "center", marginTop: 10 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,10,35,0.7)",
    justifyContent: "flex-end",
    paddingBottom: 90,
  },
  sheet: {
    backgroundColor: "#25193A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderRadius: 20,
    marginHorizontal: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#5B21B6",
  },
  sheetTop: { flexDirection: "row", gap: 14 },
  sheetTitle: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  sheetAuthor: { color: "#C7BADB", fontSize: 14, marginTop: 3 },
  sheetMeta: { color: "#9E94AB", fontSize: 12, marginTop: 6 },
  sheetOwned: { color: "#86EFAC", fontSize: 14, fontWeight: "600", marginTop: 14 },
  sheetButtons: { flexDirection: "row", gap: 10, marginTop: 14 },

  primary: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  primaryText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  secondary: {
    borderWidth: 1,
    borderColor: "#A78BFA",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryText: { color: "#DDD6FE", fontSize: 15, fontWeight: "700" },
  close: { alignItems: "center", paddingVertical: 12 },
  closeText: { color: "#C7BADB", fontSize: 14, textDecorationLine: "underline" },
});
