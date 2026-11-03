import type { IconName } from "@/constants/icons";
// Finanças no Focus (funções trazidas do app Squill, do mesmo grupo):
// despesas e receitas por categoria, resumos e gráficos, cofrinhos (metas)
// e textos de educação financeira.

export type MoneyType = "expense" | "income";

export type MoneyCategory = { key: string; label: string; icon: IconName; color: string };

// Mesmas categorias do Squill, com cores que combinam com o roxo do Focus
export const EXPENSE_CATEGORIES: MoneyCategory[] = [
  { key: "house", label: "Casa", icon: "home-outline", color: "#8B5CF6" },
  { key: "car", label: "Mobilidade", icon: "bus-outline", color: "#6366F1" },
  { key: "fone", label: "Música / Streaming", icon: "headset-outline", color: "#A855F7" },
  { key: "food", label: "Comida (delivery)", icon: "fast-food-outline", color: "#EC4899" },
  { key: "shop", label: "Mercado", icon: "cart-outline", color: "#F472B6" },
  { key: "clothes", label: "Roupas", icon: "shirt-outline", color: "#C084FC" },
  { key: "health", label: "Saúde", icon: "medkit-outline", color: "#14B8A6" },
  { key: "game", label: "Jogos", icon: "game-controller-outline", color: "#3B82F6" },
  { key: "tech", label: "Tecnologia", icon: "laptop-outline", color: "#0EA5E9" },
  { key: "gym", label: "Academia", icon: "barbell-outline", color: "#F59E0B" },
  { key: "quest", label: "Outros", icon: "help-circle-outline", color: "#94A3B8" },
];

export const INCOME_CATEGORIES: MoneyCategory[] = [
  { key: "salario", label: "Salário", icon: "briefcase-outline", color: "#22C55E" },
  { key: "presente", label: "Presente", icon: "gift-outline", color: "#F472B6" },
  { key: "bonus", label: "Bônus", icon: "star-outline", color: "#EAB308" },
  { key: "other", label: "Outros", icon: "add-circle-outline", color: "#94A3B8" },
];

export const categoryOf = (type: MoneyType, key: string) => {
  const list = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return list.find((c) => c.key === key) ?? list[list.length - 1];
};

// Cores para escolher no cofrinho (no lugar das cores marrons do Squill)
export const GOAL_COLORS = ["#7C3AED", "#B832E5", "#5B21B6", "#15A638", "#0EA5E9", "#EC4899"];

// "1.234,56" / "12,5" / "12.50" -> número (null se inválido)
export function parseMoney(text: string): number | null {
  const clean = text.trim().replace(/\s|R\$/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return Math.round(n * 100) / 100;
}

// 1234.5 -> "R$ 1.234,50"
export function formatMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  return `${sign}R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec}`;
}

// Textos de educação financeira (vindos do Squill)
export type Article = {
  id: string;
  title: string;
  description: string;
  topics: { subtitle: string; content: string }[];
};

export const ARTICLES: Article[] = [
  {
    id: "juros",
    title: "Juros simples e compostos",
    description:
      "Os juros são a recompensa que você ganha ao investir seu dinheiro ou o custo que paga ao pegar um empréstimo. Existem dois tipos principais: simples e compostos.",
    topics: [
      {
        subtitle: "Juros simples",
        content:
          "Os juros são calculados só sobre o valor investido. Ex.: R$ 1.000 a 10% ao ano por 5 anos viram R$ 1.500 — R$ 100 por ano.",
      },
      {
        subtitle: "Juros compostos",
        content:
          "Os juros são calculados sobre o total acumulado, então o dinheiro cresce mais rápido. No mesmo exemplo, você teria R$ 1.610,51.",
      },
      {
        subtitle: "Por que importa",
        content:
          "A poupança usa juros compostos, com taxa menor. CDBs e Tesouro Direto também funcionam assim e podem render mais.",
      },
    ],
  },
  {
    id: "50-30-20",
    title: "A regra 50/30/20",
    description:
      "Uma forma prática de organizar o dinheiro, dividindo a renda líquida em três partes.",
    topics: [
      {
        subtitle: "50% para necessidades",
        content: "Moradia, contas fixas (água, luz, internet) e mercado. O ideal é não passar da metade da renda.",
      },
      {
        subtitle: "30% para desejos",
        content: "Lazer, restaurantes, roupas e eletrônicos. É a parte mais flexível: dá para ajustar quando precisar.",
      },
      {
        subtitle: "20% para poupar e pagar dívidas",
        content: "Reserva de emergência e investimentos. Pague primeiro as dívidas com juros altos.",
      },
    ],
  },
  {
    id: "poupar",
    title: "A importância de poupar e investir",
    description:
      "Poupar cria uma reserva para imprevistos; investir faz esse dinheiro render e proteger contra a inflação.",
    topics: [
      { subtitle: "Fundo de emergência", content: "Guarde o equivalente a 3 a 6 meses das suas despesas." },
      { subtitle: "Quite dívidas", content: "Economizar ajuda a pagar dívidas, principalmente as de juros altos." },
      { subtitle: "Comece a investir", content: "Com dinheiro guardado, você pode investir e fazer o dinheiro render mais." },
      { subtitle: "Poupe para seus sonhos", content: "Um carro, uma viagem, a faculdade: objetivos claros motivam a economizar." },
    ],
  },
  {
    id: "orcamento",
    title: "Como fazer um orçamento pessoal",
    description: "Seis passos para começar a controlar o seu dinheiro.",
    topics: [
      { subtitle: "1. Objetivo", content: "Saiba por que está fazendo (poupar, pagar dívidas)." },
      { subtitle: "2. Ferramenta", content: "Escolha onde registrar — aqui no Focus, por exemplo." },
      { subtitle: "3. Receitas", content: "Anote toda a sua renda líquida." },
      { subtitle: "4. Gastos", content: "Registre e separe por categoria (fixos, variáveis, pequenos gastos)." },
      { subtitle: "5. Análise", content: "Compare receitas e despesas. Identifique e corte excessos." },
      { subtitle: "6. Acompanhamento", content: "Atualize sempre para manter o controle no longo prazo." },
    ],
  },
];
