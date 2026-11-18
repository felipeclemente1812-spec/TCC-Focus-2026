import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useContext, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { FocusLogo } from "@/components/FocusLogo";
import { ScreenShell } from "@/components/ScreenShell";
import { FREE_LIMITS, PlanId, PLANS, PremiumContext } from "@/context/PremiumContext";

// Focus Premium (Figma): apresentação -> escolha do plano -> confirmar
// assinatura -> premium ativado; e "restaurar compras".
//   /premium                      -> apresentação
//   /premium?step=planos          -> escolha do plano
//   /premium?step=confirmar&plan= -> confirmar
//   /premium?step=ativado         -> premium ativado
//   /premium?step=restaurar       -> restaurar compras
// A compra é simulada (valores fictícios para a apresentação do projeto).
type Step = "intro" | "planos" | "confirmar" | "ativado" | "restaurar";

const YELLOW = "#FBBF24";

const BENEFITS = [
  { title: "Sua rotina completa", text: "Desafios diários, semanais e mensais, com os devidos hábitos e XP, sem limite." },
  { title: "Todas as ferramentas", text: "Minha Estante, finanças, agenda, desenvolvimento pessoal, diário e lembretes sem limite." },
  { title: "Evolua junto com seus amigos", text: "Vários grupos, tarefas compartilhadas e ranking entre amigos." },
];

// Grátis x Premium (deixar a diferença clara ajuda a decidir)
const COMPARE: { label: string; free: string }[] = [
  { label: "Ciclos de foco 50 / 10", free: `${FREE_LIMITS.focoProfundoMes} por mês` },
  { label: "Desafios semanais / mensais", free: `${FREE_LIMITS.semanais} / ${FREE_LIMITS.mensais}` },
  { label: "Hábitos", free: `${FREE_LIMITS.habitos}` },
  { label: "Diário", free: `${FREE_LIMITS.diarioDia} anotação por dia` },
  { label: "Livros na estante", free: `${FREE_LIMITS.livros}` },
  { label: "Cursos e projetos", free: `${FREE_LIMITS.projetos} em andamento` },
  { label: "Agenda", free: `${FREE_LIMITS.agendaMes} compromissos por mês` },
  { label: "Finanças", free: `${FREE_LIMITS.lancamentosMes} lançamentos/mês · ${FREE_LIMITS.cofrinhos} cofrinho` },
  { label: "Lembretes", free: `${FREE_LIMITS.lembretes} desafios` },
  { label: "Grupos", free: `${FREE_LIMITS.grupos} grupo` },
];

const TITLES: Record<Step, string> = {
  intro: "Focus Premium",
  planos: "Escolha seu plano",
  confirmar: "Confirmar assinatura",
  ativado: "Premium ativado",
  restaurar: "Restaurar compras",
};

export default function Premium() {
  const params = useLocalSearchParams<{ step?: string; plan?: string }>();
  const premium = useContext(PremiumContext);
  const step: Step = (["planos", "confirmar", "ativado", "restaurar"] as const).includes(params.step as never)
    ? (params.step as Step)
    : "intro";
  const [choice, setChoice] = useState<PlanId>(params.plan === "mensal" ? "mensal" : "anual");
  const [restoreTried, setRestoreTried] = useState(false);

  if (!premium) return null;
  const go = (next: Step, plan?: PlanId) => router.push({ pathname: "/premium", params: { step: next, plan: plan ?? "" } });
  const confirmPlan: PlanId = params.plan === "mensal" ? "mensal" : "anual";
  const sub = premium.subscription;

  const Header = (
    <View style={styles.brand}>
      <FocusLogo size={170} />
      <Ionicons
        name={step === "ativado" ? "checkmark-circle-outline" : "diamond-outline"}
        size={step === "ativado" ? 52 : 44}
        color={YELLOW}
        style={{ marginTop: 14 }}
      />
    </View>
  );

  const Card = ({ title, text, active, onPress }: { title: string; text: string; active?: boolean; onPress?: () => void }) => {
    const body = (
      <>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </>
    );
    return onPress ? (
      <TouchableOpacity
        style={[styles.card, active && styles.cardActive]}
        onPress={onPress}
        accessibilityRole="radio"
        aria-checked={!!active}
      >
        {body}
      </TouchableOpacity>
    ) : (
      <View style={styles.card}>{body}</View>
    );
  };

  const YellowButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.yellowButton} onPress={onPress} accessibilityRole="button">
      <Text style={styles.yellowText}>{label}</Text>
    </TouchableOpacity>
  );

  const Link = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.link} accessibilityRole="button">
      <Text style={styles.linkText}>{label}</Text>
    </TouchableOpacity>
  );

  // ---------- APRESENTAÇÃO ----------
  if (step === "intro") {
    return (
      <ScreenShell title={TITLES.intro}>
        {Header}
        {sub ? (
          <View style={[styles.card, styles.cardActive]}>
            <Text style={styles.cardTitle}>Você já é Premium ✨</Text>
            <Text style={styles.cardText}>
              Plano {PLANS[sub.plan].label.toLowerCase()} · renova em {new Date(sub.renewsAt).toLocaleDateString("pt-BR")}.
            </Text>
          </View>
        ) : null}
        {BENEFITS.map((b) => (
          <Card key={b.title} title={b.title} text={b.text} />
        ))}
        {/* GRÁTIS x PREMIUM */}
        <View style={styles.card}>
          <View style={styles.compareRow}>
            <Text style={[styles.compareLabel, styles.compareHead]}>Recurso</Text>
            <Text style={[styles.compareFree, styles.compareHead]}>Grátis</Text>
            <Text style={[styles.comparePremium, styles.compareHead]}>Premium</Text>
          </View>
          {COMPARE.map((c) => (
            <View key={c.label} style={styles.compareRow}>
              <Text style={styles.compareLabel}>{c.label}</Text>
              <Text style={styles.compareFree}>{c.free}</Text>
              <Text style={styles.comparePremium}>Sem limite</Text>
            </View>
          ))}
          <Text style={[styles.cardText, { marginTop: 8 }]}>
            Desafios diários, foco 25 / 5, XP, conquistas e ranking continuam livres no plano grátis.
          </Text>
        </View>
        {sub ? (
          <YellowButton label="Voltar ao início" onPress={() => router.replace("/challenges")} />
        ) : (
          <>
            <YellowButton label="Ver planos Premium" onPress={() => go("planos")} />
            <Link label="Continuar no plano grátis" onPress={() => (router.canGoBack() ? router.back() : router.replace("/challenges"))} />
            <Link label="Restaurar compras" onPress={() => go("restaurar")} />
          </>
        )}
      </ScreenShell>
    );
  }

  // ---------- ESCOLHA DO PLANO ----------
  if (step === "planos") {
    return (
      <ScreenShell title={TITLES.planos}>
        {Header}
        <Card title="Mensal" text={PLANS.mensal.detail} active={choice === "mensal"} onPress={() => setChoice("mensal")} />
        <Card title="Anual • melhor valor" text={PLANS.anual.detail} active={choice === "anual"} onPress={() => setChoice("anual")} />
        <Card title="Você tem o controle" text="Cancele a renovação nas configurações da loja." />
        <YellowButton label={`Continuar com o ${choice}`} onPress={() => go("confirmar", choice)} />
        <Text style={styles.footnote}>Valores fictícios para apresentação do projeto.</Text>
      </ScreenShell>
    );
  }

  // ---------- CONFIRMAR ----------
  if (step === "confirmar") {
    const plan = PLANS[confirmPlan];
    return (
      <ScreenShell title={TITLES.confirmar}>
        {Header}
        <Card
          title={`Focus Premium • ${plan.label}`}
          text={confirmPlan === "anual" ? "Todos os recursos por 12 meses." : "Todos os recursos por 1 mês."}
        />
        <Card title="Total hoje" text={`${plan.price}. Renovação automática ${confirmPlan === "anual" ? "anual" : "mensal"}.`} />
        <Card title="Pagamento pela loja do celular" text="Confirme a forma de pagamento na sua conta da loja." />
        <Text style={styles.footnote}>
          Cancele antes da próxima renovação, se quiser; você continua com os recursos até o fim do período pago.
        </Text>
        <YellowButton
          label={`Assinar por ${plan.price} / ${plan.per}`}
          onPress={() => {
            premium.subscribe(confirmPlan);
            router.replace({ pathname: "/premium", params: { step: "ativado" } });
          }}
        />
      </ScreenShell>
    );
  }

  // ---------- PREMIUM ATIVADO ----------
  if (step === "ativado") {
    return (
      <ScreenShell title={TITLES.ativado}>
        {Header}
        <Card
          title="Seu Focus está completo"
          text="Seus hábitos, nível e XP foram preservados. Todas as ferramentas estão liberadas."
        />
        <TouchableOpacity style={styles.purpleButton} onPress={() => router.replace("/challenges")} accessibilityRole="button">
          <Text style={styles.purpleText}>Voltar ao início</Text>
        </TouchableOpacity>
      </ScreenShell>
    );
  }

  // ---------- RESTAURAR COMPRAS ----------
  const found = sub;
  return (
    <ScreenShell title={TITLES.restaurar}>
      {Header}
      {found ? (
        <>
          <Card
            title="Assinatura encontrada"
            text={`Plano ${PLANS[found.plan].label.toLowerCase()} ativo até ${new Date(found.renewsAt).toLocaleDateString("pt-BR")}.`}
          />
          <YellowButton label="Voltar ao início" onPress={() => router.replace("/challenges")} />
        </>
      ) : restoreTried ? (
        <>
          <Card title="Nenhuma assinatura encontrada" text="Confira se você está usando a mesma conta da compra." />
          <YellowButton label="Ver planos" onPress={() => go("planos")} />
        </>
      ) : (
        <>
          <Card title="Já assinou antes?" text="Procuramos uma assinatura ativa nesta conta e liberamos o Premium de novo." />
          <YellowButton
            label="Procurar minha assinatura"
            onPress={() => {
              premium.restore();
              setRestoreTried(true);
            }}
          />
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", marginTop: 4, marginBottom: 18 },
  card: {
    backgroundColor: "rgba(20,10,40,0.55)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardActive: { borderColor: YELLOW },
  cardTitle: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  cardText: { color: "#DDD6FE", fontSize: 13, marginTop: 4, lineHeight: 18 },
  yellowButton: {
    backgroundColor: YELLOW,
    borderRadius: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  yellowText: { color: "#2B1A00", fontSize: 15, fontWeight: "800" },
  purpleButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  purpleText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  compareHead: { color: "#FFF", fontWeight: "700" },
  compareLabel: { color: "#FFF", fontSize: 12, flex: 1.3 },
  compareFree: { color: "#DDD6FE", fontSize: 12, flex: 1.2 },
  comparePremium: { color: "#FBBF24", fontSize: 12, fontWeight: "700", flex: 0.8, textAlign: "right" },
  link: { alignItems: "center", paddingVertical: 12 },
  linkText: { color: "#DDD6FE", fontSize: 13 },
  footnote: { color: "#C7BADB", fontSize: 12, marginTop: 6, marginBottom: 6, lineHeight: 17 },
});
