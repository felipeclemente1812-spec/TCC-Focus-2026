// Regras de gamificação do Focus, num só lugar.
// Telas e contexts importam daqui para não divergirem.

import type { Frequency } from "@/constants/challenges";
import type { IconName } from "@/constants/icons";

export const XP_PER_LEVEL = 500;

export type Completion = {
  id: string; // id da tarefa/exercício + período (ex.: "ch-1@2026-10-23")
  xp: number;
  at: number; // timestamp (ms)
  title?: string; // nome exibido no histórico
};

// XP proporcional ao esforço: quanto mais longo o período, mais vale
export const XP_BY_FREQUENCY: Record<Frequency, number> = {
  daily: 100,
  weekly: 300,
  monthly: 1000,
};

// Valor de referência (desafio diário, exercício)
export const CHALLENGE_XP = XP_BY_FREQUENCY.daily;

// Bônus por fechar o ciclo inteiro = o valor de um desafio daquele período
export const CYCLE_BONUS = XP_BY_FREQUENCY;

// Ciclo de foco (Pomodoro): proporcional à duração, 25 min = 100 XP
export const FOCUS_BASE_MINUTES = 25;
export function focusXp(minutes: number) {
  return Math.round((CHALLENGE_XP * minutes) / FOCUS_BASE_MINUTES);
}
export const FOCUS_DAILY_XP_CAP = 400; // ex.: 4 focos de 25 min ou 2 de 50 min
export const FOCUS_SESSIONS_PER_SET = 4; // depois de 4, pausa longa

// Chave do dia local, ex.: "2026-10-23"
export function dayKey(date: Date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Chave da semana: data da segunda-feira, ex.: "S2026-10-19"
export function weekKey(date: Date = new Date()) {
  const monday = new Date(date);
  const offset = (monday.getDay() + 6) % 7; // segunda = 0
  monday.setDate(monday.getDate() - offset);
  return `S${dayKey(monday)}`;
}

// Tarefas e exercícios podem ser concluídos uma vez por dia
export function dailyId(baseId: string, date: Date = new Date()) {
  return `${baseId}@${dayKey(date)}`;
}

export function weeklyId(baseId: string, date: Date = new Date()) {
  return `${baseId}@${weekKey(date)}`;
}

// Chave do mês, ex.: "M2026-10"
export function monthKey(date: Date = new Date()) {
  return `M${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthlyId(baseId: string, date: Date = new Date()) {
  return `${baseId}@${monthKey(date)}`;
}

// Id da conclusão no período atual (dia, semana ou mês)
export function periodIdFor(baseId: string, frequency: Frequency, date = new Date()) {
  if (frequency === "daily") return dailyId(baseId, date);
  if (frequency === "weekly") return weeklyId(baseId, date);
  return monthlyId(baseId, date);
}

// Dias restantes até o fim da semana (domingo), contando hoje
export function daysLeftInWeek(date: Date = new Date()) {
  return 7 - ((date.getDay() + 6) % 7);
}

// Dias restantes até o fim do mês, contando hoje
export function daysLeftInMonth(date: Date = new Date()) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return last - date.getDate() + 1;
}

// Texto de quando o ciclo reinicia
export function resetHint(frequency: Frequency) {
  if (frequency === "daily") return "Reinicia à meia-noite";
  const days = frequency === "weekly" ? daysLeftInWeek() : daysLeftInMonth();
  return `Reinicia em ${days} ${days === 1 ? "dia" : "dias"}`;
}

// XP total necessário para chegar ao nível (nível 1 = 0 XP)
export function xpForLevel(level: number) {
  return (level - 1) * XP_PER_LEVEL;
}

export function levelInfo(xp: number) {
  const xpInLevel = xp % XP_PER_LEVEL;
  return {
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    xpInLevel,
    xpToNext: XP_PER_LEVEL - xpInLevel,
    progress: (xpInLevel / XP_PER_LEVEL) * 100,
  };
}

// ---------- Hábitos, pontualidade e leitura (regras aprovadas) ----------

// Hábito criado pela pessoa não tem verificação do app: vale METADE do desafio diário
export const HABIT_XP = 50; // por dia programado concluído
export const PUNCTUALITY_BONUS = 10; // concluir dentro da janela do horário
export const PUNCTUALITY_WINDOW_MIN = 15; // 15 min antes ou depois
export const READING_GOAL_XP = 50; // bater a meta de páginas do dia (1x/dia)
export const BOOK_DONE_XP = 200; // concluir um livro com leitura registrada (1x/livro)

// ---------- Categorias do XP (para o histórico) ----------
// Cada conclusão tem um id com prefixo que diz de onde veio o XP.

export type XpCategory =
  | "desafio"
  | "habito"
  | "pontualidade"
  | "foco"
  | "grupo"
  | "leitura"
  | "ciclo"
  | "exercicio";

export const XP_CATEGORY_INFO: Record<XpCategory, { label: string; icon: IconName }> = {
  desafio: { label: "Desafios", icon: "locate-outline" },
  habito: { label: "Hábitos", icon: "calendar-outline" },
  pontualidade: { label: "Pontualidade", icon: "alarm-outline" },
  foco: { label: "Foco", icon: "stopwatch-outline" },
  grupo: { label: "Grupos", icon: "people-outline" },
  leitura: { label: "Leitura", icon: "book-outline" },
  ciclo: { label: "Bônus de ciclo", icon: "sparkles-outline" },
  exercicio: { label: "Exercícios (antigos)", icon: "barbell-outline" },
};

export function xpCategory(id: string): XpCategory {
  if (id.startsWith("hab-")) return "habito";
  if (id.startsWith("pont-")) return "pontualidade";
  if (id.startsWith("focus-")) return "foco";
  if (id.startsWith("grp-")) return "grupo";
  if (id.startsWith("leit-") || id.startsWith("livro-")) return "leitura";
  if (id.startsWith("ciclo-")) return "ciclo";
  if (id.startsWith("ex-")) return "exercicio";
  return "desafio";
}

// "Desafio" = do catálogo, de grupo ou exercício (bônus, foco, hábito e leitura à parte)
export function isChallengeCompletion(id: string) {
  const c = xpCategory(id);
  return c === "desafio" || c === "grupo" || c === "exercicio";
}

// ---------- Níveis com título (a fórmula de 500 XP/nível não muda) ----------

export const LEVEL_TITLES = [
  { level: 1, title: "Iniciante", description: "Todo grande hábito começa com o primeiro passo." },
  { level: 3, title: "Aprendiz", description: "Você está descobrindo o que funciona na sua rotina." },
  { level: 5, title: "Determinado", description: "Sua dedicação já aparece nos resultados." },
  { level: 8, title: "Focado", description: "Você mantém a atenção no que importa." },
  { level: 10, title: "Comprometido", description: "Você está demonstrando consistência na construção dos seus hábitos." },
  { level: 15, title: "Consistente", description: "Sua rotina virou parte de quem você é." },
  { level: 20, title: "Disciplinado", description: "Você cumpre o que planeja, mesmo nos dias difíceis." },
  { level: 30, title: "Mestre dos Hábitos", description: "Seus hábitos trabalham a seu favor." },
  { level: 50, title: "Lendário", description: "Uma referência de constância e evolução." },
];

export function levelTitle(level: number) {
  return [...LEVEL_TITLES].reverse().find((t) => level >= t.level) ?? LEVEL_TITLES[0];
}

export function nextLevelTitle(level: number) {
  return LEVEL_TITLES.find((t) => t.level > level) ?? null;
}

// ---------- Estatísticas (calculadas só a partir das conclusões reais) ----------

export type GamificationStats = {
  xp: number;
  completedCount: number; // desafios (catálogo, grupo, exercício)
  activeDays: number; // dias distintos com alguma conclusão
  streakDays: number; // dias seguidos até hoje (ou ontem)
  bestStreak: number; // maior sequência de todos os tempos
  previousBestStreak: number; // maior sequência ANTES da atual
  activeToday: boolean; // já concluiu algo hoje (a sequência está garantida)
  weeklyXp: number; // XP da semana atual (de segunda até agora)
  habitCompletions: number;
  punctualCount: number;
  readingGoalDays: number; // dias em que a meta de leitura foi batida
  booksDone: number; // livros concluídos com leitura registrada
  groupTasks: number; // tarefas de grupo concluídas
  weekCategories: number; // categorias de atividade diferentes nesta semana
};

const ACTIVITY_CATEGORIES: XpCategory[] = ["desafio", "habito", "foco", "grupo", "leitura"];

export function computeStats(completions: Completion[], now = new Date()): GamificationStats {
  const days = new Set(completions.map((c) => dayKey(new Date(c.at))));

  // Sequência: conta a partir de hoje; se hoje ainda não tem conclusão,
  // a sequência de ontem continua valendo
  let streakDays = 0;
  const activeToday = days.has(dayKey(now));
  const cursor = new Date(now);
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }
  // `cursor` parou no dia antes do início da sequência atual
  const currentStart = new Date(cursor);
  currentStart.setDate(currentStart.getDate() + 1);

  // Maior sequência (geral e anterior à atual), percorrendo os dias em ordem
  const sorted = [...days].sort();
  let bestStreak = 0;
  let previousBestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = new Date(`${key}T12:00:00`);
    const consecutive = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1;
    run = consecutive ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    if (key < dayKey(currentStart)) previousBestStreak = Math.max(previousBestStreak, run);
    prev = d;
  }

  // "XP da semana" = semana atual (segunda 00:00 até agora), igual ao título do card
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const thisWeek = completions.filter((c) => c.at >= monday.getTime());

  const count = (cat: XpCategory) => completions.filter((c) => xpCategory(c.id) === cat).length;

  return {
    xp: completions.reduce((sum, c) => sum + c.xp, 0),
    completedCount: completions.filter((c) => isChallengeCompletion(c.id)).length,
    activeDays: days.size,
    streakDays,
    bestStreak,
    previousBestStreak,
    activeToday,
    weeklyXp: thisWeek.reduce((sum, c) => sum + c.xp, 0),
    habitCompletions: count("habito"),
    punctualCount: count("pontualidade"),
    readingGoalDays: completions.filter((c) => c.id.startsWith("leit-meta@")).length,
    booksDone: completions.filter((c) => c.id.startsWith("livro-")).length,
    groupTasks: count("grupo"),
    weekCategories: new Set(
      thisWeek.map((c) => xpCategory(c.id)).filter((c) => ACTIVITY_CATEGORIES.includes(c)),
    ).size,
  };
}

// Estatísticas + dados que vêm de outros contextos (hábitos)
export type AchievementStats = GamificationStats & {
  habitStreak: number; // dias PROGRAMADOS seguidos com todos os hábitos feitos
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  // Mensagem de reconhecimento ao desbloquear
  message?: string;
  // Sem `check`: depende de recurso que ainda não existe
  check?: (stats: AchievementStats) => boolean;
  // Progresso para mostrar a barra (atual / meta)
  progress?: (stats: AchievementStats) => { current: number; target: number };
  pendingReason?: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "primeiros-passos",
    title: "Primeiros passos",
    description: "Complete seu primeiro desafio.",
    icon: "ribbon-outline",
    message: "Todo grande hábito começa com o primeiro passo.",
    check: (s) => s.completedCount >= 1,
    progress: (s) => ({ current: s.completedCount, target: 1 }),
  },
  {
    id: "foco-diario",
    title: "Foco diário",
    description: "Complete atividades em 5 dias diferentes.",
    icon: "flame-outline",
    check: (s) => s.activeDays >= 5,
    progress: (s) => ({ current: s.activeDays, target: 5 }),
  },
  {
    id: "sequencia-7",
    title: "Sequência de 7 dias",
    description: "Mantenha uma sequência por 7 dias.",
    icon: "flame-outline",
    message: "Uma semana inteira sem parar. Isso é constância!",
    check: (s) => s.streakDays >= 7,
    progress: (s) => ({ current: s.streakDays, target: 7 }),
  },
  {
    id: "mestre-do-foco",
    title: "Mestre do foco",
    description: "Alcance 2.500 XP.",
    icon: "trophy-outline",
    check: (s) => s.xp >= 2500,
    progress: (s) => ({ current: s.xp, target: 2500 }),
  },
  {
    id: "desafio-social",
    title: "Desafio social",
    description: "Complete uma tarefa de um grupo de amigos.",
    icon: "people-outline",
    message: "Evoluir junto com os amigos é mais divertido.",
    check: (s) => s.groupTasks >= 1,
    progress: (s) => ({ current: s.groupTasks, target: 1 }),
  },
  {
    id: "super-focado",
    title: "Super focado",
    description: "Complete 50 desafios.",
    icon: "star-outline",
    check: (s) => s.completedCount >= 50,
    progress: (s) => ({ current: s.completedCount, target: 50 }),
  },
  // Novas (comportamentos concretos)
  {
    id: "constancia-de-ferro",
    title: "Constância de Ferro",
    description: "Cumpra todos os hábitos em 14 dias programados seguidos.",
    icon: "shield-checkmark-outline",
    message: "Seu planejamento está se transformando em ação.",
    check: (s) => s.habitStreak >= 14,
    progress: (s) => ({ current: s.habitStreak, target: 14 }),
  },
  {
    id: "pontualidade-exemplar",
    title: "Pontualidade Exemplar",
    description: "Conclua 10 atividades dentro do horário planejado.",
    icon: "alarm-outline",
    message: "Você cumpre o que planeja, na hora que planejou.",
    check: (s) => s.punctualCount >= 10,
    progress: (s) => ({ current: s.punctualCount, target: 10 }),
  },
  {
    id: "leitor-dedicado",
    title: "Leitor Dedicado",
    description: "Alcance a meta de leitura em 7 dias diferentes.",
    icon: "library-outline",
    message: "A leitura está se tornando parte da sua rotina.",
    check: (s) => s.readingGoalDays >= 7,
    progress: (s) => ({ current: s.readingGoalDays, target: 7 }),
  },
  {
    id: "multidisciplinar",
    title: "Multidisciplinar",
    description: "Faça atividades de 3 categorias diferentes na mesma semana.",
    icon: "extension-puzzle-outline",
    message: "Você está construindo consistência em diferentes atividades.",
    check: (s) => s.weekCategories >= 3,
    progress: (s) => ({ current: s.weekCategories, target: 3 }),
  },
  {
    id: "superacao-pessoal",
    title: "Superação Pessoal",
    description: "Supere sua melhor sequência anterior (de pelo menos 3 dias).",
    icon: "rocket-outline",
    message: "Você superou sua melhor sequência anterior.",
    check: (s) => s.previousBestStreak >= 3 && s.streakDays > s.previousBestStreak,
    progress: (s) => ({
      current: s.streakDays,
      target: Math.max(s.previousBestStreak + 1, 4),
    }),
  },
  {
    id: "primeiro-livro",
    title: "Primeiro Livro",
    description: "Conclua um livro registrando sua leitura.",
    icon: "bookmarks-outline",
    message: "Um livro inteiro! A leitura está valendo a pena.",
    check: (s) => s.booksDone >= 1,
    progress: (s) => ({ current: s.booksDone, target: 1 }),
  },
];

// O ranking agora é por grupo de amigos: ver services/groupsService.ts
