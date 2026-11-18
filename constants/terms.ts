// Termos de Uso do Focus.
//
// >>> Para trocar o texto: edite TERMS_SECTIONS abaixo (título + parágrafos) e, ao
// >>> publicar uma versão nova, mude TERMS_VERSION. Quem aceitou uma versão anterior
// >>> vê a tela de aceite de novo no próximo acesso.

export const TERMS_VERSION = "2026-11-18"; // + plano grátis e Focus Premium
export const TERMS_UPDATED_AT = "14 de novembro de 2026";

export type TermsSection = { title: string; paragraphs: string[] };

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "1. Aceitação",
    paragraphs: [
      "Ao criar uma conta e usar o Focus, você declara que leu e concorda com estes Termos de Uso. Se não concordar, não utilize o aplicativo.",
    ],
  },
  {
    title: "2. O que é o Focus",
    paragraphs: [
      "O Focus é um aplicativo de organização pessoal e produtividade: rotina de desafios, hábitos, foco, estudos, finanças pessoais, leitura, grupos de amigos e conquistas.",
      "O XP, os níveis, as conquistas e os rankings são recursos de motivação dentro do app e não têm valor em dinheiro.",
    ],
  },
  {
    title: "3. Sua conta",
    paragraphs: [
      "Você é responsável pelas informações que cadastra e por manter sua senha em segurança. Use um e-mail e um nome de usuário (@) que sejam seus.",
      "Não é permitido criar contas em nome de outras pessoas nem usar a conta de terceiros.",
    ],
  },
  {
    title: "4. Conteúdo que você publica",
    paragraphs: [
      "Textos, fotos, documentos e outros arquivos que você envia (perfil, anexos, provas de tarefas, projetos e publicações) continuam sendo seus. Você nos autoriza apenas a armazená-los e exibi-los dentro do app, para as pessoas que você escolher.",
      "Não publique conteúdo ilegal, ofensivo, que invada a privacidade de outras pessoas ou que você não tenha o direito de compartilhar.",
    ],
  },
  {
    title: "5. Grupos e visibilidade",
    paragraphs: [
      "As publicações do mural, as provas das tarefas e as fotos de um grupo ficam visíveis para os membros desse grupo. Administradores podem criar tarefas, aprovar provas e remover membros.",
      "Seu perfil público mostra apenas o que você deixar visível nas configurações do perfil (estatísticas e livros).",
    ],
  },
  {
    title: "6. Privacidade e dados",
    paragraphs: [
      "Seus dados (perfil, rotina, hábitos, finanças, diário, estante e grupos) ficam guardados na sua conta, em servidores do Google Firebase, e só são acessados por você, exceto o que você compartilha em grupos ou no perfil público.",
      "Você pode editar suas informações a qualquer momento no Perfil.",
    ],
  },
  {
    title: "7. Uso adequado",
    paragraphs: [
      "É proibido tentar burlar o sistema de pontos, acessar dados de outras pessoas, interferir no funcionamento do app ou usá-lo para qualquer atividade ilícita.",
      "Contas que descumprirem estes termos podem ser suspensas ou removidas.",
    ],
  },
  {
    title: "8. Limitação de responsabilidade",
    paragraphs: [
      "O Focus é oferecido como está. As ferramentas de finanças, estudo e saúde são apoio à organização e não substituem orientação profissional.",
      "Faremos o possível para manter o app disponível, mas podem ocorrer instabilidades ou manutenções.",
    ],
  },
  {
    title: "9. Plano grátis e Focus Premium",
    paragraphs: [
      "O plano grátis inclui todas as funções com limites de uso (por exemplo: 10 ciclos de foco 50 / 10 por mês, 5 hábitos, 5 livros na estante e 1 grupo). Desafios diários, foco 25 / 5, XP, conquistas e ranking são livres. Os limites mensais renovam no dia 1.",
      "O Focus Premium tira os limites. A assinatura é mensal ou anual, cobrada pela loja do celular (Google Play ou App Store), e renova automaticamente até você cancelar nas configurações da loja. Ao cancelar, o Premium continua até o fim do período pago. Seus hábitos, nível e XP nunca são apagados ao mudar de plano.",
    ],
  },
  {
    title: "10. Mudanças nestes termos",
    paragraphs: [
      "Podemos atualizar estes Termos de Uso. Quando houver uma versão nova, o app pedirá o seu aceite novamente antes de continuar.",
    ],
  },
];
