// Frases dos lembretes gerais. Semanais e mensais não tocam uma a uma na
// barra de notificações: em vez disso chega um "reveja seus objetivos".

export const WEEKLY_PHRASES = [
  "Reveja seus objetivos da semana: o que dá para adiantar hoje?",
  "Uma olhada rápida nas metas da semana mantém você no rumo.",
  "Sua semana no Focus te espera. Bora conferir o que falta?",
  "Pequenos passos todo dia fecham a semana. Confira suas metas!",
  "Que tal planejar os próximos dias? Abra o Focus e ajuste suas tarefas.",
];

export const MONTHLY_START_PHRASES = [
  "Mês novo, metas novas! Reveja seus objetivos do mês.",
  "Começou o mês: escolha o que você quer conquistar até o fim dele.",
];

export const MONTHLY_MID_PHRASES = [
  "Já passou da metade do mês. Como estão suas metas?",
  "Faltam alguns dias para fechar o mês. Confira o que ainda dá tempo de fazer.",
];

export const MORNING_PHRASES = [
  "Bom dia! Hoje você tem",
  "Seu dia no Focus:",
  "Partiu! Para hoje:",
];

// Escolha estável no dia (não muda a cada abertura no mesmo dia)
export function pickPhrase(list: string[], seed = new Date()) {
  const n = seed.getFullYear() * 400 + seed.getMonth() * 31 + seed.getDate();
  return list[n % list.length];
}
