# 4 — Funcionalidades das tarefas diárias (lista do grupo)

Base: `feedback projeto.txt`. Só front-end: nada de Firebase; tudo fica salvo no aparelho, por usuário (como a Estante e os Hábitos).

## Como usar

Em **Desafios**, cada tarefa tem um **›** que abre a tela dela (`app/(tabs)/task.tsx`). Lá ficam o **lembrete** (ligar/desligar e escolher o horário) e as funções da tarefa. As tarefas que têm critério (cronômetro, 3 gratidões etc.) **se marcam sozinhas** quando você cumpre o critério. As outras continuam com o checkbox.

## Lembretes visíveis

- Em Desafios, cada tarefa tem um **sininho** à direita: 🔔 roxo = lembrete ligado, 🔕 apagado = desligado. O horário aparece embaixo do nome (ex.: “🔔 14:00”). Tocar no sininho abre a tarefa.
- Acima de “Tarefas de Hoje” aparece o aviso **“Novidade: lembretes nas tarefas”**, com **Ligar todos** (liga todos nos horários sugeridos e pede a permissão uma vez) e **Agora não**. O aviso some depois disso.

## Roteiro de teste

1. **Desafios:** veja o aviso de novidade e os sininhos. Toque em **Ligar todos** e permita as notificações. Os sininhos ficam roxos e aparece “🔔 hh:mm” em cada tarefa.
2. **Lembrete:** abra uma tarefa, coloque um horário daqui a 2 minutos e toque em “Salvar horário”. Deixe o Focus aberto: no navegador o aviso só chega assim; no celular chega mesmo fechado.
3. **Estudar 1 hora:** Iniciar → o tempo conta. Saia e volte: continua contando. No celular, aparece na barra de notificações.
4. **Escrever 3 gratidões:** adicione 3 → o desafio é marcado sozinho; “Mais citadas no mês” conta as palavras.
5. **3 prioridades do dia:** escreva as 3 e marque → o desafio é marcado.
6. **Tarefa que está adiando:** crie uma com prazo de ontem (ex.: 28/10) → aparece em “⚠️ Atrasadas”. Marque → o desafio é marcado.
7. **Dormir 8 horas:** em “Meu sono”, salve 23:00 e 07:00. Em “Como foi a noite”, registre 22:30 e 07:00 → 8,5 h ✓.
8. **Sem telas / Arrumar a cama / Acordar:** o lembrete usa os horários de “Meu sono” (30 min antes de dormir / 30 min depois de acordar / na hora de acordar).
9. **Dormir antes das 23h:** botões de soneca +5/+10/+15 min.
10. **Resumo → Revisar flashcards:** salve um resumo, crie um flashcard e depois revise (Mostrar resposta → Acertei).
    - **Atalho ✏️:** em Desafios, as tarefas com algo salvo (flashcards, resumo, artigo, texto livre, gratidões) ganham um lápis ao lado do sino. Ele abre a tarefa já no que foi salvo.
    - **Editar depois de feito:** em “Meus flashcards” (ou dentro do resumo aberto), toque no cartão → vê a resposta → **✏️ Editar** → Salvar alterações. Resumos, anotações do artigo/texto livre e gratidões funcionam igual (toque → ▼ ver → ✏️ Editar ou Apagar). Aparece “editado”, e editar não dá XP de novo.
11. **Mensagem / Elogio:** adicione um nome e toque em “Feito” → mostra “última vez”.
12. **Desenhar:** anexe uma imagem → aparece na galeria com data e contagem da semana/mês.
13. **Texto livre:** escreva e salve; anexe um PDF.
14. **Ler 20 páginas:** registre páginas num livro da Estante → o progresso aparece na tarefa e na lista.
15. **Usar celular menos de 3h / 8 mil passos:** digite o número do dia → marca se cumprir a meta.
16. **Catálogo (Minha rotina):** “Compra por impulso”, “Bicicleta” e “Planejar o dia” não aparecem mais; “Organizar o quarto” substitui “Organizar a mesa”.
17. **Recarregue a página:** tudo continua salvo e nenhum XP é contado duas vezes.

## Arquivos

- Novos: `app/(tabs)/task.tsx`, `context/TaskExtrasContext.tsx`, `constants/taskFeatures.ts`, `services/notifications.ts`, esta nota.
- Alterados: `app/(tabs)/challenges.tsx` (sininho, aviso, linha de progresso), `app/(tabs)/_layout.tsx` (rota /task), `context/SessionProviders.tsx`, `context/RoutineContext.tsx` (rotina antiga não se perde quando um desafio sai do catálogo), `constants/challenges.ts`, `package.json` (expo-notifications e expo-document-picker).
- Não mexi: Firebase, login, cores, fontes e layout das outras telas.

## O que entrou (etapa 1)

| Tarefa | O que faz |
|---|---|
| Todas | Lembrete com horário próprio (semanais: escolhe o dia) |
| Estudar 1h · Idioma 15 min · Meditar · Caminhar 30 min · 2h sem redes | Cronômetro; no celular fica na barra de notificações e avisa no fim; conclui ao bater o tempo |
| Revisar flashcards | Revisão (mostrar resposta, acertei/errei); conclui ao revisar 5 cartões (ou todos, se houver menos) |
| Resumo | Salva resumos e cria flashcards ligados a eles |
| Ler 20 páginas / Ler 15 min | Ligados à Minha Estante (páginas do dia / cronômetro) |
| Ler um artigo · Texto livre | Anotações com data e hora; texto livre também aceita PDF/Word/TXT |
| Escrever 3 gratidões | 3 por dia com horário + “mais citadas no mês” + dias anteriores |
| 3 prioridades do dia | A pessoa escreve as 3 e marca; conclui com as 3 feitas |
| Tarefa que está adiando | Lista de pendências com prazo; vencidas aparecem em “Atrasadas” |
| Sono (dormir cedo, 8h, sem telas, acordar, arrumar a cama) | “Meu sono” (dormir/acordar) define os lembretes: telas 30 min antes de dormir, cama 30 min depois de acordar; soneca de 5/10/15 min; registro das horas dormidas com gráfico da semana |
| Mensagem / Elogio | Lista de pessoas e quando foi a última vez |
| Desenhar | Galeria de imagens com data e contagem semanal/mensal |
| Silenciar notificações · Meditar | Botão que abre o “Não perturbe” do celular |
| Usar menos de 3h o celular · 8 mil passos | Registro do número do dia (vem do Bem-estar digital / app de saúde) |
| Água, fruta, salada, refrigerante, postura, café, alongar, escada, treino, respirar, pausa, e-mail, quarto, louça, instrumento | Lembrete + checkbox |

Mudanças no catálogo: saíram “Evitar compra por impulso”, “Andar de bicicleta” e “Planejar o dia” (que virou o semanal “Planejar a semana”, com lembrete no dia escolhido). “Organizar a mesa” virou “Organizar o quarto”.

## Finanças (funções do Squill)

Tela **Minhas finanças** (`app/(tabs)/finance.tsx`), aberta pelo atalho 💰 Finanças em Desafios ou pelas tarefas de finanças:

| Squill | No Focus | Cumpre na rotina |
|---|---|---|
| Despesas e receitas com categoria (editar/excluir) | Aba Lançamentos + lançamento rápido na tarefa | Anotar os gastos do dia (ou “Hoje não gastei nada”) |
| Total da semana e gráfico por categoria | Aba Resumo: hoje/semana/mês, barras por dia, categorias com % | Revisar o orçamento |
| Histórico dos últimos 3 meses | Lançamentos por mês com total | Fechar a planilha de gastos do mês |
| Metas com prazo, “+”, R$/mês ou R$/dia | Aba Cofrinhos + meta de economia do mês | Guardar um valor · Bater a meta de economia do mês |
| Textos de educação financeira | Aba Aprender | Aprender algo sobre finanças |
| — (pedido do txt) | Limite de gastos do mês com aviso em 80% e 100% | — |

Mascote e tela “História” do Squill não entraram (são a identidade do outro app). Arquivos: `constants/finance.ts`, `context/FinanceContext.tsx`, `app/(tabs)/finance.tsx`.

**Testar:** abra “Anotar os gastos do dia”, anote “Lanche 12,50” → tarefa marcada. Em Minhas finanças: registre uma receita, veja o Resumo, coloque um limite pequeno (ex.: 15) → aviso de 80%. Crie um cofrinho, toque em “＋ Guardar”, defina a meta do mês. Abra um texto em Aprender.

## Próximas etapas (ainda não feitas)

- **Diário:** aguardando o sistema da Angela.
- **Semanais:** simulado, revisão da semana ligada às anotações, mapa mental com palavras-chave, backlog de videoaulas, capítulo do livro, biblioteca, plano de refeições/calorias, treinar 3x com layout novo.
- **Só no celular:** sensor de passos (expo-sensors) e despertador com som personalizado. Spotify exige login e API própria, então fica fora do escopo do front-end.
- **Tempo de tela automático:** o Android/iOS não liberam esse dado para apps Expo. Por isso a medição é informada pela pessoa.

## Limites honestos

- No navegador, o lembrete só aparece com o Focus aberto. No celular ele chega com o app fechado.
- O “Não perturbe” não pode ser ligado por um app; o botão só abre a tela do sistema.
- Documentos anexados no navegador só abrem até recarregar a página.
