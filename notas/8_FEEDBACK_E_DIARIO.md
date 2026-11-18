# 8 — Feedback do grupo + Diário

Só front-end; o Firebase não foi alterado. Tudo é salvo no aparelho, por usuário.

## Feedback do grupo

| Pedido | O que mudou | Onde |
|---|---|---|
| Não tinha como inserir o dinheiro guardado | Campo **Guardar** (escolhe o cofrinho e digita o valor) na tarefa "Guardar um valor" e em Grupo › Ranking › "Quem mais guardou". Se ainda não houver cofrinho, ele é criado ali mesmo. | `components/FinanceWidgets.tsx` (QuickSave) |
| Faltavam gráficos | Resumo: **Receitas x despesas (6 meses)**. Cofrinhos: **quanto guardou por mês** + divisão entre os cofrinhos. Tarefas de finanças: gráfico de gastos da semana. Grupo: barra de quanto cada um guardou. | `FinanceWidgets.tsx`, `finance.tsx`, `task.tsx`, `group.tsx` |
| "Área de desenvolvimento pessoal", poder apagar, layout diferente por categoria | Tela renomeada. Cada categoria (Curso, Projeto, Criação, Aprender algo novo) tem cor, ícone, texto de topo e campos próprios; em "Todos", os itens aparecem separados por categoria. Lixeira visível em cada cartão e em cada anotação do diário de progresso. | `app/(tabs)/projects.tsx` |
| Faltava espaço entre alguns cartões | Espaço acertado em Foco, Progresso, Grupo e Meus grupos. | estilos dessas telas |
| Foto nos grupos | O ADM toca na foto do grupo para trocar ou remover. A foto também aparece na lista de grupos. | `group.tsx`, `groups.tsx`, `groupsService` (`photo`) |

## Diário (telas da Angela)

- Telas da Angela trazidas para o Focus, com o mesmo visual de caderno (marrom, papel com linhas, 4 cores de papel), em português:
  - `app/(tabs)/diary.tsx`: a lista.
  - `app/(tabs)/diary-entry.tsx`: nova, editar e ler numa rota só.
- Os dados ficam em `context/DiaryContext.tsx`, no lugar dos `TODO(DADOS)` do original. O ponto de troca está marcado com `TODO Firebase: users/{uid}/diario/{id}`.
- **"Escrever no diário" agora tem tela própria.** Ela mostra se você já escreveu hoje, um atalho para escrever e as últimas anotações.
- **XP:**
  - Uma anotação de hoje com 30 letras ou mais conclui a tarefa (+100 XP, uma vez por dia).
  - Texto mais curto é salvo, mas não vale XP.
- **Apagar:** pede confirmação na telinha padrão do app.
- **Atalho:** "Diário" entrou no menu de Desafios.

## Identidade do app e revisão para celular

- **Nome:** o app se chama **Focus** em todos os lugares: nome, slug, scheme `focus://`, título da aba no navegador e `package.json`. Antes era "baseapp".
- **Ícones e splash:** a pasta `assets/images` não existia no ZIP. Criei:
  - `icon.png` (1024);
  - os três ícones adaptativos do Android: frente, fundo e monocromático;
  - `splash-icon.png`;
  - `favicon.png`.
  
  O desenho é um alvo de "foco" branco com o centro lilás, no degradê roxo do app. A splash e o ícone adaptativo usam o fundo `#43247D`.
- **Teclado:**
  - Nas abas, a tela sobe quando o teclado abre, e a barra flutuante some enquanto ele está aberto, para não cobrir o campo.
  - Toque fora fecha o teclado sem perder o clique (`keyboardShouldPersistTaps`), e arrastar a tela também fecha (`keyboardDismissMode`). Isso vale para todas as listas e rolagens.
  - No login e no cadastro, o comportamento é igual no Android e no iOS. O cadastro passa de um campo para o outro com "próximo", e a senha envia com "ir".
- **Telas pequenas:** testei a 320 px de largura (o menor celular comum) e no tablet (768 px). Nenhuma tela vaza para os lados. Corrigi o que aparecia cortado:
  - nomes das tarefas, atalhos do menu e a estante do perfil quebram em 2 linhas em vez de cortar;
  - as abas de Finanças e do Grupo ficam do tamanho do texto;
  - títulos longos (como "Área de desenvolvimento pessoal") usam fonte um pouco menor.
- **Botões:** todos têm área de toque de pelo menos 30 px. Os ícones pequenos (voltar, lixeira) têm uma margem extra de toque (`hitSlop`).
- **Limite honesto:** teclado, sensores e notificações só se confirmam num celular de verdade. Testei no navegador, simulando tamanhos de tela.

## Logo oficial e diário no visual do app

- **Logo:** o logo oficial do grupo (símbolo amarelo no fundo roxo `#633EA8`) foi recortado da imagem enviada.
  - Agora é o ícone do app, o ícone adaptativo do Android, a splash e o favicon.
  - O logo completo (símbolo + "Focus") aparece no topo do Login e do Cadastro.
  - Os arquivos ficam em `assets/images` (`logo-focus.png` e `logo-simbolo.png`).
- **Diário:** saiu o caderno marrom e entrou o visual do Focus (fundo roxo e cartões escuros).
  - Cada anotação tem uma cor de destaque da paleta do app.
  - A lista mostra uma prévia do texto e se "Escrever no diário" já foi concluído hoje.
- **Fonte e tamanho da letra:** dá para escolher entre 3 fontes (Padrão, Clássica e Máquina de escrever) e 4 tamanhos (P, M, G e GG).
  - Ficam salvos em cada anotação.
  - Uma anotação nova começa com a fonte e o tamanho da última.
- **Integração com a tarefa (continua):** uma anotação de hoje com 30 letras ou mais conclui "Escrever no diário" (+100 XP, uma vez por dia). A tela da tarefa mostra o status e as últimas anotações.

## Rodada Figma do Lucas + lista do grupo (12/11/2026)

- **Barra de abas**: Início · Foco · Desafios (Minha rotina) · Grupos · Perfil. Conquistas, Progresso e Histórico de XP continuam no Perfil.
- **Início com no máximo 6 blocos**: bem-vindo + XP (com sequência e XP da semana), ciclo de foco, hábitos de hoje, desafios (abas Diários/Semanais/Mensais num bloco só), 6 atalhos (Diário, Agenda, Desenvolvimento pessoal, Minha Estante, Finanças, Lembretes) e ranking.
- **Diário no estilo do Figma**: papel amarelo, azul, rosa ou verde; o fundo da tela segue a cor. Folha pautada, data no topo, "Salvar anotação". Fonte e tamanho da letra continuam. Segue concluindo "Escrever no diário".
- **Desenvolvimento pessoal**: saíram "Criação" e "Aprender algo novo". Em Projeto há as abas Todos / Criações / Outros, e ao criar um projeto dá para marcar "É uma criação". O que já existia foi convertido (criação → projeto-criação, aprender → curso).
- **Semanal com comprovante**: agora só conclui com foto ou documento anexado (texto é opcional).
- **Teclado numérico** padronizado: horário do hábito e prazo das pendências ganharam teclado de números e formato automático (os outros campos de data/hora já tinham).
- **Logo**: mantido como estava (congelado).

## Logo, foto nos grupos e hábitos (12/11/2026)

- **Logo do Focus em mais lugares** (`components/FocusLogo.tsx`): telas de carregamento (abertura do app e dados salvos), topo do Início, plano inicial (onboarding), fim do Perfil ("Evoluindo um pouco a cada dia") e aviso de LEVEL UP (símbolo no lugar do foguete). Login e Cadastro já tinham.
- **Tarefas do grupo pedem foto**: tocar no quadrado abre "Tirar foto" (câmera do celular; no navegador abre a câmera/arquivo). Só envia com a foto; comentário é opcional. A foto aparece embaixo da tarefa para o grupo ver e, na regra "Foto + um ADM aprova", o ADM vê a foto antes de aprovar. Permissão de câmera adicionada no app.json.
- **Criar hábito**: tirei o bloco "Metas próprias" da aba Hábitos (fica só o cadastro de hábitos).

## Prova da tarefa do grupo e qualidade das fotos (12/11/2026)

- **Ao criar a tarefa do grupo, o ADM escolhe a prova**: "Contar o que fez" (só texto, 15+ letras), "Foto como prova" ou "Foto + um ADM aprova". O que cada um contou aparece embaixo da tarefa; as fotos aparecem em miniatura.
- **Fotos com mais qualidade** (menos as de perfil): provas, anexos, desenhos e projetos agora são salvos em qualidade máxima no celular (`PHOTO_QUALITY` em utils/files.ts; no navegador 85% para não estourar o armazenamento).
- **Ver a foto em tela cheia** (`components/PhotoViewer.tsx`): tocar em qualquer foto de prova, anexo, desenho ou projeto abre a foto inteira, sem corte, em fundo preto (no celular dá para dar zoom). Miniaturas ficaram maiores.

## Junção com a versão do backend (13/11/2026)

Esta pasta é a versão do backend (Firestore: dados do usuário, perfil, @, perfil público e grupos em tempo real) **com todas as mudanças de tela das rodadas acima**. O backend não foi alterado; nos grupos só entraram os campos novos da prova.

**Para quem cuida do backend:**
- `GroupCompletion` ganhou `photo?` (foto da prova) e `hasPhoto?` (a prova foi com foto). `TaskRule` ganhou `"texto"` ("Contar o que fez"). Tarefas antigas com `"livre"` agora pedem foto.
- **Foto da prova (TODO Firebase Storage):** hoje a foto só é gravada no grupo quando é link `http` ou caminho curto do celular; foto em base64 (navegador) não é gravada, para não passar do limite de 1 MB do documento. Por isso os outros membros veem "foto enviada" no lugar da foto. Para todos verem, enviar a foto para o Storage em `GroupsContext.completeTask` e guardar a URL em `photo`.
- A **foto do grupo** (`group.photo`) tem o mesmo cuidado pendente: no navegador ela vem em base64.

## Focus Premium — plano de assinatura (17/11/2026)

Monetização com plano de assinatura, seguindo as telas do Figma. **Só front-end: a compra é simulada (nada é cobrado) e os valores são fictícios.**

**O que é grátis e o que é Premium**

| Grátis | Premium |
|---|---|
| Desafios diários, hábitos, ciclo de foco 25/5, XP, conquistas e perfil | Desafios semanais e mensais |
| | Foco profundo 50/10 |
| | Grupos, tarefas compartilhadas e ranking |
| | Diário, Agenda, Desenvolvimento pessoal, Minha Estante, Finanças e Lembretes |

**Telas novas:** `app/(tabs)/premium.tsx` (Focus Premium → Escolha seu plano → Confirmar assinatura → Premium ativado; e Restaurar compras) e `app/(tabs)/terms.tsx` (Termos de Uso, aberto pelo Perfil).

**Onde aparece:** cartão "Conheça o Focus Premium" no Início (some quando assina); atalhos com "· Premium"; abas Semanais/Mensais com 🔒 no Início e na Minha rotina; desafios semanais/mensais com 🔒 no catálogo; "50 / 10 · Premium" no foco; telas bloqueadas (ex.: Meus grupos) com "Conhecer o Focus Premium" e "Continuar no plano grátis"; no Perfil, o cartão da assinatura, "Termos de Uso" e "Voltar ao plano grátis (demonstração)" para a apresentação.

**Planos:** Mensal R$ 14,90 · Anual R$ 119,90 (≈ R$ 9,99/mês). Ao mudar de plano, hábitos, nível e XP são preservados (nada é apagado).

**Código:** `context/PremiumContext.tsx` (estado da assinatura, salvo na conta em `users/{uid}/data/premium` pelo mesmo `loadJSON/saveJSON`) e `components/PremiumGate.tsx` (bloqueio, selo e atalho para o Premium).

**Para quem cuida do backend (TODO):** compra real pela loja do celular (Google Play / App Store, ex.: RevenueCat ou expo-iap) e confirmação da assinatura no servidor; hoje qualquer um pode "assinar" no app. As regras do Firestore também deveriam checar o Premium antes de liberar grupos.

## Premium com limites de uso no plano grátis (18/11/2026)

O grupo pediu para não ser tão restrito: no lugar de bloquear telas inteiras, o plano grátis agora usa **limites de uso** (freemium). Lógica usada, a partir de boas práticas de freemium (cotas que mostram o valor antes de cobrar, contador sempre visível, convite ao Premium só quando a cota acaba e sem bloquear o que já é grátis):

| Recurso | Plano grátis | Premium |
|---|---|---|
| Desafios diários, foco 25/5, XP, conquistas, ranking | livre | livre |
| Ciclos de foco 50/10 | 10 por mês | sem limite |
| Desafios semanais / mensais na rotina | 2 / 1 | até 6 / 4 |
| Hábitos | 5 | até 10 |
| Diário | 1 anotação por dia (cobre "Escrever no diário") | sem limite |
| Minha Estante | 5 livros | sem limite |
| Desenvolvimento pessoal | 2 cursos/projetos em andamento | sem limite |
| Agenda | 10 compromissos criados por mês | sem limite |
| Finanças | 50 lançamentos por mês · 1 cofrinho | sem limite |
| Lembretes | 3 desafios com lembrete | sem limite |
| Grupos | 1 grupo | até o máximo do app |

- Cotas mensais renovam no dia 1; as de quantidade valem enquanto o item existir. Nada é apagado ao bater o limite.
- Os valores ficam em um lugar só: `FREE_LIMITS` em `context/PremiumContext.tsx` (fácil de ajustar).
- Cada tela mostra um contador ("3 de 10 · no Premium é sem limite"); ao acabar, ele fica amarelo e leva ao Premium (`UsageMeter` em `components/PremiumGate.tsx`).
- A tela do Premium ganhou a tabela **Grátis x Premium**.
- As regras ficam nos Contexts (criar livro, projeto, compromisso, lançamento, cofrinho, hábito, grupo, desafio, lembrete, anotação), então valem em qualquer tela.

**Ajuste (18/11):** o contador agora destaca **quanto ainda resta** (caixa amarela "7 restam" + "3 de 10 usados este mês · plano grátis"). Voltou o cartão "Conheça o Focus Premium" no topo do Início, agora com "Seu plano grátis · ainda restam" (Foco 50/10, Hábitos, Livros, Grupos), e os atalhos voltaram a mostrar "· Premium" com "restam X" embaixo.
