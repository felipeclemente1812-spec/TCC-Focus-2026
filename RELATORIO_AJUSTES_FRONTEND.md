# Relatório — ajustes de frontend

> Para uma leitura mais rápida, veja a pasta `notas/` (mudanças explicadas, como executar e resumo).

## Etapa 11 — Busca de livros com capas (24/10/2026)

- **Fonte escolhida: Open Library** (`services/bookSearch.ts`). Testes reais: gratuita, sem chave, funciona no navegador (CORS) e, com `lang=pt`, devolve a **edição em português** de cada obra com a capa dela ("Harry Potter e a Pedra Filosofal", "Hábitos Atômicos"). O **Google Books sem chave respondeu 429 (cota esgotada)** — descartado para não falhar na apresentação.
- **Nova tela "Adicionar livro"** (`app/(tabs)/book-search.tsx`): sem digitar, mostra 6 **prateleiras de sugestões** só com livros em português e capa (Fantasia, Autoajuda e hábitos, Romance, Literatura brasileira, Negócios e carreira, Ficção científica); ao digitar, **grade de capas** com os resultados (espera 0,5 s após parar de digitar; edições em português primeiro). Tocar numa capa abre os detalhes (autor, páginas, ano) com **Quero ler** / **Já estou lendo**; livros já na estante ganham selo ✓. Sem internet: mensagem clara + "Cadastrar manualmente".
- **Minha Estante em grade de capas** (`bookshelf.tsx`) com selo de status e barra de progresso; capa grande no detalhe do livro (`book.tsx`); componente `components/BookCover.tsx` (capa ou "livro roxo" com o título quando não há imagem).
- **Mais fácil de achar:** cartão "📚 Minha Estante" em destaque no Perfil (livro em leitura e meta do dia) e atalhos "Minha Estante" e "Histórico de XP" em Desafios.
- Privacidade: só o texto da busca é enviado à Open Library; nenhum dado do usuário.
- Testes (sessão simulada temporária, removida): 6 prateleiras com 105 capas carregadas; busca "harry potter" → 30 resultados em português; adicionar "Já estou lendo" → entra na estante; reabrir → "já está na sua estante"; estante em grade conferida por captura. `tsc` 0 · lint 0.

---

## Etapa 10 — Estante, hábitos, pontualidade, histórico de XP, títulos e conquistas (24/10/2026)

**Decisões aprovadas:** Exercícios continuam removidos; hábitos personalizados convivem com o catálogo (100 XP por dia programado); pontualidade +10 XP numa janela de ±15 min; leitura: meta do dia +50 XP (1x/dia) e livro concluído +200 XP (1x/livro, só com leitura registrada); mesmo salvamento local por usuário; títulos de nível e 6 conquistas novas como propostos.

| Funcionalidade | Arquivos | Como funciona |
|---|---|---|
| Hábitos personalizados | `context/HabitsContext.tsx` (novo), `components/HabitsManager.tsx` (novo), `app/(tabs)/routine.tsx` (aba "Hábitos"), `app/(tabs)/challenges.tsx` (card "Hábitos de Hoje") | Nome + dias (atalhos "Todos os dias" e "Pular — usar diariamente") + horário opcional (aceita 19, 19h, 19:30). Editar e excluir com confirmação. Concluído é por dia: id `hab-<id>@<dia>`, sem duplicar |
| Pontualidade | `HabitsContext.tsx` | Concluir dentro de ±15 min do horário gera um registro separado `pont-<id>@<dia>` de +10 XP; sem horário não há bônus; o aviso diz que é informado pelo usuário |
| Sequência de hábitos | `HabitsContext.tsx` | Conta só dias programados; dia sem hábito não quebra; hoje incompleto ainda não quebra |
| Estante | `context/BooksContext.tsx` (novo), `app/(tabs)/bookshelf.tsx`, `app/(tabs)/book.tsx` (novos) | Título obrigatório; autor, páginas e capa (link) opcionais. Quero ler / Lendo / Concluído, filtros, detalhes, % de leitura, "li agora +5/+10/+20/N", "estou na página X" (avanço = registro; recuo = correção), anotações, editar e remover |
| Meta diária | `BooksContext.tsx`, `bookshelf.tsx` | 10/20/30 ou outro valor; páginas, faltam, % e "✓ alcançada". Cada registro tem id único |
| Integração leitura ↔ rotina | `BooksContext.tsx` | Se estiverem na rotina, "Ler 20 páginas" (diário) e "Ler um livro inteiro" (mensal) são concluídos sozinhos quando o critério é atingido |
| Histórico de XP | `app/(tabs)/xp-history.tsx` (novo), `constants/gamification.ts` (`xpCategory`) | Resumo por categoria (toque para filtrar), lista com atividade, categoria, XP, data/hora; bônus marcados como "Bônus". Mesma fonte (`XPContext.history`) |
| Títulos de nível | `constants/gamification.ts` (`LEVEL_TITLES`), `components/LevelUpOverlay.tsx`, `profile.tsx` | Iniciante (1) · Aprendiz (3) · Determinado (5) · Focado (8) · Comprometido (10) · Consistente (15) · Disciplinado (20) · Mestre dos Hábitos (30) · Lendário (50). LEVEL UP mostra o título (e a frase quando abre uma etapa nova) |
| Conquistas | `constants/gamification.ts`, `context/SessionProviders.tsx` (`AchievementsWatcher`), `app/(tabs)/achievements.tsx` | 12 conquistas (6 antigas + Constância de Ferro, Pontualidade Exemplar, Leitor Dedicado, Multidisciplinar, Superação Pessoal, Primeiro Livro). "Desafio social" agora vale com tarefa de grupo. Barra de progresso e mensagem de reconhecimento. Desbloqueio por um único observador (vê XP + hábitos) |
| Perfil | `app/(tabs)/profile.tsx` | "Sua evolução": nível + título, XP, barra, próxima etapa, sequência (atual/melhor), desafios, hábitos ativos, livros, metas de leitura e conquistas; atalhos Histórico de XP e Minha Estante |
| Progresso | `app/(tabs)/progress.tsx` | Mostra só as 5 últimas atividades + link para o histórico completo |

**Testes (sessão simulada temporária, já removida; chaves de teste apagadas):**
- `tsc` 0 erros · lint 0.
- Hábitos: nome curto e horário "25:99" recusados; hábito com horário = agora → +100 e +10 ("⏰ No horário!"); "Pular — usar diariamente" → +100; clicar de novo não soma; hábito só de domingo não aparece hoje.
- Estante: link de capa inválido recusado; meta 20; +10 e +10 → 20 páginas e meta alcançada (+50); página 50 de 50 → concluído (+200); anotações salvas; livro marcado "Concluído" sem leitura → "sem XP"; remover.
- Integração: concluir o livro cumpriu sozinho "Ler um livro inteiro" (rotina padrão) e fechou o ciclo mensal (+1000 +1000).
- Histórico: Desafios 1000, Leitura 250 (2x), Hábitos 200 (2x), Pontualidade 10, Bônus de ciclo; total 2.460 XP. Perfil: nível 5 "Determinado", 1 livro, 1 meta, 3 hábitos, conquistas 3/12. Depois: LEVEL UP "Nível 6 — Determinado"; tela de conquistas com barras e mensagens (captura conferida).
- Recarregar a página manteve hábitos, livros, meta e nível.

**Ponto para revisar:** concluir um livro pode somar várias recompensas legítimas ao mesmo tempo: livro (+200), o desafio mensal "Ler um livro inteiro" (+1000) e o bônus do ciclo mensal, se for o único desafio mensal (+1000). Se acharem demais, a solução mais simples é tirar "Ler um livro inteiro" do catálogo (o livro já tem recompensa própria).

**Limitações:** capa só por link (upload depende de Storage); a sequência de hábitos usa os dias programados **atuais** de cada hábito; tudo salvo só neste aparelho; comparações com outros usuários não foram feitas (sem dados reais).

---

## Etapa 9 — Remoção dos Exercícios e notas (23/10/2026)

- **Removidas** as telas `app/(tabs)/exercises.tsx` e `app/(tabs)/challenge-complete.tsx` (redundantes com o catálogo; a Conclusão só era aberta pelos Exercícios). O atalho "Exercícios" em Desafios virou "Ranking". O XP e o histórico de exercícios já concluídos continuam valendo.
- **Nova** `app/+not-found.tsx`: endereços que não existem (ex.: link antigo para `/exercises`) mostram "Página não encontrada" no visual do app, com botão "Voltar ao início".
- **Notas** em `notas/`: 1) mudanças explicadas + guia do backend, 2) como executar no VS Code, 3) resumo.
- Testes: `tsc` 0 erros · lint 0 · export web ok (sem as rotas removidas); `/exercises` mostra a página nova e o botão leva ao início.

---

## Etapa 8 — Sequência, XP da semana e entrar no grupo (23/10/2026)

### Sequência e XP da semana

- **Investigação:** não consegui reproduzir o "fica em 0 mesmo concluindo". Em conta nova, com a troca de conta do login simulada e até com uma **cópia** dos dados salvos da sua conta, o card atualizou ("1 dia", "+3300xp") e persistiu ao recarregar.
- **Incoerências reais corrigidas** (`constants/gamification.ts`, `app/(tabs)/challenges.tsx`):
  - O card se chama "XP ganho essa semana", mas somava os **últimos 7 dias**. Agora soma a **semana atual (desde segunda-feira)**, e a legenda diz isso.
  - A sequência conta **dias seguidos** (várias tarefas no mesmo dia = 1 dia), mas a tela não explicava. Agora mostra "hoje garantido · amanhã vira 2", "conclua algo hoje para não perder" ou "conclua um desafio para começar".
- Se ainda aparecer 0 depois de concluir, preciso dos passos exatos (qual tela, qual navegador, se estava logado) para reproduzir.

### Entrar no grupo

- `services/groupsService.ts`: os grupos passaram de "por usuário" para um **registro do aparelho** (`focus:v1:grupos`), com migração automática dos grupos antigos.
- `context/GroupsContext.tsx`: **entrar com código** (formato `FOCUS-XXXX`; aceita convite pendente para o seu @usuário/e-mail), **sair do grupo** (membro) e **remover participantes de exemplo** (criador).
- `app/(tabs)/groups.tsx`: formulário "Entrar com código". `app/(tabs)/group.tsx`: botões "Sair do grupo" e "Remover participantes de exemplo"; texto do convite explica o código; corrigido "1 membros" para "1 membro".
- `docs/CONTRATO_GRUPOS.md`: atualizado com a entrada por código.

### Testes (com sessão simulada temporária, já removida)

- `tsc` 0 erros · lint 0 · export web ok.
- Conta A cria "Estudos da banca" e remove os exemplos; conta B: código "abc" → erro de formato; "FOCUS-ZZZZ" → "não encontrado neste aparelho"; "focus-pusl" (minúsculas) → entra. As duas pontuam 100 e aparecem no ranking uma da outra; a conta B sai → o grupo some da lista dela, e a conta A passa a ver só a si mesma.
- Dados das contas de teste e o grupo de teste apagados do navegador; os dados da sua conta não foram alterados (apenas lidos e copiados para a investigação).

### Senha por e-mail

O "Esqueceu a senha?" usa o `sendPasswordResetEmail` do Firebase Auth que já existia; o modelo do e-mail pode ser personalizado no console do Firebase (Authentication › Templates).

---

## Etapa 7 — Plano personalizado, XP por frequência, grupos e publicar pelo Perfil (23/10/2026)

Decisões: grupos como **protótipo + contrato** para o backend; XP **100 / 300 / 1000**; foto no grupo **pronta, mas desativada** até existir armazenamento. Nada no Firebase foi alterado.

### O que mudou

| Funcionalidade | Arquivos | Detalhes |
|---|---|---|
| **XP por frequência** | `constants/gamification.ts` | Diário 100 · semanal 300 · mensal 1000 XP; o bônus do ciclo vale o mesmo. Exercícios seguem em 100 |
| **Foco proporcional** | `constants/gamification.ts`, `context/FocusContext.tsx`, `app/(tabs)/focus.tsx` | 25 min = 100 XP, 50 min = 200 XP (`focusXp`); teto de 400 XP de foco por dia; o botão mostra quanto vale |
| **Desafios mensais** | `constants/challenges.ts` | +23 desafios mensais (2 por categoria) → 106 no catálogo; ciclo mensal com limite de 4 (diário 8, semanal 6) |
| **Plano personalizado** | `app/onboarding.tsx` (novo), `app/index.tsx`, `app/(auth)/register.tsx`, `context/RoutineContext.tsx` | Conta nova → áreas de interesse → diárias → semanais → mensais (com sugestões) → resumo com XP possível. Pode pular (plano sugerido) ou refazer pelo Perfil ("Meu plano") |
| **Publicar pelo Perfil** | `components/PostComposer.tsx` (novo), `hooks/usePublishPost.ts` (novo), `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx` | Mesma caixa de publicação no Feed, no Perfil e no mural do grupo (sem código duplicado) |
| **Grupos de amigos** | `services/groupsService.ts`, `context/GroupsContext.tsx`, `app/(tabs)/groups.tsx`, `app/(tabs)/group.tsx` (novos) | Criar grupo (código de convite), tarefas do grupo criadas pelos membros (diária/semanal/mensal), concluir dá XP pessoal + pontos no grupo (sem duplicar), ranking do grupo, mural do grupo, convites por @usuário/e-mail (pendentes), excluir grupo |
| **Ranking entre amigos** | `app/(tabs)/ranking.tsx`, `app/(tabs)/challenges.tsx` | O ranking global de demonstração saiu; agora é o ranking de cada grupo. Em Desafios aparece a melhor colocação ("3º · 300 pts em Turma do TCC") |
| **Contrato para o backend** | `docs/CONTRATO_GRUPOS.md` (novo) | Coleções, campos, ids anti-duplicação, regras de acesso (mural e fotos só para membros) e como trocar o serviço local |
| **Correção** | `context/SessionProviders.tsx` | Recarregar a página numa tela (ex.: `/groups`) jogava para o Feed; agora mantém a tela |

### Testes

- `tsc` 0 erros · lint 0 erros/avisos · export web ok.
- Para testar com sessão, usei uma **instrumentação temporária** (uid falso pela URL) só no servidor local. Ela foi **removida** depois (busca por `e2eUid` = 0 resultados) e as chaves das contas de teste foram apagadas do navegador.
- Plano: sem área → erro; com Estudos + Saúde → 3 diárias, 2 semanais e 1 mensal sugeridas; resumo "até +400 / +900 / +2000 XP"; leva a Desafios.
- XP: concluir 1 mensal → +1000 + bônus 1000 → nível 5. Cards "Tarefas de Hoje / da Semana / Metas do Mês" com bônus 100/300/1000 e "Reinicia em N dias".
- Foco: 25 min → +100; 50 min → +200, +200, e o 3º → "Limite diário de XP de foco atingido".
- Grupos: nome curto recusado; criar "Turma do TCC"; tarefas diária e semanal; concluir "Correr 5 km" → "+300 XP e +300 pts" (clicar de novo não duplica); ranking 700/400/**300 (você)**/100; mural publica; botão de foto explica a limitação; convite "x" recusado e "@bia.focus" fica pendente; tela Ranking e card de Desafios com "3º".
- Salvamento: recarregar mantém nível 6, ciclo mensal e grupo; a conta "bia" começa do zero (plano inicial, sem grupos).
- Capturas conferidas: tela do grupo e passo 1 do plano.

### Ocorrências durante os testes (transparência)

- Havia uma **sessão real do Firebase** salva no navegador do Claude (alguém entrou com uma conta). Minha tentativa de publicar pelo Perfil na sessão de teste foi enviada com essa conta, mas **falhou por conexão recusada** (`ERR_CONNECTION_REFUSED`); o Feed não mostra nenhum post de teste. Depois disso, não fiz mais nenhuma ação que envolvesse o Firebase.
- Antes de perceber essa sessão, executei `localStorage.clear()` no navegador do Claude: **o progresso local dessa conta real neste navegador (se existia) foi apagado**. Nada no Firebase foi afetado; em outros navegadores e aparelhos nada muda.

### Depende do backend

Membros reais, envio e aceite de convites, mural compartilhado e fotos do grupo (Storage com acesso só para membros). Está tudo descrito em `docs/CONTRATO_GRUPOS.md`.

---

## Etapa 6 — Salvamento local por usuário (23/10/2026)

Autorizado pelo usuário. **Nada no Firebase foi alterado**; os dados ficam só neste aparelho/navegador.

| O que é salvo | Chave | Onde |
|---|---|---|
| XP, histórico de conclusões (com datas) e conquistas liberadas | `focus:v1:<uid>:progresso` | `context/XPContext.tsx` |
| Desafios escolhidos para a rotina | `focus:v1:<uid>:rotina` | `context/RoutineContext.tsx` |

- **Separado por usuário:** a chave inclui o uid; a conta B nunca lê os dados da conta A. Sem sessão, nada é salvo.
- **Carregar antes de mostrar:** enquanto o progresso carrega, aparece um indicador (`context/SessionProviders.tsx`), para não exibir "0 XP" por um instante nem gravar por cima do que estava salvo.
- **Dados corrompidos:** a leitura valida o formato (ids do catálogo, números etc.). Se algo estiver inválido, o dado é descartado e o app volta ao padrão, sem travar.
- **Falha no armazenamento:** toda leitura e gravação tem `try/catch`; se falhar, o app segue em memória.
- **Não salvo:** o cronômetro em andamento e o perfil (nome, bio, foto), que não foram pedidos. As sessões de foco concluídas ficam no histórico, então o limite diário de XP de foco vale mesmo após recarregar.
- **Consequências:** as conquistas "Foco diário" (5 dias) e "Sequência de 7 dias" voltaram a ser alcançáveis, porque o histórico persiste. Os textos "nesta sessão" viraram "salvo neste aparelho" / "últimos 7 dias", e o aviso de "Sair da conta" agora diz que o progresso fica salvo.

### Arquivos

`utils/localStore.ts` (novo), `context/XPContext.tsx`, `context/RoutineContext.tsx`, `context/SessionProviders.tsx`, `constants/gamification.ts`, `app/(tabs)/challenges.tsx`, `app/(tabs)/routine.tsx`, `app/(tabs)/profile.tsx`.

### Testes

- `tsc` 0 erros · lint 0 avisos · export web ok.
- Web sem sessão: `/challenges` → `/login`; **nenhuma** chave `focus:` gravada; console sem erros.
- **Não testado por mim (exige login):** salvar e recarregar, e a troca de contas. Roteiro manual:
  1. Entrar com a conta A, concluir 2 desafios, trocar a rotina pelo catálogo e fazer um exercício.
  2. Recarregar a página (F5) → XP, rotina, histórico (Progresso) e conquistas iguais.
  3. Sair → entrar com a conta B → XP 0 e rotina padrão.
  4. Sair → entrar de novo com a conta A → tudo da conta A de volta.
  5. (Opcional) No navegador: DevTools → Application → Local Storage → há uma chave `focus:v1:<uid>:...` para cada conta.

### Atenção (celular)

O pacote instalado é `@react-native-async-storage/async-storage` **3.0.1**, mas o Expo SDK 54 espera a **2.2.0**. Na web funciona (usa `localStorage`). No celular com **Expo Go**, o módulo nativo pode não ser compatível com a v3. Nesse caso o salvamento falha em silêncio e o app segue em memória (sem travar). Para salvar também no celular, alguém da equipe precisa rodar `npx expo install @react-native-async-storage/async-storage`, que instala a versão compatível; eu não alterei pacotes.

---

## Etapa 5 — Auditoria crítica para a banca (23/10/2026)

Escopo: só front-end. Nada foi alterado em Firebase, Firestore, regras ou backend.

### 1. Melhorias concluídas no front-end

| # | Gravidade | Problema identificado | Arquivo(s) | Correção implementada | Como foi testada | Resultado | Backend? |
|---|---|---|---|---|---|---|---|
| 1 | Crítico | Ao sair, a **rotina e o cronômetro** não eram zerados; e como o app sempre abria no Login, outro usuário podia entrar **herdando XP, rotina e foco** da sessão anterior | `context/SessionProviders.tsx` (novo), `app/_layout.tsx`, `app/(tabs)/profile.tsx` | XP, rotina e foco ficam num grupo de providers com `key = uid`: ao trocar de conta (ou sair) tudo é recriado do zero. O perfil já era limpo pelo `UserContext` | Revisão de código + `tsc`. **Não testei com login real** (não digito credenciais) — ver roteiro manual abaixo | Implementado; validação manual pendente | Não |
| 2 | Crítico | `app/index.tsx` mandava **sempre** ao Login, mesmo com sessão ativa | `app/index.tsx`, `context/UserContext.tsx` | `UserContext` expõe `authReady`; o index espera o Firebase Auth e vai ao Feed (logado) ou ao Login | Web sem sessão: `/` → `/login` | ✅ Aprovado (caso logado: roteiro manual) | Não |
| 3 | Crítico | Abas acessíveis **sem login** (e após logout) | `app/(tabs)/_layout.tsx`, `app/(auth)/complete-profile.tsx` | Sem sessão → Login (com indicador enquanto o Auth responde) | Web sem sessão: `/challenges`, `/profile`, `/complete-profile` → `/login` | ✅ Aprovado | Não |
| 4 | Crítico | Exercícios davam **XP só por tocar no card** | `app/(tabs)/exercises.tsx` | Fluxo: tocar → instruções passo a passo → Iniciar → timer (pausar/continuar) → fim do tempo → "Concluí" → XP. Fechar no meio pede confirmação e não dá XP | Web: abrir (XP igual), pausar (tempo congela), fechar no meio (sem XP), relógio adiantado → "Concluí" → +100 XP → Conclusão; exercício bloqueado no dia | ✅ Aprovado | Não |
| 5 | Importante | Imagens do feed eram gravadas como **caminho local** (`blob:`/`file://`): outros usuários não as viam e sumiam ao recarregar | `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx` | Botão de imagem visivelmente desabilitado, explicando a limitação ao tocar; posts antigos com caminho local mostram "Imagem indisponível"; Perfil lista seus posts de texto | Web: toque no botão mostra o aviso; "Postar" desabilitado sem texto | ✅ Aprovado (publicar exige login) | **Sim** (armazenamento de arquivos) |
| 6 | Importante | Ranking com nomes que pareciam **pessoas reais** e filtros Global/Amigos/Semanal que não funcionavam | `constants/gamification.ts`, `app/(tabs)/ranking.tsx` | Participantes renomeados para "Participante exemplo 1–5"; quadro "Modo demonstração" explica que só a sua pontuação é real; filtros removidos | Web: lista, aviso e ausência das abas | ✅ Aprovado | **Sim** (ranking real) |
| 7 | Importante | Conquistas de vários dias ("Foco diário", "Sequência de 7 dias") eram **impossíveis** (o histórico some ao recarregar), mas pareciam disponíveis | `constants/gamification.ts`, `app/(tabs)/achievements.tsx` | Marcadas como indisponíveis com o motivo; contador "X de 3 disponíveis · 3 indisponíveis" | Web: textos e contador | ✅ Aprovado | **Sim** (histórico salvo) |
| 8 | Importante | Remover o único desafio pendente deixava o ciclo **todo feito, mas sem bônus** para sempre | `context/RoutineContext.tsx` | Ao remover, se o restante do ciclo está todo concluído, o ciclo fecha e o bônus é dado | Web: concluir 2 de 3, remover o 3º → +100 XP de bônus | ✅ Aprovado | Não |
| 9 | Importante | Ciclo já fechado + desafio novo mostrava "ciclo completo" com 2/3 | `challenges.tsx`, `routine.tsx`, `progress.tsx` | Texto passa a ser "2/3 · bônus já recebido" | Web: adicionar desafio após fechar o ciclo | ✅ Aprovado | Não |
| 10 | Importante | Aviso "Nova conquista" **ficava preso** na tela (aparecia por algo antigo e outra conclusão cancelava o timer) | `app/(tabs)/challenges.tsx` | Só avisa conquistas novas desde que a tela abriu; o timer de esconder ficou num efeito próprio | Web: conquista liberada em Exercícios não gera aviso em Desafios; liberada em Desafios aparece e some em 3 s mesmo com cliques seguidos | ✅ Aprovado | Não |
| 11 | Importante | Menu "Acessar telas" do cadastro passou a ser **botões sem função** (as abas exigem login) | `app/(auth)/register.tsx` | Menu removido; "Já tem conta? Entrar" funciona mesmo sem histórico de navegação | Web: `/register` sem o menu; o link leva a `/login` | ✅ Aprovado | Não |

### Testes executados

- `npx tsc --noEmit`: 0 erros · `npx expo lint`: 0 erros, 0 avisos · `npx expo export --platform web`: ok.
- Pomodoro (web): pausar congela; continuar retoma; trocar de tela mantém o tempo (com banner); reiniciar volta a 25:00; pular foco não dá XP; 5 focos com relógio adiantado → 4 com +100 XP e o 5º com "Limite diário de XP de foco atingido".
- Telas pequenas (320×640): nenhuma tela com rolagem horizontal; só os chips de categoria do Catálogo rolam na horizontal (de propósito).
- Gamificação: exercício (+100) + 2 desafios (+200) + bônus por remoção (+100) = 400 XP, coerente em Desafios, Ranking (6º) e Progresso.

### Roteiro manual (precisa de login — eu não testei)

1. Abrir o app já logado → deve ir direto ao **Feed** (sem passar pelo Login).
2. Conta A: concluir 2 desafios, iniciar um foco, trocar a foto → **Sair da conta** (confirmar) → deve ir ao Login.
3. Entrar com a conta B → XP 0, rotina padrão, foco parado, sem foto/nome da conta A.
4. Após sair, tentar voltar (botão voltar do navegador) → deve cair no Login.
5. Cadastro novo → deve ir ao Feed; publicar um texto → aparece no Feed e em Perfil > Postagens.

### 2. Problemas que dependem do backend

| Item | Por quê | O que o backend precisa |
|---|---|---|
| Nome e bio após login | O app não lê `users/{uid}` (decisão de não tocar no Firestore); quem só faz login aparece como "Usuário" | Leitura de `users/{uid}` após o login |
| Persistência de XP, rotina, histórico e foco | Hoje ficam em memória e somem ao recarregar | Campos em `users/{uid}` ou subcoleção |
| Foto de perfil e imagens do feed | Sem armazenamento de arquivos configurado | Firebase Storage (ou similar) e URL pública no post/perfil |
| Ranking real e filtros Amigos/Semanal | Precisa dos outros usuários | Consulta ordenada por XP e sistema de amigos |
| Conquistas de vários dias e "Desafio social" | Histórico entre sessões e amigos | Histórico salvo e amigos |
| Sessão no celular (Android/iOS) | `getAuth` sem persistência nativa em `config/firebase.ts` | `initializeAuth` com persistência (alteração de configuração) |

### 3. Melhorias opcionais para o futuro

- Salvar localmente (por usuário) XP, rotina e histórico até o backend existir — **proposta pendente de autorização**.
- Assets de ícone e splash em `assets/images/`.
- Unificar o estilo do botão voltar e os roxos dos botões primários (Fase E original).
- Notificação ao fim do Pomodoro com o app fechado (exigiria `expo-notifications`).

---

## Etapa 4 — XP unificado, níveis e catálogo de desafios (23/10/2026)

### Regras novas

- **XP unificado:** todo desafio vale **100 XP**, seja diário, semanal ou exercício. Fechar o ciclo (diário ou semanal) dá o mesmo bônus de **100 XP**. Cada foco do Pomodoro também vale 100 XP, até 4 por dia. Tudo vem de `CHALLENGE_XP` em `constants/gamification.ts`.
- **Níveis:** 500 XP por nível, sem teto (nível 3 = 1.000 XP, nível 4 = 1.500 XP...). O aviso "LEVEL UP" agora é global (`components/LevelUpOverlay.tsx`) e aparece em qualquer aba. A tela de Conclusão mostra "Subiu de nível!", e o Progresso mostra o caminho dos próximos 3 níveis com o XP que falta.
- **Sem criação livre:** a pessoa escolhe desafios num **catálogo** (`constants/challenges.ts`) de **83 desafios em 12 categorias**: Estudos, Leitura, Saúde, Atividade física, Mente e bem-estar, Produtividade, Sono, Casa e organização, Finanças, Social, Detox digital e Criatividade. Cada desafio já vem marcado como diário ou semanal.

### Telas

- **Catálogo** (`app/(tabs)/catalog.tsx`, novo): busca que ignora acentos, filtro Todos/Diários/Semanais, categorias em chips, contador de resultados, situação da rotina ("8/8 diários · 2/8 semanais") e botão ＋/✓ para adicionar ou tirar. Mostra aviso de sucesso ou de limite e tem estado vazio com "Limpar filtros".
- **Minha rotina:** lista os desafios escolhidos (ícone e categoria), com remover (com confirmação) e "Escolher desafios no catálogo", que já abre filtrado no ciclo da aba. O formulário de criação saiu.
- **Desafios:** o card vazio leva direto ao catálogo. O overlay antigo de LEVEL UP saiu (virou global).

### Testes (web, 375×812)

- `tsc` 0 erros · lint 0 avisos · export web ok.
- Busca "agua" → 1 resultado ("Beber 2L de água"); busca sem resultado → estado vazio.
- Adicionar desafios até 8 diários; o 9º é recusado com a mensagem de limite.
- Concluir os 10 desafios (8 diários + 2 semanais) → 1.000 + 2 bônus de 100 = **1.200 XP**, avisos "nível 2" e "nível 3", "300 XP para o próximo nível".
- Progresso: Nível 3 com o caminho 4/5/6 ("faltam 300/800/1300 XP"), ciclos 8/8 e 2/2, "Concluiu 10 desafios".

---

## Etapa 3 — Ciclos de tarefas e foco (23/10/2026)

Pedidos: deixar só a foto ao lado do "Bem-vindo", dar destino ao "Concluiu N desafios" do Progresso e criar ciclos de tarefas (rotina + Pomodoro). Tudo em memória, como decidido antes.

### Novo

| Arquivo | O que faz |
|---|---|
| `context/RoutineContext.tsx` | Rotina: tarefas **diárias** e **semanais** que reiniciam sozinhas (meia-noite / segunda). Criar, editar, remover, com validação (3–60 caracteres, sem duplicadas, até 8 por ciclo). Fechar o ciclo inteiro dá bônus (+50 diário, +100 semanal), uma vez por período. |
| `context/FocusContext.tsx` | Ciclo de foco (Pomodoro) 25/5 ou 50/10, pausa longa a cada 4 focos. O tempo é calculado pelo horário de término, então continua certo ao trocar de tela. +50 XP por foco (até 8 por dia); pular não dá XP. |
| `app/(tabs)/routine.tsx` | Tela "Minha rotina": abas Diárias/Semanais, progresso do ciclo, lista com editar/remover (com confirmação), formulário com recompensa 50/100/150 XP. |
| `app/(tabs)/focus.tsx` | Tela "Ciclo de foco": timer, fase (foco/pausa), progresso, 4 bolinhas do conjunto, iniciar/pausar/continuar, reiniciar e pular com confirmação, estatísticas do dia. |

### Alterado

- **Desafios:** saem a foto do topo e a do card de ranking; a foto ao lado do "Bem-vindo" abre o Perfil. Os cards "Tarefas de Hoje" e "Tarefas da Semana" vêm da rotina, com barra do ciclo, bônus e "Gerenciar". Há um aviso de ciclo completo, um banner do foco em andamento (com o tempo), atalhos novos "Foco" e "Minha rotina", e o card de ranking virou "6º · XP · Ver ›".
- **Progresso:** os cards fixos "Ler 10 livros/Treinar 5 dias" foram trocados pelos **ciclos reais**. Entraram um resumo (sequência, XP da semana, focos de hoje), "Desafios concluídos" com o botão **Ver desafios** e um **Histórico** das últimas 15 conclusões (nome, horário, XP).
- **XPContext:** as conclusões guardam o título (para o histórico); `history` e `isCompleted`. Bônus de ciclo e focos somam XP, mas não contam como "desafio".
- **Acessibilidade:** o react-native-web ignora `accessibilityState`, então troquei por `aria-checked`/`aria-selected`/`aria-disabled`/`aria-busy` (que o React Native também aceita).

### Bug encontrado nos testes

Com o React Compiler ligado (`app.json`), uma função que lia `ref` durante a renderização ficava memorizada, e as tarefas não apareciam marcadas (o XP estava certo). Corrigido: a renderização usa só estado (`completedIds`), e a `ref` fica só nos eventos.

### Testes (web, 375×812, sem login)

- `tsc` 0 erros · lint 0 avisos · export web ok.
- Concluir as 3 tarefas do dia → 300 XP + bônus 50, "✓ ciclo completo", aviso de ciclo; tocar de novo não soma XP.
- Rotina: nome curto e duplicado recusados; adicionar "Ler 20 páginas" (+50) → ciclo 3/4; editar para "Ler 30 páginas"; remover com confirmação.
- Foco: iniciar → 24:59; relógio adiantado 25 min → "Sessão concluída! +50 XP", pausa curta, 1 de 4; banner com tempo em Desafios.
- Progresso: 400 XP (300 + 50 + 50), ciclos 3/3 e 0/2, "Concluiu 3 desafios", histórico com as 5 entradas; "Ver desafios" abre Desafios.
- Capturas de tela conferidas: Desafios (uma única foto), Ciclo de foco, Minha rotina.

### Limitações

- Rotina, focos e histórico ficam só na sessão (somem ao recarregar); salvar na conta depende do backend (`users/{uid}`).
- O timer não toca alarme nem notifica com o app fechado (exigiria `expo-notifications`, pacote novo).

---

## Etapa 2 — Integração de dados e gamificação (23/10/2026)

Decisões do usuário: **não mexer no Firestore**, foto **só na sessão**, XP **em memória**, **sem** proteção de rotas.
Tudo abaixo funciona no frontend; o que depende de backend está marcado.

### Problemas encontrados

1. `Alert.alert` não faz nada no react-native-web → "Perfil atualizado", erros de cadastro e avisos sumiam no navegador.
2. Foto de perfil vivia só dentro da tela de Perfil; "Posts" contava os posts de **todos** os usuários; `@usuário` não existia.
3. O feed assinava o Firestore no início do app (antes do login); o Firestore negava e o listener morria → depois do login o feed ficava vazio até recarregar.
4. Feed sem autor, sem tratamento de erro ao postar e com clique duplo em "Postar".
5. Completar perfil: botão da câmera sem ação, `@usuário` descartado, barra falsa no rodapé.
6. Login: "Esqueceu a senha?" sem ação; `UserContext` não recebia nem o e-mail do Auth.
7. Sequência, XP semanal e filtro "Recentes" eram fixos; tarefas do dia nunca reiniciavam.

### O que mudou

| Arquivo | Mudança |
|---|---|
| `constants/gamification.ts` (novo) | Regras num só lugar: 500 XP/nível, conquistas com condição verificável, sequência, XP semanal, ids diários, ranking de demonstração. |
| `utils/feedback.ts` (novo) | `notify` / `confirmAction` que funcionam na web (diálogos do navegador) e no celular (`Alert`). |
| `components/UserAvatar.tsx` (novo) | Avatar reutilizável: mostra a foto do usuário ou o ícone que cada tela já usava. |
| `context/UserContext.tsx` | Fonte única: `name`, `username`, `bio`, `avatar`, `email`, `uid`. Sincroniza só uid/e-mail com o Firebase Auth (não lê/grava Firestore). `resetUser`. |
| `context/XPContext.tsx` | Histórico de conclusões com data; verifica conquistas no momento da conclusão e guarda a data; `lastUnlocked`; proteção contra toque duplo (ref síncrona); `resetProgress`. Interface anterior mantida. |
| `context/PostContext.tsx` | Assina o feed só com sessão ativa e reassina após login; `loading` e `error`. Gravação inalterada. |
| `app/(tabs)/profile.tsx` | Edita nome, @usuário (validado), bio e foto no contexto; cancelar edição; remover foto com confirmação; contagem/grade só com **meus** posts; "Sair da conta" com confirmação. |
| `app/(tabs)/challenges.tsx` | Foto do usuário no cabeçalho, boas-vindas e card de ranking; posição real no ranking; sequência e XP semanal calculados; aviso "Nova conquista"; tarefas reiniciam por dia; acessibilidade nas tarefas. |
| `app/(tabs)/ranking.tsx` | Usa `buildRanking` e a foto/nome do usuário. |
| `app/(tabs)/achievements.tsx` | Usa as regras centrais; "Recentes" mostra as conquistas pela data real de liberação; "Desafio social" marcado como dependente de backend. |
| `app/(tabs)/challenge-complete.tsx` | Mostra nível e as conquistas liberadas por aquela conclusão. |
| `app/(tabs)/exercises.tsx` | Cada exercício rende XP uma vez por dia. |
| `app/(tabs)/index.tsx` | Autor no post (seu nome/foto nos seus posts), carregamento, estado vazio/erro, bloqueio de clique duplo, erro de publicação sem perder o texto, remover imagem antes de postar, limite de 500 caracteres. |
| `app/(auth)/login.tsx` | "Esqueceu a senha?" envia e-mail de redefinição (Firebase Auth existente); validação de e-mail; mensagens de rede/excesso de tentativas; Enter envia. |
| `app/(auth)/register.tsx` | Avisos visíveis na web; espaços removidos de nome/e-mail; erro de rede. |
| `app/(auth)/complete-profile.tsx` | Câmera escolhe a foto; salva @usuário/bio/foto no contexto; validação; e-mail da conta bloqueado; barra falsa removida. |

### Testes

- `npx tsc --noEmit`: 0 erros · `npx expo lint`: 0 erros/0 avisos · `npx expo export --platform web`: ok (só o aviso do favicon ausente).
- Na web (375×812, sem login), navegando dentro do app sem recarregar:
  - Perfil: trocar foto, nome `Ana Teste` e `@Ana.Focus` → salvo como `@ana.focus`, aviso "Perfil atualizado" visível.
  - Desafios: "Bem-vindo, Ana Teste!" e a mesma foto em 3 lugares; posição 6º.
  - Concluir tarefa: 400 XP para o próximo nível, "Nova conquista: 🏅 Primeiros passos", sequência 1 dia, +100xp na semana.
  - Ranking: "Ana Teste (você)" com a foto; Conquistas → Recentes: "Primeiros passos — Conquistada em 23/10/2026".
  - Exercícios → Caminhada → Conclusão: +100 XP, "200 XP · Nível 1"; XP disponível 180.
  - Feed sem login: "Entre na sua conta para ver o feed." e "Postar" desabilitado; sem novos erros de Firestore no console.
- A foto foi testada com um arquivo gerado no navegador (simulando o seletor de arquivos).

### Não testado

- Login, cadastro, recuperação de senha e publicar no feed com uma conta real (não digito credenciais que vão para o Firebase). Testar manualmente.
- Android/iOS.

### Depende do backend (não simulado como real)

- Persistir perfil/foto/XP: hoje somem ao recarregar (decisão desta etapa). Caminho: `users/{uid}` (perfil e XP) e Firebase Storage para fotos.
- Fotos dos posts são caminhos locais (`blob:`/`file://`): não aparecem para outros usuários nem após recarregar.
- Nome/foto dos **outros** autores no feed ("Membro do Focus") e ranking real (outros usuários são de demonstração).
- "Desafio social" (sistema de amigos) e abas Amigos/Semanal do Ranking.
- Sessão no celular: `getAuth` sem persistência do React Native em `config/firebase.ts` (arquivo não alterado).

### Referências de UX aplicadas

- Duolingo: feedback imediato de XP, aviso de conquista na hora, sequência visível.
- Habitica/Todoist: tarefas diárias que reiniciam, estado concluído claro, sem ganho repetido.
- GitHub/Strava: uma identidade (nome, @, foto) igual em todas as telas.

---

# Fases B–F (etapa anterior)

Data: 23/10/2026 · Base: ZIP do commit `85cc251` (`felipeclemente1812-spec/TCC-Focus-2026`)

> **Sem Git:** o Git não está instalado nesta máquina e a pasta não é um repositório.
> Por decisão do usuário, não houve branch nem commits. Antes de editar foi feita uma cópia em
> `C:\David tcc\TCC-Focus-2026-main_backup_2026-10-23` (sem `node_modules`).
> Para publicar: copiar estes arquivos para um clone do repositório, criar a branch
> `frontend/ajustes-briefing` e commitar.

## Decisões tomadas

| Item | Decisão |
|---|---|
| B5 | `web.output: "single"` + correção do piso de `s()` |
| C5 | Menu "Acessar telas" visível só em `__DEV__` |
| C6 | Cadastro **continua** indo para as abas (não para Completar perfil) |
| D1 | Nível 1 com 0 XP, 500 XP por nível |
| Firestore `users/{uid}` | Fica para o backend |
| Fase E / Figma | Sem Figma: só ajustes pelo que já existe no código |

## Arquivos criados

- `context/XPContext.tsx` — XP compartilhado em memória (mock). `completeChallenge(id, xp)` ignora ids já concluídos.
- `.claude/launch.json` — configuração para abrir `expo start --web` no preview do Claude (pode apagar).
- `RELATORIO_AJUSTES_FRONTEND.md` — este arquivo.

## Arquivos alterados

| Arquivo | O que mudou | Por quê |
|---|---|---|
| `app/_layout.tsx` | `Stack.Screen` com nomes reais; removido filho de texto; `XPProvider` | Avisos "No route named…"/"Layout children…"; XP global |
| `app/(tabs)/_layout.tsx` | Removidos `UserProvider`/`PostProvider` duplicados; 5 telas com `href: null`; `backBehavior="history"` | Dados do cadastro chegam às abas; barra com 3 ícones; "voltar" retorna à tela anterior (antes ia para o Feed) |
| `app/(tabs)/index.tsx` | `addPost` sem `id`, com `userId` de `auth.currentUser` | Erro TS |
| `app/(tabs)/profile.tsx` | Grade só com posts com imagem + estado vazio; nome/e-mail/bio do `UserContext`; salvar chama `updateUser`; Pontos = XP, Nível; atalhos Conquistas/Progresso; nome centralizado | Erro TS; dados fixos (`@comocudeveia`, 1200, #42) |
| `app/(tabs)/challenges.tsx` | Piso de `s()` virou fator (0,85×); removida barra falsa, ☰ e 🔔; avatar → Perfil; grade de 4 atalhos; card de ranking tocável; XP via contexto; "Bem-vindo, {nome}"; rótulos "demonstração"; lint | Textos de 0,85 px na web; navegação; XP coerente |
| `app/(tabs)/progress.tsx` | Nível/XP/barra e nº de desafios do contexto; rótulo de demonstração; fontes ≥ 12 px; voltar seguro | "Nível 12"/2550 fixos |
| `app/(tabs)/ranking.tsx` | "Você" entra ordenado com o XP real; aviso de demonstração; Amigos/Semanal desabilitadas; removido "Mostrar mais" (sem ação) | 2099 XP/"Wesley" fixos |
| `app/(tabs)/achievements.tsx` | Filtros funcionando; "Recentes" com estado vazio explicativo; conquistas derivadas de XP/desafios; demais marcadas "demonstração"; contador "X de 6" + barra | Filtros eram `View`s sem ação |
| `app/(tabs)/challenge-complete.tsx` | Mostra `lastGain` e XP total; não soma XP; voltar seguro; fontes maiores | +150/2.412 fixos |
| `app/(tabs)/exercises.tsx` | XP disponível = soma dos não concluídos; tocar conclui (+XP) e abre Conclusão; concluído fica marcado ✓ e desabilitado | 750 fixo; toque sem ação |
| `app/(auth)/register.tsx` | Menu "Acessar telas" envolto em `__DEV__` | C5 |
| `app.json` | `web.output: "single"` | B5 |

`config/firebase.ts`, `context/PostContext.tsx`, regras, `.env` e versões de pacotes **não** foram tocados. Nenhum pacote novo instalado (só `npm ci` a partir do lock, pois o `node_modules` estava incompleto).

## Testes

| Comando | Antes | Depois |
|---|---|---|
| `npx tsc --noEmit` | 2 erros (index.tsx:50, profile.tsx:148) | **0 erros** |
| `npx expo lint` | 0 erros, 2 warnings | **0 erros, 0 warnings** |
| `npx expo export --platform web` | ok + avisos de rota/layout + favicon | **ok**; resta só o aviso do favicon ausente |

Teste manual na web (`expo start --web`, viewport 375×812, sem login):

- Barra inferior com **3 ícones**; "Tarefas de Hoje" com tamanho normal.
- Concluir 2 tarefas em Desafios → 200 XP; Progresso mostra "200 / 500 XP", "Concluiu 2 desafios"; Ranking mostra "Você 200 XP · 6º"; Perfil mostra 200 Pontos / Nível 1; Conquistas mostra "1 de 6" com "Primeiros passos".
- Filtros de Conquistas: Conquistadas mostra só as desbloqueadas; Recentes mostra o aviso de histórico.
- Exercícios: concluir "Caminhada" → Conclusão com +100 XP e total correto; XP disponível 280 → 180; tocar de novo não soma nem navega.
- Atalhos Progresso/Ranking/Conquistas/Exercícios abrem e "voltar" retorna a Desafios.

## Não testado

- Android/iOS (só web).
- Login/cadastro reais com Firebase (sem login, o listener de posts dá `permission-denied`, esperado).
- Reabrir a tela de Conclusão pela URL (recarregar a página zera o estado em memória, por design do mock).

## Pendências

- **Assets ausentes** (o `app.json` espera em `assets/images/`): `icon.png`, `favicon.png`, `splash-icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`.
- **Fase E sem Figma**, não feito: unificar fundos das telas secundárias (Exercícios usa `#171124`/`#0D0A16`), unificar roxo dos botões primários (`#6366f1`, `#7C3AED`, `#713CFF`, `#7C22E8`), um único estilo de botão voltar, extrair paleta para `constants/`.
- Após login o `UserContext` continua vazio (sem `onAuthStateChanged` nem leitura de `users/{uid}`) → Perfil/Desafios mostram fallback "Usuário"/"Bem-vindo!" para quem só fez login.
- `expo-doctor`: `async-storage` 3.0.1 vs 2.2.0 esperado, e alguns patches do SDK 54 atrasados — apenas reportado.

## Próximos passos (backend)

1. Persistir XP e conclusões no Firestore (trocar a implementação do `XPContext` mantendo a interface).
2. Carregar `users/{uid}` após login e usar `onAuthStateChanged` para manter a sessão.
3. Ranking real, datas de conquista e streak/XP semanal reais (hoje marcados como "demonstração").
