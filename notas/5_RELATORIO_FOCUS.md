# 5 — Itens do "relatorio FOCUS.txt"

Só front-end. **O Firebase não foi alterado.** Tudo continua salvo no aparelho, por usuário. Cada parte passa por um "service" com interface pronta para trocar pela versão com Firebase:

- `profileService`: perfil e @usuário.
- `publicProfileService`: o que os amigos veem.
- `groupsService`: grupos.

Os pontos de troca estão marcados com `// TODO Firebase`.

## Decisões que você validou

- **Feed:** saiu. A casinha abre Desafios (o hub) e o troféu abre Conquistas. As postagens continuam no Perfil e nos murais dos grupos.
- **@usuário:** fica só no aparelho, sem mexer no `setDoc`. O login por @ funciona com as contas deste aparelho.
- **Anti-farm de XP:**
  - Hábito criado pela pessoa vale metade (50 XP).
  - Metas próprias semanais/mensais pedem check-in por dia (só hoje), um mínimo de 3 dias (semana) ou 8 dias (mês), e no máximo 3 por frequência. Valem metade do XP. Nas mensais, cada check-in exige uma anotação.
  - Semanais e mensais do catálogo **não têm mais "Marcar como feito"**: concluem pelo registro ou pela verificação.
- **Emojis:** todos trocados por Ionicons (`@expo/vector-icons`), mantendo cores e tamanhos.

## O que entrou

| Pedido | Onde | Como testar |
|---|---|---|
| Confirmação de exclusão em telinha (Squill) | `components/DialogHost.tsx` (vale para todo o app) | Apague qualquer coisa: aparece a telinha roxa com Cancelar/Apagar |
| "Bem-vindo, X" | Desafios (primeiro nome) | Cadastre com nome; recarregue: o nome continua |
| Cadastro com nome + @ / login com @ ou e-mail | `register.tsx`, `login.tsx` | Cadastre `ana.estuda`; saia; entre com `@ana.estuda` |
| Diárias na barra; semanais/mensais com "Reveja seus objetivos" | Central de lembretes (`/reminders`) | Resumo de manhã, aviso à noite se faltar tarefa, semanal no dia escolhido, mensal nos dias 1 e 20 |
| Ajustar os desafios prontos | Tela da tarefa › "Ajustar nome e descrição" | Renomeie; o XP e a regra continuam |
| Modo foco (Não perturbe + temporizador) | Tela Foco | Botão abre o Não perturbe; no celular o timer fica fixo na barra |
| Agenda integrada aos grupos | `/agenda` | Marque um encontro num grupo: ele aparece na agenda; aviso 30 min antes |
| ADM nos grupos | Grupo › Membros / Tarefas | Criador promove ou tira ADM; ADM remove membros, cria tarefas com regra (livre / com prova / ADM aprova) e aprova ou recusa |
| Comparar quanto guardou (Squill) + bônus | Grupo › Membros › Configurações › "Comparar quanto cada um guardou" | Ranking em Grupo › Ranking; quem mais guardar no mês ganha o bônus (+100/200/300 XP) |
| Perfil estilo Steam + Discord | Perfil (lápis) | Capa (cor ou imagem), status, vitrine de até 6 insígnias, estante pública e resenhas; "Ver como meus amigos veem"; tocar num membro do grupo abre o perfil dele |
| Despertador com música | "Acordar no horário planejado" | Escolha uma música do aparelho, a soneca e o link da playlist. No horário de "Meu sono" aparece a tela do despertador; "Estou de pé" conclui a tarefa |
| Passos por sensor | "Dar 8.000 passos" / "Caminhar 30 min" | Só no celular (expo-sensors); no navegador, use o campo manual |
| Compartilhar anexos com um amigo | Mapa mental, Meus projetos | Botão Compartilhar (menu do sistema / WhatsApp) |

## Semanais e mensais (cada uma com verificação)

| Tarefa | Como conclui |
|---|---|
| Simulado | Salvar acertos/questões (mínimo de 5 questões) |
| Revisar o conteúdo da semana | Lista do que você estudou na semana (resumos, artigos, flashcards, simulados, aulas) + palavras-chave; revisar 3 itens |
| Mapa mental / Revisar a matéria do mês | Palavras-chave geradas do que foi estudado; título + tópicos, anexo ou 3 palavras |
| Videoaula | Backlog com título e link; conclui ao marcar "Assisti" |
| Terminar capítulo | Só se o livro teve páginas registradas na semana |
| Anotar o que aprendeu | Anotação de 30+ letras sobre um livro |
| Ler um livro inteiro | Livro concluído na Estante, no mês |
| Resenha | 100+ letras de um livro terminado; pode ser pública |
| Biblioteca/livraria (virou mensal) | Lugar + livro do mês (entra na estante) |
| Refeições da semana | Quadro estilo planilha com calorias; 5 dias com 2+ refeições |
| Treinar 3x na semana | Layout de dias (só hoje e dias passados) ou "Treinar 30 min" concluído |
| Hobbies (unificados, com Natureza) | Somar 60 min na semana |
| Planejar a semana | Quadro dia × turno; 5 dias preenchidos |
| Organizar a agenda | 2 compromissos futuros na semana |
| Revisar metas | Cartões de metas estilo flashcard; revisar todos |
| Mesmo horário de sono / Mês de sono regular | 5 noites (semana) ou 20 (mês) com até 1 h de diferença; relatório |
| Água, fruta, meditar, casa, celular e redes (mensais) | Contam os dias da diária concluída; a meta só pode subir |
| Treinos do mês / Corrida | Contagem automática / km com relatório (ritmo impossível é recusado) |
| Curso, projeto, criação, aprender algo novo | "Meus projetos" (um lugar só): progresso em 3+ dias diferentes para concluir |
| Encontro com amigos | Marcar um encontro num grupo para este mês |
| Esporte, cozinhar, família, faxina, roupas, limpar celular, treino novo | Prova: anotação de 15+ letras ou foto |

**Saíram do catálogo** (como o relatório pediu):
- Natureza (foi para os hobbies) e arquivos do PC.
- Doar, encontrar amigo, ajudar alguém, estudar em grupo e manhã sem celular.
- Ensaio de fotos, dia de descanso, armário, voluntário e backup.

**Trocas:**
- Yoga → "Experimentar um treino novo".
- Check-up e água do mês → "Água em 25 dias" e "Fruta em 20 dias".
- Detox de fim de semana → "20 dias com menos de 3h" e "15 dias longe das redes".

## Limites honestos

- Grupos, perfil público e login por @ funcionam entre contas **do mesmo aparelho**. Entre aparelhos diferentes, depende do Firebase.
- O despertador só toca a música com o app aberto. Fechado, chega a notificação com o som do sistema. O Spotify não deixa outro app tocar a música dele; o Focus abre a playlist.
- Sensor de passos e notificações reais: só no celular (não testei em aparelho).
- Diário da Angela: continua aguardando.

## Arquivos

- **Novos:**
  - Telas: `app/(tabs)/agenda.tsx`, `projects.tsx`, `reminders.tsx`, `user.tsx`.
  - Componentes: `components/DialogHost.tsx`, `ScreenShell.tsx`, `PlannerModules.tsx`, `DeviceModules.tsx`, `AlarmOverlay.tsx`, `ProfileShowcase.tsx`, `CustomGoals.tsx`.
  - Contexto e hook: `context/PlannerContext.tsx`, `hooks/useAgenda.ts`.
  - Serviços: `services/profileService.ts`, `publicProfileService.ts`.
  - Constantes: `constants/motivation.ts`, `icons.ts`.
  - Utilitários: `utils/files.ts`, `focusMode.ts`.
  - Som: `assets/sounds/alarme.wav` (toque gerado por nós).
- **Pacotes:** `expo-audio`, `expo-sensors`.
