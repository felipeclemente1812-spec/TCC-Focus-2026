// Catálogo de desafios do Focus.
// O usuário monta a rotina escolhendo daqui; metas próprias ficam em Hábitos e Metas próprias.
// Todo desafio vale CHALLENGE_XP (ver gamification.ts), diário ou semanal.

import type { IconName } from "@/constants/icons";

export type Frequency = "daily" | "weekly" | "monthly";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

export type CategoryId =
  | "estudos"
  | "leitura"
  | "saude"
  | "atividade"
  | "mente"
  | "produtividade"
  | "sono"
  | "casa"
  | "financas"
  | "social"
  | "digital"
  | "criatividade";

export type Category = {
  id: CategoryId;
  label: string;
  icon: IconName;
};

export type CatalogChallenge = {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  frequency: Frequency;
};

export const CATEGORIES: Category[] = [
  { id: "estudos", label: "Estudos", icon: "school-outline" },
  { id: "leitura", label: "Leitura", icon: "book-outline" },
  { id: "saude", label: "Saúde", icon: "water-outline" },
  { id: "atividade", label: "Atividade física", icon: "walk-outline" },
  { id: "mente", label: "Mente e bem-estar", icon: "leaf-outline" },
  { id: "produtividade", label: "Produtividade", icon: "checkmark-done-outline" },
  { id: "sono", label: "Sono", icon: "moon-outline" },
  { id: "casa", label: "Casa e organização", icon: "home-outline" },
  { id: "financas", label: "Finanças", icon: "wallet-outline" },
  { id: "social", label: "Social", icon: "people-outline" },
  { id: "digital", label: "Detox digital", icon: "phone-portrait-outline" },
  { id: "criatividade", label: "Criatividade", icon: "color-palette-outline" },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

export const CATALOG: CatalogChallenge[] = [
  // ESTUDOS
  { id: "est-1h", title: "Estudar 1 hora", description: "Uma hora de estudo concentrado em qualquer matéria.", category: "estudos", frequency: "daily" },
  { id: "est-revisar", title: "Revisar a aula do dia", description: "Releia as anotações da aula enquanto o conteúdo está fresco.", category: "estudos", frequency: "daily" },
  { id: "est-exercicios", title: "Resolver 10 exercícios", description: "Pratique com 10 questões ou exercícios da matéria.", category: "estudos", frequency: "daily" },
  { id: "est-flashcards", title: "Revisar flashcards", description: "Passe pelos seus flashcards para fixar o conteúdo.", category: "estudos", frequency: "daily" },
  { id: "est-resumo", title: "Fazer um resumo", description: "Escreva um resumo de um tema estudado.", category: "estudos", frequency: "daily" },
  { id: "est-idioma", title: "Praticar um idioma por 15 min", description: "Vocabulário, áudio ou conversa no idioma que você estuda.", category: "estudos", frequency: "daily" },
  { id: "est-simulado", title: "Fazer um simulado", description: "Teste seus conhecimentos com um simulado completo.", category: "estudos", frequency: "weekly" },
  { id: "est-revisao-semana", title: "Revisar o conteúdo da semana", description: "Junte tudo o que estudou na semana e revise.", category: "estudos", frequency: "weekly" },
  { id: "est-mapa", title: "Montar um mapa mental", description: "Organize um assunto em um mapa mental.", category: "estudos", frequency: "weekly" },
  { id: "est-video", title: "Assistir a uma videoaula", description: "Aprenda algo novo com uma videoaula completa.", category: "estudos", frequency: "weekly" },

  // LEITURA
  { id: "lei-20pg", title: "Ler 20 páginas", description: "Avance 20 páginas em um livro.", category: "leitura", frequency: "daily" },
  { id: "lei-15min", title: "Ler por 15 minutos", description: "Quinze minutos de leitura sem distrações.", category: "leitura", frequency: "daily" },
  { id: "lei-artigo", title: "Ler um artigo", description: "Leia um artigo ou reportagem sobre algo que te interessa.", category: "leitura", frequency: "daily" },
  { id: "lei-capitulo", title: "Terminar um capítulo", description: "Conclua um capítulo inteiro do livro atual.", category: "leitura", frequency: "weekly" },
  { id: "lei-anotar", title: "Anotar o que aprendeu na leitura", description: "Registre as ideias principais do que leu.", category: "leitura", frequency: "weekly" },

  // SAÚDE
  { id: "sau-agua", title: "Beber 2L de água", description: "Mantenha-se hidratado ao longo do dia.", category: "saude", frequency: "daily" },
  { id: "sau-fruta", title: "Comer uma fruta", description: "Inclua pelo menos uma fruta no seu dia.", category: "saude", frequency: "daily" },
  { id: "sau-salada", title: "Comer salada em uma refeição", description: "Coloque vegetais em pelo menos uma refeição.", category: "saude", frequency: "daily" },
  { id: "sau-acucar", title: "Evitar refrigerante", description: "Passe o dia sem refrigerante ou bebida açucarada.", category: "saude", frequency: "daily" },
  { id: "sau-postura", title: "Cuidar da postura", description: "Ajuste sua postura nas horas de estudo ou trabalho.", category: "saude", frequency: "daily" },
  { id: "sau-cafe", title: "Tomar um café da manhã honesto", description: "Comece o dia com uma refeição de verdade.", category: "saude", frequency: "daily" },
  { id: "sau-refeicoes", title: "Planejar as refeições da semana", description: "Defina o que vai comer nos próximos dias.", category: "saude", frequency: "weekly" },
  { id: "sau-cozinhar", title: "Cozinhar uma refeição saudável", description: "Prepare você mesmo uma refeição equilibrada.", category: "saude", frequency: "weekly" },

  // ATIVIDADE FÍSICA
  { id: "atv-alongar", title: "Fazer 5 min de alongamento", description: "Alongue o corpo para soltar a tensão.", category: "atividade", frequency: "daily" },
  { id: "atv-caminhar", title: "Caminhar 30 minutos", description: "Uma caminhada leve para movimentar o corpo.", category: "atividade", frequency: "daily" },
  { id: "atv-passos", title: "Dar 8.000 passos", description: "Bata a meta de passos do dia.", category: "atividade", frequency: "daily" },
  { id: "atv-escadas", title: "Usar a escada em vez do elevador", description: "Pequenas escolhas que somam movimento.", category: "atividade", frequency: "daily" },
  { id: "atv-treino", title: "Treinar 30 minutos", description: "Academia, funcional ou treino em casa.", category: "atividade", frequency: "daily" },
  { id: "atv-3treinos", title: "Treinar 3 vezes na semana", description: "Complete três treinos ao longo da semana.", category: "atividade", frequency: "weekly" },
  { id: "atv-esporte", title: "Praticar um esporte", description: "Futebol, vôlei, natação ou o esporte que preferir.", category: "atividade", frequency: "weekly" },
  { id: "atv-yoga", title: "Experimentar um treino novo", description: "Teste uma atividade diferente (dança, luta, natação…) e conte como foi.", category: "atividade", frequency: "weekly" },

  // MENTE E BEM-ESTAR
  { id: "men-meditar", title: "Meditar 10 minutos", description: "Dez minutos de atenção plena.", category: "mente", frequency: "daily" },
  { id: "men-respirar", title: "Fazer exercícios de respiração", description: "Respire fundo e desacelere por alguns minutos.", category: "mente", frequency: "daily" },
  { id: "men-gratidao", title: "Escrever 3 gratidões", description: "Anote três coisas boas do seu dia.", category: "mente", frequency: "daily" },
  { id: "men-diario", title: "Escrever no diário", description: "Registre como foi seu dia e como se sentiu.", category: "mente", frequency: "daily" },
  { id: "men-pausa", title: "Fazer uma pausa ao ar livre", description: "Saia um pouco e respire ar fresco.", category: "mente", frequency: "daily" },
  { id: "men-hobby", title: "Dedicar 1 hora aos seus hobbies", description: "Some 1 hora na semana com o que você gosta: música, natureza, jogos, arte…", category: "mente", frequency: "weekly" },
  { id: "men-reflexao", title: "Refletir sobre a semana", description: "O que deu certo e o que pode melhorar?", category: "mente", frequency: "weekly" },

  // PRODUTIVIDADE
  { id: "pro-3prioridades", title: "Concluir as 3 prioridades do dia", description: "Termine as três tarefas mais importantes.", category: "produtividade", frequency: "daily" },
  { id: "pro-email", title: "Zerar a caixa de entrada", description: "Responda ou organize todos os e-mails/mensagens.", category: "produtividade", frequency: "daily" },
  { id: "pro-sem-adiar", title: "Fazer a tarefa que está adiando", description: "Enfrente aquela pendência que vem empurrando.", category: "produtividade", frequency: "daily" },
  { id: "pro-planejar-semana", title: "Planejar a semana", description: "Preencha o quadro da semana: o que fazer em cada dia (manhã, tarde e noite).", category: "produtividade", frequency: "weekly" },
  { id: "pro-agenda", title: "Organizar a agenda", description: "Coloque na agenda as provas, prazos e compromissos dos próximos dias.", category: "produtividade", frequency: "weekly" },
  { id: "pro-meta", title: "Revisar suas metas", description: "Passe pelos cartões das suas metas e veja se está no caminho.", category: "produtividade", frequency: "weekly" },

  // SONO
  { id: "son-horario", title: "Dormir antes das 23h", description: "Vá para a cama em um horário saudável.", category: "sono", frequency: "daily" },
  { id: "son-8h", title: "Dormir 8 horas", description: "Garanta uma noite completa de descanso.", category: "sono", frequency: "daily" },
  { id: "son-tela", title: "Sem telas 30 min antes de dormir", description: "Desligue celular e computador antes de deitar.", category: "sono", frequency: "daily" },
  { id: "son-acordar", title: "Acordar no horário planejado", description: "Levante sem ficar adiando o despertador.", category: "sono", frequency: "daily" },
  { id: "son-rotina", title: "Manter o mesmo horário de sono", description: "Registre o sono em 5 dias da semana com até 1 hora de diferença no horário de dormir.", category: "sono", frequency: "weekly" },

  // CASA E ORGANIZAÇÃO
  { id: "cas-cama", title: "Arrumar a cama", description: "Comece o dia com o quarto em ordem.", category: "casa", frequency: "daily" },
  { id: "cas-mesa", title: "Organizar o quarto", description: "Um ambiente arrumado ajuda a focar.", category: "casa", frequency: "daily" },
  { id: "cas-louca", title: "Lavar a louça", description: "Não deixe a louça acumular.", category: "casa", frequency: "daily" },
  { id: "cas-faxina", title: "Limpar o quarto", description: "Uma faxina no seu espaço.", category: "casa", frequency: "weekly" },
  { id: "cas-roupas", title: "Organizar as roupas", description: "Lave, dobre e guarde as roupas da semana (com foto ou anotação).", category: "casa", frequency: "weekly" },

  // FINANÇAS
  { id: "fin-gastos", title: "Anotar os gastos do dia", description: "Registre tudo o que gastou hoje.", category: "financas", frequency: "daily" },
  { id: "fin-orcamento", title: "Revisar o orçamento", description: "Compare o que gastou com o que planejou.", category: "financas", frequency: "weekly" },
  { id: "fin-guardar", title: "Guardar um valor", description: "Separe uma quantia para a sua reserva.", category: "financas", frequency: "weekly" },
  { id: "fin-aprender", title: "Aprender algo sobre finanças", description: "Leia ou assista a um conteúdo de educação financeira.", category: "financas", frequency: "weekly" },

  // SOCIAL
  { id: "soc-mensagem", title: "Mandar mensagem para alguém querido", description: "Mantenha contato com quem é importante.", category: "social", frequency: "daily" },
  { id: "soc-elogio", title: "Fazer um elogio sincero", description: "Reconheça algo bom em alguém.", category: "social", frequency: "daily" },
  { id: "soc-familia", title: "Passar um tempo com a família", description: "Uma refeição ou conversa sem pressa.", category: "social", frequency: "weekly" },

  // DETOX DIGITAL
  { id: "dig-redes", title: "Ficar 2 horas longe das redes sociais", description: "Um bloco do dia sem rolar o feed.", category: "digital", frequency: "daily" },
  { id: "dig-refeicao", title: "Refeição sem celular", description: "Coma prestando atenção na refeição.", category: "digital", frequency: "daily" },
  { id: "dig-notificacoes", title: "Silenciar notificações ao estudar", description: "Ative o modo foco durante o estudo.", category: "digital", frequency: "daily" },
  { id: "dig-tempo", title: "Usar o celular menos de 3 horas", description: "Confira o tempo de tela no fim do dia.", category: "digital", frequency: "daily" },
  { id: "dig-limpar", title: "Limpar apps e fotos do celular", description: "Apague o que não usa e libere espaço.", category: "digital", frequency: "weekly" },

  // CRIATIVIDADE
  { id: "cri-desenhar", title: "Desenhar ou rabiscar 15 min", description: "Solte a criatividade no papel.", category: "criatividade", frequency: "daily" },
  { id: "cri-escrever", title: "Escrever um texto livre", description: "Uma página sobre qualquer tema.", category: "criatividade", frequency: "daily" },
  { id: "cri-musica", title: "Praticar um instrumento", description: "Toque ou estude música por 20 minutos.", category: "criatividade", frequency: "daily" },
  { id: "cri-projeto", title: "Avançar um projeto pessoal", description: "Dedique tempo a um projeto seu.", category: "criatividade", frequency: "weekly" },
  { id: "cri-novo", title: "Aprender uma habilidade nova", description: "Comece algo que nunca fez antes.", category: "criatividade", frequency: "weekly" },

  // MENSAIS (metas maiores, valem mais XP)
  { id: "mes-est-curso", title: "Concluir um curso online", description: "Cadastre o curso na Área de desenvolvimento pessoal, registre o progresso e conclua.", category: "estudos", frequency: "monthly" },
  { id: "mes-est-provas", title: "Revisar toda a matéria do mês", description: "Revise com as palavras-chave do que você estudou no mês e salve suas anotações.", category: "estudos", frequency: "monthly" },
  { id: "mes-lei-livro", title: "Ler um livro inteiro", description: "Conclui sozinho quando a Minha Estante tiver um livro terminado no mês.", category: "leitura", frequency: "monthly" },
  { id: "mes-lei-resenha", title: "Escrever uma resenha", description: "Escreva a resenha de um livro que você terminou. Pode deixar pública para os amigos.", category: "leitura", frequency: "monthly" },
  { id: "mes-lei-biblioteca", title: "Visitar uma biblioteca ou livraria", description: "Escolha lá o livro do mês: ele entra na sua estante para ler e terminar.", category: "leitura", frequency: "monthly" },
  { id: "mes-sau-checkup", title: "Beber água em 25 dias do mês", description: "Conta os dias em que você concluiu “Beber 2L de água”.", category: "saude", frequency: "monthly" },
  { id: "mes-sau-agua", title: "Comer fruta em 20 dias do mês", description: "Conta os dias em que você concluiu “Comer uma fruta”.", category: "saude", frequency: "monthly" },
  { id: "mes-atv-12treinos", title: "Bater a meta de treinos do mês", description: "Conta seus treinos do mês (meta padrão: 12, você pode aumentar).", category: "atividade", frequency: "monthly" },
  { id: "mes-atv-corrida", title: "Bater a meta de corrida do mês", description: "Registre cada corrida (km e tempo) e veja o relatório do mês.", category: "atividade", frequency: "monthly" },
  { id: "mes-men-meditar", title: "Meditar em 20 dias do mês", description: "Conta os dias em que você concluiu “Meditar 10 minutos” (dá para aumentar a meta).", category: "mente", frequency: "monthly" },
  { id: "mes-pro-metas", title: "Definir metas do próximo mês", description: "Crie pelo menos 3 cartões de meta para o mês que vem.", category: "produtividade", frequency: "monthly" },
  { id: "mes-pro-projeto", title: "Entregar um projeto", description: "Defina o projeto na Área de desenvolvimento pessoal, registre o progresso e marque como entregue.", category: "produtividade", frequency: "monthly" },
  { id: "mes-son-rotina", title: "Um mês com horário de sono regular", description: "20 noites registradas com até 1 hora de diferença no horário de dormir. Tem relatório do mês.", category: "sono", frequency: "monthly" },
  { id: "mes-cas-faxina", title: "Casa em dia no mês", description: "Conclua tarefas de casa (cama, quarto, louça) em 20 dias do mês.", category: "casa", frequency: "monthly" },
  { id: "mes-fin-meta", title: "Bater a meta de economia do mês", description: "Guarde o valor que você planejou.", category: "financas", frequency: "monthly" },
  { id: "mes-fin-planilha", title: "Fechar a planilha de gastos do mês", description: "Some e analise todos os gastos do mês.", category: "financas", frequency: "monthly" },
  { id: "mes-soc-encontro", title: "Organizar um encontro com amigos", description: "Marque o encontro num grupo: vira convite e entra na agenda de todos.", category: "social", frequency: "monthly" },
  { id: "mes-dig-detox", title: "20 dias com menos de 3h de celular", description: "Conta os dias em que você bateu “Usar o celular menos de 3 horas”.", category: "digital", frequency: "monthly" },
  { id: "mes-dig-redes", title: "15 dias com 2h longe das redes", description: "Conta os dias em que você completou “Ficar 2 horas longe das redes sociais”.", category: "digital", frequency: "monthly" },
  { id: "mes-cri-obra", title: "Terminar uma criação", description: "Registre o progresso com fotos, documentos ou anotações e conclua no fim do mês.", category: "criatividade", frequency: "monthly" },
  { id: "mes-cri-curso", title: "Aprender o básico de algo novo", description: "Escolha o que aprender e anote o progresso ao longo do mês.", category: "criatividade", frequency: "monthly" },
];

export const CATALOG_BY_ID = Object.fromEntries(
  CATALOG.map((c) => [c.id, c]),
) as Record<string, CatalogChallenge>;

// Rotina inicial sugerida (o usuário troca quando quiser)
export const DEFAULT_ROUTINE_IDS = [
  "atv-alongar",
  "sau-agua",
  "est-1h",
  "pro-planejar-semana",
  "est-revisao-semana",
  "mes-lei-livro",
];

// Busca sem acento e sem diferenciar maiúsculas
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
