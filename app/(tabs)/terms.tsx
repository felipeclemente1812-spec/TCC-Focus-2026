import { StyleSheet, Text, View } from "react-native";

import { ScreenShell, ui } from "@/components/ScreenShell";

// Termos de Uso (aberto pelo Perfil). Texto para a apresentação do TCC:
// revisar com o grupo/orientador antes de publicar o app de verdade.
const SECTIONS = [
  {
    title: "1. Sobre o Focus",
    text: "O Focus é um app de rotina e produtividade com desafios, hábitos, ciclo de foco e XP. Ao criar uma conta, você concorda com estes termos.",
  },
  {
    title: "2. Sua conta",
    text: "Você é responsável pelos dados da sua conta e pelo que publica (postagens, provas das tarefas de grupo e fotos). Não publique conteúdo de outras pessoas sem permissão.",
  },
  {
    title: "3. Plano grátis e Focus Premium",
    text: "O plano grátis inclui todas as funções com limites de uso (por exemplo: 10 ciclos de foco 50 / 10 por mês, 5 hábitos, 5 livros na estante e 1 grupo). Desafios diários, foco 25 / 5, XP, conquistas e ranking são livres. O Focus Premium tira os limites. Os limites mensais renovam no dia 1 de cada mês.",
  },
  {
    title: "4. Assinatura e cobrança",
    text: "A assinatura é mensal ou anual e é cobrada pela loja do celular (Google Play ou App Store), que renova automaticamente até você cancelar nas configurações da loja. Ao cancelar, o Premium continua até o fim do período pago. Seus hábitos, nível e XP nunca são apagados ao mudar de plano.",
  },
  {
    title: "5. Privacidade",
    text: "Seu diário, finanças e anotações são privados. Os amigos só veem o que você deixar público no perfil (nível, conquistas e, se quiser, seus livros).",
  },
  {
    title: "6. Contato",
    text: "Dúvidas, sugestões ou pedidos sobre seus dados: fale com a equipe do Focus pelo canal do projeto.",
  },
];

export default function Terms() {
  return (
    <ScreenShell title="Termos de Uso">
      {SECTIONS.map((s) => (
        <View key={s.title} style={ui.card}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.text}>{s.text}</Text>
        </View>
      ))}
      <Text style={styles.footnote}>Versão de apresentação do projeto (TCC). Valores e condições fictícios.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  text: { color: "#DDD6FE", fontSize: 13, lineHeight: 19, marginTop: 6 },
  footnote: { color: "#C7BADB", fontSize: 12, textAlign: "center", marginTop: 4 },
});
