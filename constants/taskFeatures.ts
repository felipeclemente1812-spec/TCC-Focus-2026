// O que cada desafio do catálogo tem além do checkbox (lista do grupo,
// "feedback projeto.txt"). A tela /task monta os blocos a partir daqui.
// Todo desafio tem lembrete; "auto" = o app conclui sozinho pelo critério.

export type TaskModule =
  | { kind: "timer"; minutes: number; label: string; auto: true }
  | { kind: "books"; mode: "pages"; pages: number; auto: true }
  | { kind: "books"; mode: "minutes"; minutes: number; auto: true }
  | { kind: "journal"; titleLabel?: string; placeholder: string }
  | { kind: "gratitude"; count: number; auto: true }
  | { kind: "summary" }
  | { kind: "flashcards"; minCards: number; auto: true }
  | { kind: "people"; verb: string }
  | { kind: "todo3"; auto: true }
  | { kind: "backlog" }
  | { kind: "sleep"; mode: "bedtime" | "duration" | "wake" | "screens" | "bed" }
  | { kind: "metric"; label: string; unit: string; goal: number; atMost: boolean; auto: true }
  | { kind: "focusMode" }
  | { kind: "alarm" }
  | { kind: "steps"; goal: number; auto: true }
  | { kind: "attachments"; accept: "image" | "document" }
  | { kind: "finance"; tab: "resumo" | "lancamentos" | "cofrinhos" | "aprender"; auto?: true }
  | { kind: "planner"; view: PlannerView; auto: true }
  | { kind: "diary"; auto: true }
  | { kind: "soon"; text: string };

// Blocos das semanais/mensais com verificação (context/PlannerContext.tsx)
export type PlannerView =
  | { type: "simulado" }
  | { type: "weekReview" }
  | { type: "mindmap"; scope: "week" | "month" }
  | { type: "videos" }
  | { type: "chapter" }
  | { type: "bookNote" }
  | { type: "bookMonth" }
  | { type: "review" }
  | { type: "library" }
  | { type: "meals" }
  | { type: "training" }
  | { type: "trainingMonth" }
  | { type: "hobbies" }
  | { type: "weekPlan" }
  | { type: "agenda" }
  | { type: "goalCards"; nextMonth: boolean }
  | { type: "sleepCompare"; scope: "week" | "month" }
  | { type: "dayCount" }
  | { type: "runs" }
  | { type: "projects"; kind: "curso" | "projeto" | "criacao" | "any" } // criacao = projetos marcados como criação
  | { type: "meetup" }
  | { type: "proof" };

const planner = (reminder: string, ...views: PlannerView[]): TaskFeature => ({
  reminder,
  modules: views.map((view) => ({ kind: "planner", view, auto: true }) as const),
});

export type TaskFeature = {
  // Horário sugerido do lembrete (a pessoa troca); "sleep" calcula pelo sono
  reminder: string | "sleep";
  modules: TaskModule[];
};

const simple = (reminder: string): TaskFeature => ({ reminder, modules: [] });

export const TASK_FEATURES: Record<string, TaskFeature> = {
  // ESTUDOS
  "est-1h": { reminder: "14:00", modules: [{ kind: "timer", minutes: 60, label: "Estudando", auto: true }] },
  "est-revisar": simple("19:00"),
  "est-exercicios": simple("16:00"),
  "est-flashcards": { reminder: "20:00", modules: [{ kind: "flashcards", minCards: 5, auto: true }] },
  "est-resumo": { reminder: "18:00", modules: [{ kind: "summary" }] },
  "est-idioma": { reminder: "12:30", modules: [{ kind: "timer", minutes: 15, label: "Praticando idioma", auto: true }] },

  // LEITURA
  "lei-20pg": { reminder: "21:00", modules: [{ kind: "books", mode: "pages", pages: 20, auto: true }] },
  "lei-15min": { reminder: "21:00", modules: [{ kind: "books", mode: "minutes", minutes: 15, auto: true }] },
  "lei-artigo": {
    reminder: "12:00",
    modules: [{ kind: "journal", titleLabel: "Título ou link do artigo", placeholder: "O que você achou importante?" }],
  },

  // SAÚDE
  "sau-agua": simple("10:00"),
  "sau-fruta": simple("15:00"),
  "sau-salada": simple("12:00"),
  "sau-acucar": simple("12:00"),
  "sau-postura": simple("11:00"),
  "sau-cafe": simple("07:30"),

  // ATIVIDADE FÍSICA
  "atv-alongar": simple("08:00"),
  "atv-caminhar": {
    reminder: "18:00",
    modules: [
      { kind: "timer", minutes: 30, label: "Caminhando", auto: true },
      { kind: "steps", goal: 3000, auto: true },
    ],
  },
  "atv-passos": {
    reminder: "20:00",
    modules: [
      { kind: "steps", goal: 8000, auto: true },
      { kind: "metric", label: "Ou digite os passos de hoje (app de saúde do celular)", unit: "passos", goal: 8000, atMost: false, auto: true },
    ],
  },
  "atv-escadas": simple("09:00"),
  "atv-treino": simple("18:00"),

  // MENTE E BEM-ESTAR
  "men-meditar": {
    reminder: "07:00",
    modules: [{ kind: "focusMode" }, { kind: "timer", minutes: 10, label: "Meditando", auto: true }],
  },
  "men-respirar": simple("15:00"),
  "men-gratidao": { reminder: "22:00", modules: [{ kind: "gratitude", count: 3, auto: true }] },
  "men-diario": {
    reminder: "22:00",
    modules: [{ kind: "diary", auto: true }],
  },
  "men-pausa": simple("16:00"),

  // PRODUTIVIDADE
  "pro-3prioridades": { reminder: "08:00", modules: [{ kind: "todo3", auto: true }] },
  "pro-email": simple("09:00"),
  "pro-sem-adiar": { reminder: "10:00", modules: [{ kind: "backlog" }] },

  // SONO (horários vêm de "Meu sono", configurado uma vez)
  "son-horario": { reminder: "sleep", modules: [{ kind: "sleep", mode: "bedtime" }] },
  "son-8h": { reminder: "sleep", modules: [{ kind: "sleep", mode: "duration" }] },
  "son-tela": { reminder: "sleep", modules: [{ kind: "sleep", mode: "screens" }] },
  "son-acordar": {
    reminder: "sleep",
    modules: [
      { kind: "sleep", mode: "wake" },
      { kind: "alarm" },
    ],
  },

  // CASA
  "cas-cama": { reminder: "sleep", modules: [{ kind: "sleep", mode: "bed" }] },
  "cas-mesa": simple("19:00"),
  "cas-louca": simple("20:30"),

  // FINANÇAS
  // Funções do Squill (tela Minhas finanças)
  "fin-gastos": { reminder: "21:30", modules: [{ kind: "finance", tab: "lancamentos", auto: true }] },
  "fin-orcamento": { reminder: "10:00", modules: [{ kind: "finance", tab: "resumo", auto: true }] },
  "fin-guardar": { reminder: "10:00", modules: [{ kind: "finance", tab: "cofrinhos", auto: true }] },
  "fin-aprender": { reminder: "19:00", modules: [{ kind: "finance", tab: "aprender", auto: true }] },
  "mes-fin-meta": { reminder: "10:00", modules: [{ kind: "finance", tab: "cofrinhos", auto: true }] },
  "mes-fin-planilha": { reminder: "10:00", modules: [{ kind: "finance", tab: "resumo", auto: true }] },

  // SOCIAL
  "soc-mensagem": { reminder: "19:00", modules: [{ kind: "people", verb: "Mandei mensagem para" }] },
  "soc-elogio": { reminder: "13:00", modules: [{ kind: "people", verb: "Elogiei" }] },

  // DETOX DIGITAL
  "dig-redes": { reminder: "14:00", modules: [{ kind: "timer", minutes: 120, label: "Longe das redes", auto: true }] },
  "dig-refeicao": simple("12:00"),
  "dig-notificacoes": { reminder: "14:00", modules: [{ kind: "focusMode" }] },
  "dig-tempo": {
    reminder: "21:00",
    modules: [
      { kind: "metric", label: "Tempo de tela de hoje (veja em Bem-estar digital / Tempo de Uso)", unit: "h", goal: 3, atMost: true, auto: true },
    ],
  },

  // CRIATIVIDADE
  "cri-desenhar": { reminder: "17:00", modules: [{ kind: "attachments", accept: "image" }] },
  "cri-escrever": {
    reminder: "20:00",
    modules: [
      { kind: "journal", titleLabel: "Título (opcional)", placeholder: "Escreva seu texto aqui…" },
      { kind: "attachments", accept: "document" },
    ],
  },
  "cri-musica": simple("18:30"),

  // SEMANAIS — sem checkbox solto: concluem pelo registro (relatório do grupo)
  "est-simulado": planner("09:00", { type: "simulado" }),
  "est-revisao-semana": planner("10:00", { type: "weekReview" }),
  "est-mapa": planner("10:00", { type: "mindmap", scope: "week" }),
  "est-video": planner("19:00", { type: "videos" }),
  "lei-capitulo": planner("21:00", { type: "chapter" }),
  "lei-anotar": planner("21:00", { type: "bookNote" }),
  "sau-refeicoes": planner("10:00", { type: "meals" }),
  "sau-cozinhar": planner("11:00", { type: "proof" }),
  "atv-3treinos": planner("18:00", { type: "training" }),
  "atv-esporte": planner("18:00", { type: "proof" }),
  "atv-yoga": planner("18:00", { type: "proof" }),
  "men-hobby": planner("17:00", { type: "hobbies" }),
  "men-reflexao": {
    reminder: "20:00",
    modules: [{ kind: "journal", titleLabel: "Título (opcional)", placeholder: "O que deu certo? O que pode melhorar?" }],
  },
  "pro-planejar-semana": planner("09:00", { type: "weekPlan" }),
  "pro-agenda": planner("09:00", { type: "agenda" }),
  "pro-meta": planner("09:00", { type: "goalCards", nextMonth: false }),
  "son-rotina": { reminder: "sleep", modules: [{ kind: "sleep", mode: "duration" }, { kind: "planner", view: { type: "sleepCompare", scope: "week" }, auto: true }] },
  "cas-faxina": planner("10:00", { type: "proof" }),
  "cas-roupas": planner("10:00", { type: "proof" }),
  "soc-familia": planner("19:00", { type: "proof" }),
  "dig-limpar": planner("19:00", { type: "proof" }),
  "cri-projeto": planner("17:00", { type: "projects", kind: "any" }),
  "cri-novo": planner("17:00", { type: "projects", kind: "curso" }),

  // MENSAIS — concluem só com progresso real
  "mes-est-curso": planner("10:00", { type: "projects", kind: "curso" }),
  "mes-est-provas": planner("10:00", { type: "mindmap", scope: "month" }),
  "mes-lei-livro": planner("21:00", { type: "bookMonth" }),
  "mes-lei-resenha": planner("21:00", { type: "review" }),
  "mes-lei-biblioteca": planner("10:00", { type: "library" }),
  "mes-sau-checkup": planner("10:00", { type: "dayCount" }),
  "mes-sau-agua": planner("10:00", { type: "dayCount" }),
  "mes-atv-12treinos": planner("18:00", { type: "trainingMonth" }),
  "mes-atv-corrida": planner("18:00", { type: "runs" }),
  "mes-men-meditar": planner("07:00", { type: "dayCount" }),
  "mes-pro-metas": planner("10:00", { type: "goalCards", nextMonth: true }),
  "mes-pro-projeto": planner("10:00", { type: "projects", kind: "projeto" }),
  "mes-son-rotina": { reminder: "sleep", modules: [{ kind: "sleep", mode: "duration" }, { kind: "planner", view: { type: "sleepCompare", scope: "month" }, auto: true }] },
  "mes-cas-faxina": planner("10:00", { type: "dayCount" }),
  "mes-soc-encontro": planner("19:00", { type: "meetup" }),
  "mes-dig-detox": planner("21:00", { type: "dayCount" }),
  "mes-dig-redes": planner("21:00", { type: "dayCount" }),
  "mes-cri-obra": planner("17:00", { type: "projects", kind: "criacao" }),
  "mes-cri-curso": planner("17:00", { type: "projects", kind: "curso" }),
};

export const featureOf = (catalogId: string): TaskFeature =>
  TASK_FEATURES[catalogId] ?? simple("09:00");

// Desafio concluído pelo critério (não pelo checkbox)
export const isAutoTask = (catalogId: string) =>
  featureOf(catalogId).modules.some((m) => "auto" in m && m.auto);

// Semanais e mensais nunca têm "Marcar como feito" solto (anti-farm de XP):
// concluem pelo registro/verificação da própria tela
export const needsProof = (catalogId: string, frequency: string) => frequency !== "daily" && !!catalogId;

// Blocos com coisas salvas que dá para abrir e editar depois de feito
export const EDITABLE_KINDS: TaskModule["kind"][] = ["journal", "gratitude", "summary", "flashcards"];

export const isEditableTask = (catalogId: string) =>
  featureOf(catalogId).modules.some((m) => EDITABLE_KINDS.includes(m.kind));

// Desafio que tem tela própria (algo além do lembrete)
export const hasDetail = (catalogId: string) =>
  featureOf(catalogId).modules.length > 0;
