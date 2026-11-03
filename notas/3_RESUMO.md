# 3 — Resumo de tudo que aconteceu

## Ponto de partida

O Focus tinha as telas e o visual roxo prontos, mas com problemas: erros de TypeScript, 8 ícones na barra, dados fixos ("Nível 12", "1200 pontos", "Wesley"), botões sem ação, telas sem ligação entre si e XP diferente em cada tela.

## O que foi feito, em etapas

1. **Estabilidade:** corrigidos os erros de TypeScript, os providers duplicados, os textos minúsculos na web e a barra falsa.
2. **Navegação:** barra com 3 ícones, atalhos para as telas secundárias e um botão voltar que funciona.
3. **Dados integrados:** um Context para cada assunto (usuário, XP, rotina, foco, grupos). Foto, nome e XP iguais em todas as telas.
4. **Gamificação:** XP, níveis (500 XP cada), conquistas, sequência e XP da semana com regras reais e sem pontuação duplicada.
5. **Ciclos:** rotina diária/semanal/mensal com bônus por ciclo completo e cronômetro de foco (Pomodoro).
6. **Catálogo:** 106 desafios em 12 categorias, com busca e filtros; a pessoa escolhe em vez de criar.
7. **Auditoria para a banca:** isolamento entre contas, login lembrado, abas protegidas, imagens desativadas com aviso honesto, ranking sem nomes que parecessem reais.
8. **Salvamento local:** progresso, rotina e grupos salvos no aparelho, por usuário.
9. **Plano personalizado** ao criar a conta; **XP proporcional** (diário 100 · semanal 300 · mensal 1000; foco 25 min = 100, 50 min = 200).
10. **Grupos de amigos:** criar, entrar com código, tarefas do grupo, ranking e mural (protótipo que funciona no mesmo aparelho).
11. **Ajustes finais:** publicar pelo Perfil, sequência explicada, XP da semana desde segunda-feira, remoção da tela de Exercícios (redundante) e página "não encontrada".
12. **Evolução do usuário:** hábitos personalizados (dias e horário opcional) com **bônus de pontualidade** (+10 XP em ±15 min), **Minha Estante** (livros, progresso, anotações) com **meta diária de leitura**, **Histórico de XP** por categoria, **títulos de nível** (Iniciante → Lendário), 12 conquistas com barra de progresso e mensagens de reconhecimento, e o Perfil com "Sua evolução".

## Como está agora

- **Funciona de verdade (front-end):** login/cadastro/recuperar senha (Firebase), feed de texto (Firestore), perfil com evolução, desafios, rotina, hábitos com pontualidade, catálogo, plano, foco, estante e meta de leitura, histórico de XP, níveis com título, conquistas, grupos (no mesmo aparelho), salvamento local.
- **Depende do backend:** nome e bio após o login, progresso na nuvem, fotos (perfil, feed e grupo), grupos entre aparelhos, convites que chegam aos amigos. Os detalhes estão na nota 1 (Parte B) e em `docs/CONTRATO_GRUPOS.md`.
- **Qualidade:** `npx tsc --noEmit` e `npx expo lint` sem erros; compila para web; testado em tela de celular (320–375 px).

## Para a apresentação

1. Crie uma conta → monte o plano.
2. Conclua desafios → veja o XP, o nível e as conquistas.
3. Rode um foco (ou mostre o 50/10 valendo 200 XP).
4. Crie um grupo, anote o código, saia, entre com **outra conta** e use o código → as duas competem no ranking do grupo.
5. Troque a foto no Perfil → ela aparece em Desafios e no Ranking.
6. Crie um hábito com o horário de agora → marque em Desafios → "⏰ No horário! +10 XP".
7. Na Minha Estante, defina a meta de 10 páginas, cadastre um livro e registre +10 → meta alcançada; veja tudo no Histórico de XP.

## Onde está cada coisa

- **Relatório técnico completo (todas as etapas):** `RELATORIO_AJUSTES_FRONTEND.md`
- **Contrato de grupos para o backend:** `docs/CONTRATO_GRUPOS.md`
- **Estas notas:** pasta `notas/`
