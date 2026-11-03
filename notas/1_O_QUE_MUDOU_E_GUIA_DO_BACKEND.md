# 1 — O que mudou no Focus (explicado) + guia para o backend

> Escopo: só o **front-end** (telas, regras locais, navegação). Nada no Firebase foi alterado: nem configuração, nem coleções, nem regras de segurança.

---

## PARTE A — O que mudou, de forma didática

Cada item segue o formato **Antes → Agora → Por quê**.

### 1. Navegação e login

- **Antes:** o app sempre abria no Login (mesmo logado); dava para abrir as abas sem login; a barra inferior tinha 8 ícones (telas soltas viravam abas sozinhas).
- **Agora:**
  - Ao abrir, o app espera o Firebase Auth dizer se há sessão: logado vai para o **Feed**, sem login vai para o **Login**, e conta nova vai para o **Plano personalizado**.
  - As abas só abrem com login; depois de sair, volta para o Login.
  - Barra inferior com **3 ícones** (Início, Desafios, Perfil); as outras telas abrem por atalhos.
  - "Esqueceu a senha?" envia o e-mail de redefinição (Firebase Auth que já existia).
  - Endereço inexistente mostra "Página não encontrada" no visual do app.
- **Por quê:** uma banca pergunta "o que acontece se eu sair e entrar de novo?" e "por que esse botão existe?".
- **Arquivos:** `app/index.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(auth)/login.tsx`, `app/+not-found.tsx`.

### 2. Uma fonte única para os dados do usuário (Contexts)

- **Antes:** cada tela tinha sua própria foto/nome/XP (valores fixos como "1200 pontos", "#42", "Wesley").
- **Agora:** cada assunto tem **um Context** (um "estado global"), e todas as telas leem dele:

| Context | Guarda | Arquivo |
|---|---|---|
| `UserContext` | uid, nome, @usuário, bio, foto, e-mail | `context/UserContext.tsx` |
| `XPContext` | XP, nível, histórico de conclusões, conquistas | `context/XPContext.tsx` |
| `RoutineContext` | desafios escolhidos (diários/semanais/mensais) | `context/RoutineContext.tsx` |
| `FocusContext` | cronômetro Pomodoro | `context/FocusContext.tsx` |
| `GroupsContext` | grupos de amigos | `context/GroupsContext.tsx` |
| `PostContext` | feed (Firestore, já existia) | `context/PostContext.tsx` |

- **Por quê:** trocar a foto no Perfil aparece na hora em Desafios, Ranking e Feed; o XP é o mesmo em todas as telas.
- **Isolamento entre contas:** `context/SessionProviders.tsx` recria XP, rotina, foco e grupos quando a conta muda, então nada da conta A vaza para a conta B.

### 3. Gamificação (regras num só arquivo)

Todas as regras estão em **`constants/gamification.ts`**:

- **Níveis:** 500 XP por nível, sem teto.
- **XP por frequência:** desafio diário **100**, semanal **300**, mensal **1000** XP.
- **Bônus de ciclo:** concluir todos os desafios do dia, da semana ou do mês dá um bônus igual ao valor de um desafio daquele período.
- **Foco (Pomodoro):** proporcional à duração (25 min = 100 XP, 50 min = 200 XP), até 400 XP de foco por dia.
- **Sem XP duplicado:** cada conclusão tem um id com o período (ex.: `est-1h@2026-10-23`), e o mesmo id não pontua duas vezes.
- **Sequência:** dias seguidos com pelo menos uma conclusão. **XP da semana:** de segunda até agora.
- **Conquistas:** 6 conquistas com critério verificável (ex.: "Mestre do foco" = 2.500 XP). "Desafio social" fica marcada como dependente do backend.

### 4. Desafios, rotina e catálogo

- **Antes:** 3 tarefas fixas e um botão "+XP" sem regra.
- **Agora:**
  - **Catálogo** com **106 desafios** em **12 categorias** (Estudos, Saúde, Sono, Finanças...), cada um marcado como diário, semanal ou mensal. Tem busca (ignora acentos) e filtros. Arquivo: `constants/challenges.ts`.
  - **Minha rotina:** a pessoa escolhe do catálogo (sem criar desafio livre), com limite de 8 diários, 6 semanais e 4 mensais. Os ciclos reiniciam sozinhos à meia-noite, na segunda-feira e no dia 1º.
  - **Plano personalizado** ao criar a conta: áreas de interesse → diários → semanais → mensais → resumo com o XP possível (`app/onboarding.tsx`).

### 5. Foco (Pomodoro)

- Timer 25/5 ou 50/10, com pausa longa a cada 4 focos. Pausar, continuar, reiniciar e pular (pular não dá XP).
- O tempo é calculado pelo **horário de término**, então continua certo ao trocar de tela.

### 6. Grupos de amigos (protótipo)

- Criar grupo (gera um código `FOCUS-XXXX`), **entrar com código**, tarefas do grupo criadas pelos membros, **ranking do grupo**, **mural do grupo**, convites por @usuário/e-mail, sair e excluir.
- Funciona entre contas **no mesmo aparelho** (ótimo para a apresentação). Entre aparelhos diferentes depende do backend (Parte B).
- Arquivos: `services/groupsService.ts`, `context/GroupsContext.tsx`, `app/(tabs)/groups.tsx`, `app/(tabs)/group.tsx`.

### 7. Perfil e Feed

- Editar nome, @usuário (validado), bio e foto; cancelar a edição; sair da conta com confirmação.
- **Publicar pelo Perfil**: a mesma caixa de publicação do Feed (`components/PostComposer.tsx`).
- O feed mostra o autor, carregamento, erro e estado vazio; evita clique duplo.
- **Imagens desativadas com aviso:** antes eram gravadas como caminho local (`blob:`), que outros usuários não conseguiam abrir.

### 8. Salvamento local

- XP, histórico, conquistas, rotina e grupos ficam salvos **neste aparelho**, separados por usuário (`utils/localStore.ts`, chaves `focus:v1:<uid>:...`).
- Dados corrompidos são descartados sem travar o app.

### 8b. Evolução do usuário (etapa mais recente)

- **Hábitos personalizados** (Minha rotina › aba Hábitos): nome, dias da semana (ou "Todos os dias" / "Pular — usar diariamente") e horário opcional. Cada dia programado concluído vale 100 XP. A sequência de hábitos conta só os dias programados. Arquivos: `context/HabitsContext.tsx`, `components/HabitsManager.tsx`.
- **Bônus de pontualidade:** concluir até 15 min antes ou depois do horário dá +10 XP, registrado **separado** no histórico. É informado pelo usuário (o app não verifica a execução real).
- **Minha Estante** (pelo Perfil): livros com título (o resto é opcional), status, % de leitura, registro de páginas, anotações. **Meta diária** de 10/20/30 páginas. Bater a meta vale +50 XP (1x/dia); concluir um livro com leitura registrada, +200 XP. Cadastrar livro não dá XP. Arquivos: `context/BooksContext.tsx`, `app/(tabs)/bookshelf.tsx`, `app/(tabs)/book.tsx`.
- **Histórico de XP** (pelo Perfil ou Progresso): de onde veio cada ponto, com resumo por categoria. Mesma fonte do XP (não existe uma segunda contagem). Arquivo: `app/(tabs)/xp-history.tsx`.
- **Títulos de nível:** Iniciante, Aprendiz, Determinado, Focado, Comprometido, Consistente, Disciplinado, Mestre dos Hábitos e Lendário. A fórmula de 500 XP por nível não mudou.
- **12 conquistas** com barra de progresso e mensagem de reconhecimento, liberadas por um único "observador" (`AchievementsWatcher` em `context/SessionProviders.tsx`).

### 9. O que foi removido (e por quê)

- **Tela de Exercícios** e a tela de "Desafio concluído": eram redundantes com o catálogo (Atividade física / Mente).
- **Ranking global com nomes fictícios:** foi substituído pelo ranking de cada grupo.
- **Barra inferior falsa** em Desafios, **menu ☰ e sino 🔔** sem ação, e o **menu "Acessar telas"** do cadastro.

### 10. Qualidade

- Avisos funcionam também na web (`utils/feedback.ts`; o `Alert` do React Native não aparece no navegador).
- Acessibilidade: rótulos e `aria-*` nos botões, checkboxes e abas.
- Testado em telas de 320 px a 375 px, sem rolagem horizontal.
- `npx tsc --noEmit` e `npx expo lint` sem erros.

---

## PARTE B — Guia para o membro do backend

### Como o front está organizado (onde plugar o backend)

```
Telas (app/)  →  Contexts (context/)  →  Serviço/armazenamento (services/, utils/localStore.ts)
```

As telas **não acessam o banco direto**: elas falam com os Contexts. Para ligar ao backend, troca-se a implementação dentro do Context ou do serviço, e **as telas não mudam**.

### O que hoje é local e deveria ir para o servidor

| Dado | Hoje | Sugestão no Firestore | Onde trocar no código |
|---|---|---|---|
| Nome, @usuário, bio | só na sessão (`UserContext`) | `users/{uid}`: `name`, `username`, `bio` (o cadastro já grava `name`, `email`, `bio`) | ler no `onAuthStateChanged` e gravar no `updateUser` (`context/UserContext.tsx`) |
| Foto de perfil | URI local, só na sessão | **Storage** `users/{uid}/avatar.jpg` + `avatarUrl` em `users/{uid}` | `UserContext` + tela `profile.tsx` |
| XP, histórico e conquistas | `focus:v1:<uid>:progresso` (aparelho) | `users/{uid}/completions/{id}` (id já é único por período) e `users/{uid}.unlockedAt` | `context/XPContext.tsx` (funções `loadJSON`/`saveJSON`) |
| Rotina escolhida | `focus:v1:<uid>:rotina` | `users/{uid}.routine = { selectedIds[], planned }` | `context/RoutineContext.tsx` |
| Grupos | registro do aparelho `focus:v1:grupos` | ver **`docs/CONTRATO_GRUPOS.md`** (coleções, campos e regras) | trocar `localGroupsService` em `context/GroupsContext.tsx` |
| Imagens dos posts | desativadas | Storage + `imageUrl` no post | `hooks/usePublishPost.ts` e `components/PostComposer.tsx` |
| Hábitos | `focus:v1:<uid>:habitos` | `users/{uid}/habits/{habitId}`: `title`, `days[]`, `time`, `createdAt` | `context/HabitsContext.tsx` |
| Estante e leituras | `focus:v1:<uid>:estante` | `users/{uid}/books/{bookId}` + `users/{uid}/readingLogs/{logId}` + `dailyGoal` em `users/{uid}` | `context/BooksContext.tsx` |
| Capa do livro | só link (URL) | Storage `users/{uid}/books/{bookId}.jpg` | `bookshelf.tsx` / `book.tsx` |

### Melhorias recomendadas (em ordem de prioridade)

1. **Ler `users/{uid}` após o login.** Hoje quem só faz login aparece como "Usuário". É uma leitura (`getDoc`) dentro do `onAuthStateChanged` em `UserContext.tsx`.
2. **Persistir progresso e rotina no Firestore**, mantendo os mesmos formatos já usados localmente (assim a migração é direta).
3. **Grupos reais** seguindo `docs/CONTRATO_GRUPOS.md`: `memberIds` nas regras, ids determinísticos em `completions` para impedir pontuação duplicada.
4. **Firebase Storage** para foto de perfil e fotos do mural do grupo, com regra "só membros do grupo leem".
5. **Sessão no celular:** `config/firebase.ts` usa `getAuth` sem persistência nativa. No Android/iOS, usar `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`.
6. **Versão do AsyncStorage:** está a 3.0.1, mas o Expo SDK 54 espera a 2.2.0. Rodar `npx expo install @react-native-async-storage/async-storage` para salvar também no celular (no Expo Go).
7. **Regras de segurança:** hoje o feed exige login (bom). Conferir se `posts` só permite criar com `userId == request.auth.uid`.
8. **Ícones e splash:** o `app.json` aponta para arquivos em `assets/images/` que não existem (`icon.png`, `favicon.png`, `splash-icon.png`, `android-icon-*.png`).

### Pontos de atenção

- **Regras de XP no servidor:** as regras de pontuação estão no front (`constants/gamification.ts`). Para evitar trapaça, o ideal é o servidor validar (ex.: Cloud Function que confere período e valor ao gravar uma conclusão).
- **Datas por fuso:** os períodos usam o dia, a semana e o mês **locais** do aparelho. Se o servidor calcular algo, usar o mesmo critério.
