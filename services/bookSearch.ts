// Busca de livros com capa — Open Library (https://openlibrary.org).
//
// Por que Open Library: é gratuita, não exige chave e aceita chamadas direto
// do app (CORS). O Google Books sem chave respondeu "429 Too Many Requests"
// nos testes, então não é confiável para a demonstração.
// Com `lang=pt` a API devolve a edição em português de cada obra
// (ex.: "Harry Potter e a Pedra Filosofal"), com a capa dessa edição.
//
// Só o texto da busca é enviado; nenhum dado do usuário sai do aparelho.

export type BookResult = {
  key: string; // id da obra na Open Library
  title: string;
  author: string;
  pages: number | null;
  year: number | null;
  coverUrl: string | null; // capa média (para listas)
  inPortuguese: boolean;
};

const API = "https://openlibrary.org/search.json";
const FIELDS = [
  "key",
  "title",
  "author_name",
  "number_of_pages_median",
  "first_publish_year",
  "cover_i",
  "editions",
  "editions.title",
  "editions.cover_i",
  "editions.language",
].join(",");

const TIMEOUT_MS = 12000;

export const coverUrl = (coverId: number, size: "M" | "L" = "M") =>
  `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;

// Capa grande para a tela de detalhes (troca -M por -L nas capas da Open Library)
export const largeCover = (url: string | null) =>
  url && url.includes("covers.openlibrary.org") ? url.replace("-M.jpg", "-L.jpg") : url;

type ApiDoc = {
  key: string;
  title?: string;
  author_name?: string[];
  number_of_pages_median?: number;
  first_publish_year?: number;
  cover_i?: number;
  editions?: { docs?: { title?: string; cover_i?: number; language?: string[] }[] };
};

function toResult(doc: ApiDoc): BookResult | null {
  const edition = doc.editions?.docs?.[0];
  const title = edition?.title ?? doc.title;
  if (!title) return null;
  const cover = edition?.cover_i ?? doc.cover_i;
  return {
    key: doc.key,
    title,
    author: doc.author_name?.[0] ?? "",
    pages: doc.number_of_pages_median ?? null,
    year: doc.first_publish_year ?? null,
    coverUrl: cover ? coverUrl(cover) : null,
    inPortuguese: !!edition?.language?.includes("por"),
  };
}

async function request(q: string, limit: number): Promise<BookResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${API}?q=${encodeURIComponent(q)}&lang=pt&limit=${limit}&fields=${FIELDS}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { docs?: ApiDoc[] };
    return (json.docs ?? []).map(toResult).filter((r): r is BookResult => r !== null);
  } catch {
    throw new Error(
      "Não foi possível buscar agora. Verifique sua internet ou cadastre o livro manualmente.",
    );
  } finally {
    clearTimeout(timer);
  }
}

// Busca livre: edições em português aparecem primeiro, depois as com capa
export async function searchBooks(query: string): Promise<BookResult[]> {
  const results = await request(query.trim(), 30);
  return results.sort(
    (a, b) =>
      Number(b.inPortuguese) - Number(a.inPortuguese) ||
      Number(!!b.coverUrl) - Number(!!a.coverUrl),
  );
}

// Prateleiras de sugestões (só obras com edição em português e capa)
export const SHELVES = [
  { id: "fantasia", label: "Fantasia", icon: "flame-outline", query: "subject:fantasy" },
  { id: "autoajuda", label: "Autoajuda e hábitos", icon: "leaf-outline", query: 'subject:"self-help"' },
  { id: "romance", label: "Romance", icon: "heart-outline", query: "subject:romance" },
  { id: "classicos", label: "Literatura brasileira", icon: "flag-outline", query: 'subject:"brazilian literature"' },
  { id: "negocios", label: "Negócios e carreira", icon: "briefcase-outline", query: "subject:business" },
  { id: "ficcao", label: "Ficção científica", icon: "planet-outline", query: 'subject:"science fiction"' },
] as const;

const shelfCache = new Map<string, BookResult[]>();

export async function loadShelf(query: string): Promise<BookResult[]> {
  const cached = shelfCache.get(query);
  if (cached) return cached;
  const results = (await request(`${query} language:por`, 18)).filter(
    (r) => r.inPortuguese && r.coverUrl,
  );
  shelfCache.set(query, results);
  return results;
}
