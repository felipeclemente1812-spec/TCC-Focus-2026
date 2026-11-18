import React, { createContext, ReactNode, useEffect, useState } from "react";

import { loadJSON, saveJSON } from "@/utils/localStore";

// Focus Premium (plano de assinatura para monetizar o app) — SÓ O FRONT-END.
// A compra é simulada: nada é cobrado. O estado fica na conta do usuário
// (mesmo armazenamento dos outros dados: users/{uid}/data/premium).
// TODO pagamento real: compra pela loja do celular (Google Play / App Store,
// ex.: RevenueCat ou expo-iap) e confirmação da assinatura no backend.

export type PlanId = "mensal" | "anual";

export const PLANS: Record<PlanId, { label: string; price: string; per: string; detail: string; months: number }> = {
  mensal: { label: "Mensal", price: "R$ 14,90", per: "mês", detail: "R$ 14,90 por mês. Renovação mensal.", months: 1 },
  anual: {
    label: "Anual",
    price: "R$ 119,90",
    per: "ano",
    detail: "R$ 119,90 por ano. Equivale a R$ 9,99 por mês.",
    months: 12,
  },
};

// Plano grátis com LIMITE DE USO (freemium): tudo pode ser experimentado, e o
// Premium tira os limites. Lógica usada (boas práticas de freemium):
//   - o essencial da rotina fica livre (desafios diários, hábitos, foco 25/5, XP);
//   - cada ferramenta tem uma cota que dá para sentir o valor (ex.: 10 ciclos
//     de foco profundo por mês), com o contador sempre visível ("3 de 10");
//   - cotas por mês renovam no dia 1; as de quantidade valem enquanto o item existir;
//   - o convite ao Premium aparece no momento em que a cota acaba, sem apagar nada.
export const FREE_LIMITS = {
  focoProfundoMes: 10, // ciclos 50/10 por mês
  semanais: 2, // desafios semanais na rotina
  mensais: 1, // desafios mensais na rotina
  habitos: 5,
  diarioDia: 1, // anotações por dia (cobre "Escrever no diário")
  livros: 5, // livros na estante
  projetos: 2, // cursos/projetos em andamento
  agendaMes: 10, // compromissos criados no mês
  lancamentosMes: 50, // lançamentos de finanças no mês
  cofrinhos: 1,
  lembretes: 3, // desafios com lembrete ligado
  grupos: 1,
} as const;

export type LimitKey = keyof typeof FREE_LIMITS;

// Mensagem padrão de limite atingido (as telas mostram junto o botão do Premium)
export const limitReached = (what: string) => `${what} Assine o Focus Premium para usar sem limite.`;

// Resumo do que o Premium libera (telas e Termos de Uso)
export const PREMIUM_FEATURES = {
  tools: "Minha Estante, finanças, agenda, desenvolvimento pessoal, diário e lembretes sem limite",
  routine: "Mais desafios semanais e mensais na rotina",
  groups: "Vários grupos com amigos",
  focus: "Ciclo de foco profundo (50 / 10 min) sem limite",
};

type Subscription = {
  plan: PlanId;
  since: number;
  renewsAt: number;
};

type Saved = { active: Subscription | null; last: Subscription | null };

type PremiumContextType = {
  ready: boolean;
  isPremium: boolean;
  subscription: Subscription | null;
  subscribe: (plan: PlanId) => void;
  // "Restaurar compras": devolve a assinatura desta conta, se houver
  restore: () => Subscription | null;
  // Só para a apresentação: volta ao plano grátis
  cancelDemo: () => void;
};

const key = (uid: string) => `focus:v1:${uid}:premium`;
const isSaved = (v: unknown): v is Saved => !!v && typeof v === "object" && "active" in v;
const EMPTY: Saved = { active: null, last: null };

export const PremiumContext = createContext<PremiumContextType | null>(null);

export function PremiumProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [data, setData] = useState<Saved>(EMPTY);
  const [ready, setReady] = useState(!uid);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    loadJSON(key(uid), isSaved).then((saved) => {
      if (!active) return;
      if (saved) setData(saved);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !ready) return;
    saveJSON(key(uid), data);
  }, [uid, ready, data]);

  // Assinatura vencida volta ao plano grátis (a renovação real é da loja)
  const current = data.active && data.active.renewsAt > Date.now() ? data.active : null;

  const subscribe = (plan: PlanId) => {
    const since = Date.now();
    const renewsAt = new Date(since);
    renewsAt.setMonth(renewsAt.getMonth() + PLANS[plan].months);
    const sub = { plan, since, renewsAt: renewsAt.getTime() };
    setData({ active: sub, last: sub });
  };

  const restore = () => {
    if (current) return current;
    if (data.last && data.last.renewsAt > Date.now()) {
      setData((d) => ({ ...d, active: d.last }));
      return data.last;
    }
    return null;
  };

  const cancelDemo = () => setData({ active: null, last: null });

  return (
    <PremiumContext.Provider
      value={{ ready, isPremium: !!current, subscription: current, subscribe, restore, cancelDemo }}
    >
      {children}
    </PremiumContext.Provider>
  );
}
