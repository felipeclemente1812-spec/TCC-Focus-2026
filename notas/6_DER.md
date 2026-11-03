# DER — Focus

Diagrama Entidade-Relacionamento do Focus, tirado do código atual (`context/`, `services/`, `constants/`).

- **Modelo lógico.** Hoje o app guarda tudo no aparelho, em AsyncStorage, por usuário. A estrutura já é a que vai para o **Firebase (Firestore)**: cada entidade vira uma coleção ou subcoleção (ver o mapeamento no fim).
- **Notação.** Pé de galinha (crow's foot), com PK = chave primária, FK = chave estrangeira e UK = única.
  - `||--o{` lê-se "um para zero ou muitos".
  - `||--|{` lê-se "um para um ou muitos".
  - `|o--o{` indica uma FK opcional.
- **Como gerar a imagem.** Cole cada bloco em <https://mermaid.live> e exporte em PNG ou SVG. Outra opção é abrir `DER_Focus.html` no navegador, que tem um botão de download por diagrama.

---

## 0. Visão geral (entidades principais)

```mermaid
erDiagram
    USUARIO ||--o{ ROTINA_DESAFIO : monta
    DESAFIO ||--o{ ROTINA_DESAFIO : "faz parte de"
    CATEGORIA ||--|{ DESAFIO : agrupa
    USUARIO ||--o{ CONCLUSAO_XP : ganha
    USUARIO ||--o{ HABITO : cria
    USUARIO ||--o{ META_PROPRIA : cria
    USUARIO ||--o{ LIVRO : "tem na estante"
    USUARIO ||--o{ TRANSACAO : registra
    USUARIO ||--o{ COFRINHO : possui
    USUARIO ||--o{ PROJETO : acompanha
    USUARIO ||--o{ COMPROMISSO : agenda
    USUARIO ||--o{ USUARIO_CONQUISTA : desbloqueia
    CONQUISTA ||--o{ USUARIO_CONQUISTA : "é desbloqueada"
    USUARIO ||--o{ MEMBRO_GRUPO : participa
    GRUPO ||--|{ MEMBRO_GRUPO : tem
    GRUPO ||--o{ TAREFA_GRUPO : define
    GRUPO ||--o{ ENCONTRO : marca
    USUARIO ||--o{ POSTAGEM : publica
```

---

## 1. Usuário e gamificação

```mermaid
erDiagram
    USUARIO {
        string uid PK "id do Firebase Auth"
        string nome
        string username UK "@ sem arroba"
        string email UK
        string bio
        string avatar_url
        string banner_url "capa (imagem)"
        string banner_preset "roxo, noite, aurora..."
        string status "frase curta"
        boolean mostrar_livros "perfil público"
        boolean mostrar_estatisticas "perfil público"
        datetime criado_em
    }
    CONQUISTA {
        string id PK
        string titulo
        string descricao
        string icone
    }
    USUARIO_CONQUISTA {
        string uid PK,FK
        string conquista_id PK,FK
        datetime desbloqueada_em
        boolean em_destaque "vitrine (até 6)"
    }
    CONCLUSAO_XP {
        string id PK "origem@período, ex.: est-1h@2026-10-31"
        string uid FK
        string titulo
        int xp
        datetime data_hora
    }
    USUARIO ||--o{ USUARIO_CONQUISTA : desbloqueia
    CONQUISTA ||--o{ USUARIO_CONQUISTA : ""
    USUARIO ||--o{ CONCLUSAO_XP : ganha
```

> O nível, a sequência de dias e o XP da semana **não são guardados**: são calculados a partir de `CONCLUSAO_XP`. O id com período (dia, semana ou mês) impede ganhar XP duas vezes pela mesma tarefa.

---

## 2. Rotina, desafios, hábitos e lembretes

```mermaid
erDiagram
    CATEGORIA {
        string id PK "estudos, leitura, saude..."
        string nome
        string icone
    }
    DESAFIO {
        string id PK "ex.: est-1h, mes-lei-livro"
        string categoria_id FK
        string titulo
        string descricao
        string frequencia "diario | semanal | mensal"
        int xp
        string regra_conclusao "checkbox | automatica | prova"
    }
    ROTINA_DESAFIO {
        string uid PK,FK
        string desafio_id PK,FK
        string titulo_personalizado
        string descricao_personalizada
        boolean lembrete_ligado
        string horario_lembrete "HH:MM (só diárias)"
    }
    HABITO {
        string id PK
        string uid FK
        string titulo
        string dias_semana "0-6"
        string horario "opcional"
        datetime criado_em
    }
    META_PROPRIA {
        string id PK
        string uid FK
        string titulo
        string frequencia "semanal | mensal"
        int dias_meta "mín. 3 / 8"
        datetime criado_em
    }
    CHECKIN_META {
        string meta_id PK,FK
        date dia PK
        string anotacao "obrigatória nas mensais"
    }
    CONFIG_LEMBRETES {
        string uid PK,FK
        boolean ligado
        string resumo_manha
        string aviso_noite
        int dia_semanal
        string horario_semanal
        boolean mensal "dias 1 e 20"
    }
    PROVA {
        string id PK
        string uid FK
        string desafio_id FK
        string periodo "semana ou mês"
        string texto
        string anexo_id FK "opcional"
        datetime criado_em
    }
    CATEGORIA ||--|{ DESAFIO : agrupa
    USUARIO ||--o{ ROTINA_DESAFIO : monta
    DESAFIO ||--o{ ROTINA_DESAFIO : ""
    USUARIO ||--o{ HABITO : cria
    USUARIO ||--o{ META_PROPRIA : cria
    META_PROPRIA ||--o{ CHECKIN_META : recebe
    USUARIO ||--|| CONFIG_LEMBRETES : configura
    USUARIO ||--o{ PROVA : envia
    DESAFIO ||--o{ PROVA : comprova
```

---

## 3. Estudos e leitura

```mermaid
erDiagram
    ANOTACAO {
        string id PK
        string uid FK
        string desafio_id FK "resumo, artigo, gratidão, texto livre, reflexão"
        string titulo
        string texto
        datetime criado_em
        datetime editado_em
    }
    FLASHCARD {
        string id PK
        string uid FK
        string resumo_id FK "ANOTACAO (opcional)"
        string frente
        string verso
        datetime criado_em
    }
    REVISAO_FLASHCARD {
        string id PK
        string flashcard_id FK
        date dia
        boolean acertou
    }
    SIMULADO {
        string id PK
        string uid FK
        string titulo
        int acertos
        int total_questoes
        date dia
    }
    VIDEOAULA {
        string id PK
        string uid FK
        string titulo
        string link
        datetime assistida_em "nulo = backlog"
    }
    MAPA_MENTAL {
        string id PK
        string uid FK
        string escopo "semana | mês"
        string periodo
        string titulo
        string topicos
        string palavras_chave
    }
    LIVRO {
        string id PK
        string uid FK
        string titulo
        string autor
        int paginas
        string capa_url
        string status "quero | lendo | concluido"
        int pagina_atual
        datetime concluido_em
    }
    REGISTRO_LEITURA {
        string id PK
        string livro_id FK
        int paginas
        date dia
    }
    CAPITULO {
        string id PK
        string livro_id FK
        int numero
        date dia
    }
    RESENHA {
        string id PK
        string livro_id FK "UK: 1 por livro"
        string texto
        int nota "1 a 5"
        boolean publica
        datetime criado_em
    }
    VISITA_BIBLIOTECA {
        string id PK
        string uid FK
        string mes
        string local
        string livro_id FK "livro do mês"
    }
    USUARIO ||--o{ ANOTACAO : escreve
    ANOTACAO |o--o{ FLASHCARD : gera
    USUARIO ||--o{ FLASHCARD : cria
    FLASHCARD ||--o{ REVISAO_FLASHCARD : revisado
    USUARIO ||--o{ SIMULADO : faz
    USUARIO ||--o{ VIDEOAULA : guarda
    USUARIO ||--o{ MAPA_MENTAL : monta
    USUARIO ||--o{ LIVRO : "tem na estante"
    LIVRO ||--o{ REGISTRO_LEITURA : recebe
    LIVRO ||--o{ CAPITULO : tem
    LIVRO ||--o| RESENHA : "tem (0 ou 1)"
    USUARIO ||--o{ VISITA_BIBLIOTECA : registra
    LIVRO ||--o{ VISITA_BIBLIOTECA : "escolhido em"
```

---

## 4. Finanças (funções do Squill)

```mermaid
erDiagram
    TRANSACAO {
        string id PK
        string uid FK
        string tipo "despesa | receita"
        string nome
        decimal valor
        string categoria "casa, mercado, salario..."
        date dia
        datetime criado_em
    }
    COFRINHO {
        string id PK
        string uid FK
        string nome
        string descricao
        string cor
        decimal valor_alvo
        date prazo
        datetime criado_em
    }
    DEPOSITO {
        string id PK
        string cofrinho_id FK
        decimal valor
        date dia
    }
    CONFIG_FINANCAS {
        string uid PK,FK
        decimal limite_gastos_mes
        decimal meta_economia_mes
    }
    DIA_SEM_GASTO {
        string uid PK,FK
        date dia PK
    }
    ARTIGO_LIDO {
        string uid PK,FK
        string artigo_id PK
    }
    MES_FECHADO {
        string uid PK,FK
        string mes PK "M2026-10"
    }
    USUARIO ||--o{ TRANSACAO : registra
    USUARIO ||--o{ COFRINHO : possui
    COFRINHO ||--o{ DEPOSITO : recebe
    USUARIO ||--|| CONFIG_FINANCAS : define
    USUARIO ||--o{ DIA_SEM_GASTO : marca
    USUARIO ||--o{ ARTIGO_LIDO : "lê"
    USUARIO ||--o{ MES_FECHADO : fecha
```

---

## 5. Grupos e social

```mermaid
erDiagram
    GRUPO {
        string id PK
        string nome
        string codigo UK "FOCUS-XXXX"
        string dono_uid FK
        boolean so_adm_cria_tarefa
        boolean comparar_economia
        int bonus_economia_xp
        datetime criado_em
    }
    MEMBRO_GRUPO {
        string grupo_id PK,FK
        string uid PK,FK
        string papel "criador | adm | membro"
        datetime entrou_em
    }
    CONVITE {
        string grupo_id PK,FK
        string handle PK "@usuario ou e-mail"
        string status
        datetime convidado_em
    }
    TAREFA_GRUPO {
        string id PK
        string grupo_id FK
        string titulo
        string frequencia
        string regra "livre | prova | aprovacao"
        string criada_por FK
    }
    CONCLUSAO_GRUPO {
        string id PK
        string tarefa_id FK
        string uid FK
        string periodo
        int xp
        string prova
        string status "ok | pendente | recusada"
        string revisado_por FK "ADM"
    }
    ENCONTRO {
        string id PK
        string grupo_id FK
        string titulo
        date dia
        string hora
        string local
        string criado_por FK
    }
    PRESENCA {
        string encontro_id PK,FK
        string uid PK,FK
    }
    POSTAGEM {
        string id PK
        string uid FK
        string grupo_id FK "nulo = perfil"
        string texto
        string imagem_url
        datetime criado_em
    }
    ECONOMIA_GRUPO {
        string grupo_id PK,FK
        string uid PK,FK
        string mes PK
        decimal valor_guardado
    }
    USUARIO ||--o{ GRUPO : "é dono"
    GRUPO ||--|{ MEMBRO_GRUPO : tem
    USUARIO ||--o{ MEMBRO_GRUPO : participa
    GRUPO ||--o{ CONVITE : envia
    GRUPO ||--o{ TAREFA_GRUPO : define
    TAREFA_GRUPO ||--o{ CONCLUSAO_GRUPO : "é concluída"
    USUARIO ||--o{ CONCLUSAO_GRUPO : conclui
    GRUPO ||--o{ ENCONTRO : marca
    ENCONTRO ||--o{ PRESENCA : tem
    USUARIO ||--o{ PRESENCA : confirma
    USUARIO ||--o{ POSTAGEM : publica
    GRUPO |o--o{ POSTAGEM : "mural de"
    GRUPO ||--o{ ECONOMIA_GRUPO : compara
```

---

## 6. Planejamento e bem-estar

```mermaid
erDiagram
    COMPROMISSO {
        string id PK
        string uid FK
        string titulo
        date dia
        string hora
        string tipo "compromisso | prova | prazo"
        string observacao
        boolean avisar
    }
    PROJETO {
        string id PK
        string uid FK
        string tipo "curso | projeto | criacao | aprender"
        string titulo
        string descricao
        date inicio
        date prazo
        int carga_horaria
        datetime concluido_em
    }
    PROGRESSO_PROJETO {
        string id PK
        string projeto_id FK
        string texto
        date dia
    }
    ANEXO {
        string id PK
        string uid FK
        string dono_tipo "projeto | mapa | desafio | prova"
        string dono_id
        string url
        string nome
        string tipo "imagem | documento"
    }
    CARTAO_META {
        string id PK
        string uid FK
        string titulo
        string motivo
        string mes "nulo = geral"
    }
    REVISAO_META {
        string cartao_id PK,FK
        string semana PK
        string resultado "no caminho | ajustar"
    }
    CONFIG_SONO {
        string uid PK,FK
        string hora_dormir
        string hora_acordar
        boolean despertador_ligado
        string som_url
        string playlist_url
        int soneca_min
    }
    REGISTRO_SONO {
        string uid PK,FK
        date dia PK
        string dormiu
        string acordou
        decimal horas
    }
    REFEICAO {
        string id PK
        string uid FK
        string semana
        int dia_semana
        string turno "café | almoço | lanche | jantar"
        string descricao
        int kcal
    }
    TREINO_DIA {
        string uid PK,FK
        date dia PK
    }
    CORRIDA {
        string id PK
        string uid FK
        decimal km
        int minutos
        date dia
    }
    HOBBY {
        string id PK
        string uid FK
        string nome
    }
    REGISTRO_HOBBY {
        string id PK
        string hobby_id FK
        int minutos
        string anotacao
        date dia
    }
    PESSOA {
        string id PK
        string uid FK
        string nome
    }
    CONTATO_PESSOA {
        string id PK
        string pessoa_id FK
        string desafio_id FK "mensagem | elogio"
        date dia
    }
    PENDENCIA {
        string id PK
        string uid FK
        string titulo
        date prazo "vencida = atrasada"
        datetime feita_em
    }
    MEDICAO {
        string uid PK,FK
        string desafio_id PK,FK "passos, tempo de tela"
        date dia PK
        int valor
    }
    USUARIO ||--o{ COMPROMISSO : agenda
    USUARIO ||--o{ PROJETO : acompanha
    PROJETO ||--o{ PROGRESSO_PROJETO : registra
    USUARIO ||--o{ ANEXO : envia
    USUARIO ||--o{ CARTAO_META : cria
    CARTAO_META ||--o{ REVISAO_META : revisado
    USUARIO ||--|| CONFIG_SONO : configura
    USUARIO ||--o{ REGISTRO_SONO : registra
    USUARIO ||--o{ REFEICAO : planeja
    USUARIO ||--o{ TREINO_DIA : marca
    USUARIO ||--o{ CORRIDA : registra
    USUARIO ||--o{ HOBBY : tem
    HOBBY ||--o{ REGISTRO_HOBBY : registra
    USUARIO ||--o{ PESSOA : lista
    PESSOA ||--o{ CONTATO_PESSOA : recebe
    USUARIO ||--o{ PENDENCIA : anota
    USUARIO ||--o{ MEDICAO : mede
```

---

## Regras de negócio que aparecem no modelo

1. **XP sem duplicar:** o `id` de `CONCLUSAO_XP` junta a origem e o período (`est-1h@2026-10-31`, `pro-meta@S2026-10-27`, `mes-lei-livro@M2026-10`). Como ele é a PK, a mesma tarefa só conta uma vez por período.
2. **Semanais e mensais** não são concluídas por clique. A conclusão depende do registro ligado a elas, por exemplo:
   - `SIMULADO` (pelo menos 5 questões);
   - `REFEICAO` (5 dias planejados);
   - `REGISTRO_SONO` (5 ou 20 noites com até 1 h de diferença);
   - `PROGRESSO_PROJETO` (3 dias diferentes);
   - `PROVA` (texto de 15 ou mais letras, ou uma foto).
3. **Metas próprias** (`META_PROPRIA`):
   - no máximo 3 por frequência;
   - mínimo de 3 dias (semanal) ou 8 dias (mensal);
   - um `CHECKIN_META` por dia, ou seja, PK (meta, dia);
   - valem metade do XP de um desafio do catálogo.
4. **Grupos:**
   - **Quem pode o quê:** o papel `criador` sempre é ADM. Só ele promove ou tira ADM. Um ADM remove membros e aprova as `CONCLUSAO_GRUPO` com `status = pendente`.
   - **Encontros:** um `ENCONTRO` aparece no `COMPROMISSO`/agenda de quem tem `PRESENCA`.
5. **Resenha:** só para `LIVRO` com `status = concluido`, e no máximo uma por livro.

---

## Mapeamento para o Firestore (integração futura)

| Entidade | Coleção |
|---|---|
| USUARIO | `users/{uid}` (+ `usernames/{username}` → `{uid, email}` para garantir o @ único e o login por @) |
| Perfil público | `users/{uid}/publico/perfil` (só os campos liberados) |
| CONCLUSAO_XP, USUARIO_CONQUISTA | `users/{uid}/xp/{id}`, `users/{uid}/conquistas/{id}` |
| ROTINA_DESAFIO, HABITO, META_PROPRIA (+ checkins) | `users/{uid}/rotina/{desafioId}`, `users/{uid}/habitos/{id}`, `users/{uid}/metas/{id}/checkins/{dia}` |
| LIVRO (+ leituras, capítulos, resenha) | `users/{uid}/livros/{id}/leituras/{id}` |
| TRANSACAO, COFRINHO (+ depósitos) | `users/{uid}/transacoes/{id}`, `users/{uid}/cofrinhos/{id}/depositos/{id}` |
| Demais registros do usuário | `users/{uid}/<lista>/{id}` (anotações, flashcards, compromissos, projetos, sono…) |
| GRUPO e filhos | `grupos/{id}`, `grupos/{id}/membros/{uid}`, `/tarefas`, `/conclusoes`, `/encontros`, `/posts`, `/economia` |
| DESAFIO, CATEGORIA, CONQUISTA | ficam no app (`constants/`); são catálogo fixo, não precisam de coleção |
| ANEXO | arquivo no Firebase Storage; o documento guarda só a `url` |
