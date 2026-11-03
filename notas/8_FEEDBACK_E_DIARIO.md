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
