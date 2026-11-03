# MER — Focus

Modelo Entidade-Relacionamento (**modelo conceitual**) do Focus. É a visão de alto nível que antecede o DER (`6_DER.md`, modelo lógico): mostra **o que** o sistema guarda e como as coisas se relacionam, sem tipos de dados nem chaves estrangeiras.

## Notação (Peter Chen, com cardinalidade de Heuser)

| Símbolo | Significado |
|---|---|
| Retângulo | Entidade |
| Retângulo duplo | Entidade fraca (só existe ligada a outra; identificada pela dona + chave parcial) |
| Losango | Relacionamento |
| Losango duplo | Relacionamento identificador (liga a entidade fraca à dona) |
| Elipse | Atributo |
| Elipse com nome sublinhado | Atributo identificador (chave) |
| Sublinhado tracejado | Chave parcial da entidade fraca |
| Elipse tracejada | Atributo derivado (calculado, não guardado) |
| Elipse dupla | Atributo multivalorado |
| `(mín,máx)` | Cardinalidade: quantas ocorrências **daquela entidade** se ligam a uma ocorrência da outra |

Exemplo de leitura: `USUÁRIO (1,1) — cria — (0,n) HÁBITO` significa que um usuário cria de zero a muitos hábitos e que cada hábito pertence a exatamente um usuário.

Para ver os diagramas desenhados (retângulos e losangos duplos, sublinhados), abra `MER_Focus.html` no navegador e use “Baixar PNG”. Os blocos abaixo também abrem em <https://mermaid.live>, mas sem os contornos duplos e os sublinhados, que o HTML acrescenta.

---

## 0. Visão geral

Entidades principais e como se relacionam. Os atributos aparecem nos diagramas de cada módulo.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    CONQUISTA["CONQUISTA"]:::entidade
    CONCLUSAO_XP["CONCLUSÃO DE XP"]:::entidade
    CATEGORIA["CATEGORIA"]:::entidade
    DESAFIO["DESAFIO"]:::entidade
    HABITO["HÁBITO"]:::entidade
    META_PROPRIA["META PRÓPRIA"]:::entidade
    LIVRO["LIVRO"]:::entidade
    TRANSACAO["TRANSAÇÃO"]:::entidade
    COFRINHO["COFRINHO"]:::entidade
    PROJETO["PROJETO"]:::entidade
    COMPROMISSO["COMPROMISSO"]:::entidade
    GRUPO["GRUPO"]:::entidade
    TAREFA_GRUPO["TAREFA DO GRUPO"]:::entidade
    ENCONTRO["ENCONTRO"]:::entidade
    POSTAGEM["POSTAGEM"]:::entidade
    R1{"desbloqueia"}:::rel
    USUARIO ---|"(0,n)"| R1
    R1 ---|"(0,n)"| CONQUISTA
    R2{"ganha"}:::rel
    USUARIO ---|"(1,1)"| R2
    R2 ---|"(0,n)"| CONCLUSAO_XP
    R3{"monta rotina"}:::rel
    USUARIO ---|"(0,n)"| R3
    R3 ---|"(0,n)"| DESAFIO
    R4{"agrupa"}:::rel
    CATEGORIA ---|"(1,1)"| R4
    R4 ---|"(1,n)"| DESAFIO
    R5{"cria"}:::rel
    USUARIO ---|"(1,1)"| R5
    R5 ---|"(0,n)"| HABITO
    R6{"cria"}:::rel
    USUARIO ---|"(1,1)"| R6
    R6 ---|"(0,n)"| META_PROPRIA
    R7{"tem na estante"}:::rel
    USUARIO ---|"(1,1)"| R7
    R7 ---|"(0,n)"| LIVRO
    R8{"registra"}:::rel
    USUARIO ---|"(1,1)"| R8
    R8 ---|"(0,n)"| TRANSACAO
    R9{"possui"}:::rel
    USUARIO ---|"(1,1)"| R9
    R9 ---|"(0,n)"| COFRINHO
    R10{"acompanha"}:::rel
    USUARIO ---|"(1,1)"| R10
    R10 ---|"(0,n)"| PROJETO
    R11{"agenda"}:::rel
    USUARIO ---|"(1,1)"| R11
    R11 ---|"(0,n)"| COMPROMISSO
    R12{"participa"}:::rel
    USUARIO ---|"(1,n)"| R12
    R12 ---|"(0,n)"| GRUPO
    R13{"define"}:::rel
    GRUPO ---|"(1,1)"| R13
    R13 ---|"(0,n)"| TAREFA_GRUPO
    R14{"marca"}:::rel
    GRUPO ---|"(1,1)"| R14
    R14 ---|"(0,n)"| ENCONTRO
    R15{"publica"}:::rel
    USUARIO ---|"(1,1)"| R15
    R15 ---|"(0,n)"| POSTAGEM
    R16{"mural de"}:::rel
    GRUPO ---|"(0,1)"| R16
    R16 ---|"(0,n)"| POSTAGEM
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## 1. Usuário e gamificação

Nível, sequência e XP total são derivados: calculados a partir das conclusões de XP, não guardados.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    A1(["uid"]):::chave
    USUARIO --- A1
    A2(["nome"]):::atrib
    USUARIO --- A2
    A3(["username (único)"]):::atrib
    USUARIO --- A3
    A4(["e-mail (único)"]):::atrib
    USUARIO --- A4
    A5(["bio"]):::atrib
    USUARIO --- A5
    A6(["status"]):::atrib
    USUARIO --- A6
    A7(["nível"]):::derivado
    USUARIO --- A7
    A8(["sequência de dias"]):::derivado
    USUARIO --- A8
    A9(["XP total"]):::derivado
    USUARIO --- A9
    CONQUISTA["CONQUISTA"]:::entidade
    A10(["id"]):::chave
    CONQUISTA --- A10
    A11(["título"]):::atrib
    CONQUISTA --- A11
    A12(["descrição"]):::atrib
    CONQUISTA --- A12
    CONCLUSAO_XP["CONCLUSÃO DE XP"]:::entidade
    A13(["id (origem@período)"]):::chave
    CONCLUSAO_XP --- A13
    A14(["título"]):::atrib
    CONCLUSAO_XP --- A14
    A15(["xp"]):::atrib
    CONCLUSAO_XP --- A15
    A16(["data e hora"]):::atrib
    CONCLUSAO_XP --- A16
    R1{"desbloqueia"}:::rel
    USUARIO ---|"(0,n)"| R1
    R1 ---|"(0,n)"| CONQUISTA
    A17(["desbloqueada em"]):::atrib
    R1 --- A17
    A18(["em destaque"]):::atrib
    R1 --- A18
    R2{"ganha"}:::rel
    USUARIO ---|"(1,1)"| R2
    R2 ---|"(0,n)"| CONCLUSAO_XP
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## 2. Rotina, desafios, hábitos e lembretes

“Monta rotina” é N:N com atributos: o nome e o lembrete personalizados pertencem à ligação usuário–desafio.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    A1(["uid"]):::chave
    USUARIO --- A1
    CATEGORIA["CATEGORIA"]:::entidade
    A2(["id"]):::chave
    CATEGORIA --- A2
    A3(["nome"]):::atrib
    CATEGORIA --- A3
    A4(["ícone"]):::atrib
    CATEGORIA --- A4
    DESAFIO["DESAFIO"]:::entidade
    A5(["id"]):::chave
    DESAFIO --- A5
    A6(["título"]):::atrib
    DESAFIO --- A6
    A7(["frequência"]):::atrib
    DESAFIO --- A7
    A8(["xp"]):::atrib
    DESAFIO --- A8
    A9(["regra de conclusão"]):::atrib
    DESAFIO --- A9
    HABITO["HÁBITO"]:::entidade
    A10(["id"]):::chave
    HABITO --- A10
    A11(["título"]):::atrib
    HABITO --- A11
    A12(["dias da semana"]):::multi
    HABITO --- A12
    A13(["horário"]):::atrib
    HABITO --- A13
    META_PROPRIA["META PRÓPRIA"]:::entidade
    A14(["id"]):::chave
    META_PROPRIA --- A14
    A15(["título"]):::atrib
    META_PROPRIA --- A15
    A16(["frequência"]):::atrib
    META_PROPRIA --- A16
    A17(["dias da meta"]):::atrib
    META_PROPRIA --- A17
    CHECKIN_META["CHECK-IN DA META"]:::fraca
    A18(["dia"]):::parcial
    CHECKIN_META --- A18
    A19(["anotação"]):::atrib
    CHECKIN_META --- A19
    CONFIG_LEMBRETES["CONFIG. DE LEMBRETES"]:::fraca
    A20(["resumo da manhã"]):::atrib
    CONFIG_LEMBRETES --- A20
    A21(["aviso da noite"]):::atrib
    CONFIG_LEMBRETES --- A21
    A22(["dia do semanal"]):::atrib
    CONFIG_LEMBRETES --- A22
    PROVA["PROVA"]:::entidade
    A23(["id"]):::chave
    PROVA --- A23
    A24(["período"]):::atrib
    PROVA --- A24
    A25(["texto"]):::atrib
    PROVA --- A25
    R1{"agrupa"}:::rel
    CATEGORIA ---|"(1,1)"| R1
    R1 ---|"(1,n)"| DESAFIO
    R2{"monta rotina"}:::rel
    USUARIO ---|"(0,n)"| R2
    R2 ---|"(0,n)"| DESAFIO
    A26(["título personalizado"]):::atrib
    R2 --- A26
    A27(["lembrete ligado"]):::atrib
    R2 --- A27
    A28(["horário do lembrete"]):::atrib
    R2 --- A28
    R3{"cria"}:::rel
    USUARIO ---|"(1,1)"| R3
    R3 ---|"(0,n)"| HABITO
    R4{"cria"}:::rel
    USUARIO ---|"(1,1)"| R4
    R4 ---|"(0,n)"| META_PROPRIA
    R5{"recebe"}:::ident
    META_PROPRIA ---|"(1,1)"| R5
    R5 ---|"(0,n)"| CHECKIN_META
    R6{"configura"}:::ident
    USUARIO ---|"(1,1)"| R6
    R6 ---|"(0,1)"| CONFIG_LEMBRETES
    R7{"envia"}:::rel
    USUARIO ---|"(1,1)"| R7
    R7 ---|"(0,n)"| PROVA
    R8{"comprova"}:::rel
    DESAFIO ---|"(1,1)"| R8
    R8 ---|"(0,n)"| PROVA
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## 3. Estudos e leitura

Uma resenha é opcional e única por livro (0,1). Um flashcard pode nascer de um resumo (anotação) ou ser avulso.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    A1(["uid"]):::chave
    USUARIO --- A1
    ANOTACAO["ANOTAÇÃO"]:::entidade
    A2(["id"]):::chave
    ANOTACAO --- A2
    A3(["título"]):::atrib
    ANOTACAO --- A3
    A4(["texto"]):::atrib
    ANOTACAO --- A4
    A5(["criada em"]):::atrib
    ANOTACAO --- A5
    FLASHCARD["FLASHCARD"]:::entidade
    A6(["id"]):::chave
    FLASHCARD --- A6
    A7(["frente"]):::atrib
    FLASHCARD --- A7
    A8(["verso"]):::atrib
    FLASHCARD --- A8
    REVISAO_FLASHCARD["REVISÃO DE FLASHCARD"]:::entidade
    A9(["id"]):::chave
    REVISAO_FLASHCARD --- A9
    A10(["dia"]):::atrib
    REVISAO_FLASHCARD --- A10
    A11(["acertou"]):::atrib
    REVISAO_FLASHCARD --- A11
    SIMULADO["SIMULADO"]:::entidade
    A12(["id"]):::chave
    SIMULADO --- A12
    A13(["título"]):::atrib
    SIMULADO --- A13
    A14(["acertos"]):::atrib
    SIMULADO --- A14
    A15(["total de questões"]):::atrib
    SIMULADO --- A15
    VIDEOAULA["VIDEOAULA"]:::entidade
    A16(["id"]):::chave
    VIDEOAULA --- A16
    A17(["título"]):::atrib
    VIDEOAULA --- A17
    A18(["link"]):::atrib
    VIDEOAULA --- A18
    A19(["assistida em"]):::atrib
    VIDEOAULA --- A19
    MAPA_MENTAL["MAPA MENTAL"]:::entidade
    A20(["id"]):::chave
    MAPA_MENTAL --- A20
    A21(["escopo"]):::atrib
    MAPA_MENTAL --- A21
    A22(["título"]):::atrib
    MAPA_MENTAL --- A22
    A23(["palavras-chave"]):::multi
    MAPA_MENTAL --- A23
    LIVRO["LIVRO"]:::entidade
    A24(["id"]):::chave
    LIVRO --- A24
    A25(["título"]):::atrib
    LIVRO --- A25
    A26(["autor"]):::atrib
    LIVRO --- A26
    A27(["páginas"]):::atrib
    LIVRO --- A27
    A28(["status"]):::atrib
    LIVRO --- A28
    REGISTRO_LEITURA["REGISTRO DE LEITURA"]:::entidade
    A29(["id"]):::chave
    REGISTRO_LEITURA --- A29
    A30(["páginas"]):::atrib
    REGISTRO_LEITURA --- A30
    A31(["dia"]):::atrib
    REGISTRO_LEITURA --- A31
    CAPITULO["CAPÍTULO"]:::entidade
    A32(["id"]):::chave
    CAPITULO --- A32
    A33(["número"]):::atrib
    CAPITULO --- A33
    A34(["dia"]):::atrib
    CAPITULO --- A34
    RESENHA["RESENHA"]:::entidade
    A35(["id"]):::chave
    RESENHA --- A35
    A36(["texto"]):::atrib
    RESENHA --- A36
    A37(["nota"]):::atrib
    RESENHA --- A37
    A38(["pública"]):::atrib
    RESENHA --- A38
    VISITA_BIBLIOTECA["VISITA À BIBLIOTECA"]:::entidade
    A39(["id"]):::chave
    VISITA_BIBLIOTECA --- A39
    A40(["mês"]):::atrib
    VISITA_BIBLIOTECA --- A40
    A41(["local"]):::atrib
    VISITA_BIBLIOTECA --- A41
    R1{"escreve"}:::rel
    USUARIO ---|"(1,1)"| R1
    R1 ---|"(0,n)"| ANOTACAO
    R2{"gera"}:::rel
    ANOTACAO ---|"(0,1)"| R2
    R2 ---|"(0,n)"| FLASHCARD
    R3{"cria"}:::rel
    USUARIO ---|"(1,1)"| R3
    R3 ---|"(0,n)"| FLASHCARD
    R4{"é revisado"}:::rel
    FLASHCARD ---|"(1,1)"| R4
    R4 ---|"(0,n)"| REVISAO_FLASHCARD
    R5{"faz"}:::rel
    USUARIO ---|"(1,1)"| R5
    R5 ---|"(0,n)"| SIMULADO
    R6{"guarda"}:::rel
    USUARIO ---|"(1,1)"| R6
    R6 ---|"(0,n)"| VIDEOAULA
    R7{"monta"}:::rel
    USUARIO ---|"(1,1)"| R7
    R7 ---|"(0,n)"| MAPA_MENTAL
    R8{"tem na estante"}:::rel
    USUARIO ---|"(1,1)"| R8
    R8 ---|"(0,n)"| LIVRO
    R9{"recebe"}:::rel
    LIVRO ---|"(1,1)"| R9
    R9 ---|"(0,n)"| REGISTRO_LEITURA
    R10{"tem"}:::rel
    LIVRO ---|"(1,1)"| R10
    R10 ---|"(0,n)"| CAPITULO
    R11{"avaliado em"}:::rel
    LIVRO ---|"(1,1)"| R11
    R11 ---|"(0,1)"| RESENHA
    R12{"registra"}:::rel
    USUARIO ---|"(1,1)"| R12
    R12 ---|"(0,n)"| VISITA_BIBLIOTECA
    R13{"escolhido em"}:::rel
    LIVRO ---|"(1,1)"| R13
    R13 ---|"(0,n)"| VISITA_BIBLIOTECA
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## 4. Finanças (funções do Squill)

Dia sem gasto e mês fechado só existem ligados a um usuário: são entidades fracas identificadas pela data.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    A1(["uid"]):::chave
    USUARIO --- A1
    TRANSACAO["TRANSAÇÃO"]:::entidade
    A2(["id"]):::chave
    TRANSACAO --- A2
    A3(["tipo"]):::atrib
    TRANSACAO --- A3
    A4(["nome"]):::atrib
    TRANSACAO --- A4
    A5(["valor"]):::atrib
    TRANSACAO --- A5
    A6(["categoria"]):::atrib
    TRANSACAO --- A6
    A7(["dia"]):::atrib
    TRANSACAO --- A7
    COFRINHO["COFRINHO"]:::entidade
    A8(["id"]):::chave
    COFRINHO --- A8
    A9(["nome"]):::atrib
    COFRINHO --- A9
    A10(["valor alvo"]):::atrib
    COFRINHO --- A10
    A11(["prazo"]):::atrib
    COFRINHO --- A11
    A12(["total guardado"]):::derivado
    COFRINHO --- A12
    DEPOSITO["DEPÓSITO"]:::entidade
    A13(["id"]):::chave
    DEPOSITO --- A13
    A14(["valor"]):::atrib
    DEPOSITO --- A14
    A15(["dia"]):::atrib
    DEPOSITO --- A15
    CONFIG_FINANCAS["CONFIG. DE FINANÇAS"]:::fraca
    A16(["limite de gastos/mês"]):::atrib
    CONFIG_FINANCAS --- A16
    A17(["meta de economia/mês"]):::atrib
    CONFIG_FINANCAS --- A17
    DIA_SEM_GASTO["DIA SEM GASTO"]:::fraca
    A18(["dia"]):::parcial
    DIA_SEM_GASTO --- A18
    MES_FECHADO["MÊS FECHADO"]:::fraca
    A19(["mês"]):::parcial
    MES_FECHADO --- A19
    ARTIGO["ARTIGO"]:::entidade
    A20(["id"]):::chave
    ARTIGO --- A20
    A21(["título"]):::atrib
    ARTIGO --- A21
    R1{"registra"}:::rel
    USUARIO ---|"(1,1)"| R1
    R1 ---|"(0,n)"| TRANSACAO
    R2{"possui"}:::rel
    USUARIO ---|"(1,1)"| R2
    R2 ---|"(0,n)"| COFRINHO
    R3{"recebe"}:::rel
    COFRINHO ---|"(1,1)"| R3
    R3 ---|"(0,n)"| DEPOSITO
    R4{"define"}:::ident
    USUARIO ---|"(1,1)"| R4
    R4 ---|"(0,1)"| CONFIG_FINANCAS
    R5{"marca"}:::ident
    USUARIO ---|"(1,1)"| R5
    R5 ---|"(0,n)"| DIA_SEM_GASTO
    R6{"fecha"}:::ident
    USUARIO ---|"(1,1)"| R6
    R6 ---|"(0,n)"| MES_FECHADO
    R7{"lê"}:::rel
    USUARIO ---|"(0,n)"| R7
    R7 ---|"(0,n)"| ARTIGO
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## 5. Grupos e social

“Participa” guarda o papel (criador, ADM ou membro). A economia mensal é fraca e depende do grupo e do usuário ao mesmo tempo.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    A1(["uid"]):::chave
    USUARIO --- A1
    A2(["nome"]):::atrib
    USUARIO --- A2
    GRUPO["GRUPO"]:::entidade
    A3(["id"]):::chave
    GRUPO --- A3
    A4(["nome"]):::atrib
    GRUPO --- A4
    A5(["código (único)"]):::atrib
    GRUPO --- A5
    A6(["comparar economia"]):::atrib
    GRUPO --- A6
    A7(["bônus de XP"]):::atrib
    GRUPO --- A7
    CONVITE["CONVITE"]:::fraca
    A8(["@usuário ou e-mail"]):::parcial
    CONVITE --- A8
    A9(["status"]):::atrib
    CONVITE --- A9
    TAREFA_GRUPO["TAREFA DO GRUPO"]:::entidade
    A10(["id"]):::chave
    TAREFA_GRUPO --- A10
    A11(["título"]):::atrib
    TAREFA_GRUPO --- A11
    A12(["frequência"]):::atrib
    TAREFA_GRUPO --- A12
    A13(["regra"]):::atrib
    TAREFA_GRUPO --- A13
    CONCLUSAO_GRUPO["CONCLUSÃO NO GRUPO"]:::entidade
    A14(["id"]):::chave
    CONCLUSAO_GRUPO --- A14
    A15(["período"]):::atrib
    CONCLUSAO_GRUPO --- A15
    A16(["prova"]):::atrib
    CONCLUSAO_GRUPO --- A16
    A17(["status"]):::atrib
    CONCLUSAO_GRUPO --- A17
    ENCONTRO["ENCONTRO"]:::entidade
    A18(["id"]):::chave
    ENCONTRO --- A18
    A19(["título"]):::atrib
    ENCONTRO --- A19
    A20(["dia"]):::atrib
    ENCONTRO --- A20
    A21(["hora"]):::atrib
    ENCONTRO --- A21
    A22(["local"]):::atrib
    ENCONTRO --- A22
    POSTAGEM["POSTAGEM"]:::entidade
    A23(["id"]):::chave
    POSTAGEM --- A23
    A24(["texto"]):::atrib
    POSTAGEM --- A24
    A25(["imagem"]):::atrib
    POSTAGEM --- A25
    A26(["criada em"]):::atrib
    POSTAGEM --- A26
    ECONOMIA_MENSAL["ECONOMIA MENSAL"]:::fraca
    A27(["mês"]):::parcial
    ECONOMIA_MENSAL --- A27
    A28(["valor guardado"]):::atrib
    ECONOMIA_MENSAL --- A28
    R1{"é dono"}:::rel
    USUARIO ---|"(1,1)"| R1
    R1 ---|"(0,n)"| GRUPO
    R2{"participa"}:::rel
    USUARIO ---|"(1,n)"| R2
    R2 ---|"(0,n)"| GRUPO
    A29(["papel"]):::atrib
    R2 --- A29
    A30(["entrou em"]):::atrib
    R2 --- A30
    R3{"envia"}:::ident
    GRUPO ---|"(1,1)"| R3
    R3 ---|"(0,n)"| CONVITE
    R4{"define"}:::rel
    GRUPO ---|"(1,1)"| R4
    R4 ---|"(0,n)"| TAREFA_GRUPO
    R5{"cria"}:::rel
    USUARIO ---|"(1,1)"| R5
    R5 ---|"(0,n)"| TAREFA_GRUPO
    R6{"é concluída"}:::rel
    TAREFA_GRUPO ---|"(1,1)"| R6
    R6 ---|"(0,n)"| CONCLUSAO_GRUPO
    R7{"conclui"}:::rel
    USUARIO ---|"(1,1)"| R7
    R7 ---|"(0,n)"| CONCLUSAO_GRUPO
    R8{"aprova"}:::rel
    USUARIO ---|"(0,1)"| R8
    R8 ---|"(0,n)"| CONCLUSAO_GRUPO
    R9{"marca"}:::rel
    GRUPO ---|"(1,1)"| R9
    R9 ---|"(0,n)"| ENCONTRO
    R10{"confirma presença"}:::rel
    USUARIO ---|"(0,n)"| R10
    R10 ---|"(0,n)"| ENCONTRO
    R11{"publica"}:::rel
    USUARIO ---|"(1,1)"| R11
    R11 ---|"(0,n)"| POSTAGEM
    R12{"mural de"}:::rel
    GRUPO ---|"(0,1)"| R12
    R12 ---|"(0,n)"| POSTAGEM
    R13{"guarda"}:::ident
    USUARIO ---|"(1,1)"| R13
    R13 ---|"(0,n)"| ECONOMIA_MENSAL
    R14{"compara"}:::ident
    GRUPO ---|"(1,1)"| R14
    R14 ---|"(0,n)"| ECONOMIA_MENSAL
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## 6. Planejamento

Anexos também podem pertencer a mapas mentais e provas; aqui aparece a ligação com projetos.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    A1(["uid"]):::chave
    USUARIO --- A1
    COMPROMISSO["COMPROMISSO"]:::entidade
    A2(["id"]):::chave
    COMPROMISSO --- A2
    A3(["título"]):::atrib
    COMPROMISSO --- A3
    A4(["dia"]):::atrib
    COMPROMISSO --- A4
    A5(["hora"]):::atrib
    COMPROMISSO --- A5
    A6(["tipo"]):::atrib
    COMPROMISSO --- A6
    PROJETO["PROJETO"]:::entidade
    A7(["id"]):::chave
    PROJETO --- A7
    A8(["tipo"]):::atrib
    PROJETO --- A8
    A9(["título"]):::atrib
    PROJETO --- A9
    A10(["prazo"]):::atrib
    PROJETO --- A10
    A11(["carga horária"]):::atrib
    PROJETO --- A11
    PROGRESSO_PROJETO["PROGRESSO DO PROJETO"]:::entidade
    A12(["id"]):::chave
    PROGRESSO_PROJETO --- A12
    A13(["texto"]):::atrib
    PROGRESSO_PROJETO --- A13
    A14(["dia"]):::atrib
    PROGRESSO_PROJETO --- A14
    ANEXO["ANEXO"]:::entidade
    A15(["id"]):::chave
    ANEXO --- A15
    A16(["nome"]):::atrib
    ANEXO --- A16
    A17(["url"]):::atrib
    ANEXO --- A17
    A18(["tipo"]):::atrib
    ANEXO --- A18
    CARTAO_META["CARTÃO DE META"]:::entidade
    A19(["id"]):::chave
    CARTAO_META --- A19
    A20(["título"]):::atrib
    CARTAO_META --- A20
    A21(["motivo"]):::atrib
    CARTAO_META --- A21
    A22(["mês"]):::atrib
    CARTAO_META --- A22
    REVISAO_META["REVISÃO DA META"]:::fraca
    A23(["semana"]):::parcial
    REVISAO_META --- A23
    A24(["resultado"]):::atrib
    REVISAO_META --- A24
    PENDENCIA["PENDÊNCIA"]:::entidade
    A25(["id"]):::chave
    PENDENCIA --- A25
    A26(["título"]):::atrib
    PENDENCIA --- A26
    A27(["prazo"]):::atrib
    PENDENCIA --- A27
    A28(["feita em"]):::atrib
    PENDENCIA --- A28
    R1{"agenda"}:::rel
    USUARIO ---|"(1,1)"| R1
    R1 ---|"(0,n)"| COMPROMISSO
    R2{"acompanha"}:::rel
    USUARIO ---|"(1,1)"| R2
    R2 ---|"(0,n)"| PROJETO
    R3{"registra"}:::rel
    PROJETO ---|"(1,1)"| R3
    R3 ---|"(0,n)"| PROGRESSO_PROJETO
    R4{"envia"}:::rel
    USUARIO ---|"(1,1)"| R4
    R4 ---|"(0,n)"| ANEXO
    R5{"anexa"}:::rel
    PROJETO ---|"(0,1)"| R5
    R5 ---|"(0,n)"| ANEXO
    R6{"cria"}:::rel
    USUARIO ---|"(1,1)"| R6
    R6 ---|"(0,n)"| CARTAO_META
    R7{"é revisado"}:::ident
    CARTAO_META ---|"(1,1)"| R7
    R7 ---|"(0,n)"| REVISAO_META
    R8{"anota"}:::rel
    USUARIO ---|"(1,1)"| R8
    R8 ---|"(0,n)"| PENDENCIA
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## 7. Bem-estar

As horas de sono e o ritmo da corrida são derivados. A medição (passos, tempo de tela) depende do usuário e do desafio.

```mermaid
flowchart LR
    USUARIO["USUÁRIO"]:::entidade
    A1(["uid"]):::chave
    USUARIO --- A1
    CONFIG_SONO["CONFIG. DE SONO"]:::fraca
    A2(["hora de dormir"]):::atrib
    CONFIG_SONO --- A2
    A3(["hora de acordar"]):::atrib
    CONFIG_SONO --- A3
    A4(["despertador ligado"]):::atrib
    CONFIG_SONO --- A4
    A5(["soneca"]):::atrib
    CONFIG_SONO --- A5
    REGISTRO_SONO["REGISTRO DE SONO"]:::fraca
    A6(["dia"]):::parcial
    REGISTRO_SONO --- A6
    A7(["dormiu"]):::atrib
    REGISTRO_SONO --- A7
    A8(["acordou"]):::atrib
    REGISTRO_SONO --- A8
    A9(["horas"]):::derivado
    REGISTRO_SONO --- A9
    REFEICAO["REFEIÇÃO"]:::entidade
    A10(["id"]):::chave
    REFEICAO --- A10
    A11(["dia da semana"]):::atrib
    REFEICAO --- A11
    A12(["turno"]):::atrib
    REFEICAO --- A12
    A13(["kcal"]):::atrib
    REFEICAO --- A13
    TREINO_DIA["DIA DE TREINO"]:::fraca
    A14(["dia"]):::parcial
    TREINO_DIA --- A14
    CORRIDA["CORRIDA"]:::entidade
    A15(["id"]):::chave
    CORRIDA --- A15
    A16(["km"]):::atrib
    CORRIDA --- A16
    A17(["minutos"]):::atrib
    CORRIDA --- A17
    A18(["dia"]):::atrib
    CORRIDA --- A18
    A19(["ritmo"]):::derivado
    CORRIDA --- A19
    HOBBY["HOBBY"]:::entidade
    A20(["id"]):::chave
    HOBBY --- A20
    A21(["nome"]):::atrib
    HOBBY --- A21
    REGISTRO_HOBBY["REGISTRO DE HOBBY"]:::entidade
    A22(["id"]):::chave
    REGISTRO_HOBBY --- A22
    A23(["minutos"]):::atrib
    REGISTRO_HOBBY --- A23
    A24(["dia"]):::atrib
    REGISTRO_HOBBY --- A24
    PESSOA["PESSOA"]:::entidade
    A25(["id"]):::chave
    PESSOA --- A25
    A26(["nome"]):::atrib
    PESSOA --- A26
    CONTATO_PESSOA["CONTATO"]:::entidade
    A27(["id"]):::chave
    CONTATO_PESSOA --- A27
    A28(["dia"]):::atrib
    CONTATO_PESSOA --- A28
    DESAFIO["DESAFIO"]:::entidade
    A29(["id"]):::chave
    DESAFIO --- A29
    A30(["título"]):::atrib
    DESAFIO --- A30
    MEDICAO["MEDIÇÃO"]:::fraca
    A31(["dia"]):::parcial
    MEDICAO --- A31
    A32(["valor"]):::atrib
    MEDICAO --- A32
    R1{"configura"}:::ident
    USUARIO ---|"(1,1)"| R1
    R1 ---|"(0,1)"| CONFIG_SONO
    R2{"registra"}:::ident
    USUARIO ---|"(1,1)"| R2
    R2 ---|"(0,n)"| REGISTRO_SONO
    R3{"planeja"}:::rel
    USUARIO ---|"(1,1)"| R3
    R3 ---|"(0,n)"| REFEICAO
    R4{"marca"}:::ident
    USUARIO ---|"(1,1)"| R4
    R4 ---|"(0,n)"| TREINO_DIA
    R5{"registra"}:::rel
    USUARIO ---|"(1,1)"| R5
    R5 ---|"(0,n)"| CORRIDA
    R6{"tem"}:::rel
    USUARIO ---|"(1,1)"| R6
    R6 ---|"(0,n)"| HOBBY
    R7{"registra"}:::rel
    HOBBY ---|"(1,1)"| R7
    R7 ---|"(0,n)"| REGISTRO_HOBBY
    R8{"lista"}:::rel
    USUARIO ---|"(1,1)"| R8
    R8 ---|"(0,n)"| PESSOA
    R9{"recebe"}:::rel
    PESSOA ---|"(1,1)"| R9
    R9 ---|"(0,n)"| CONTATO_PESSOA
    R10{"é do tipo"}:::rel
    DESAFIO ---|"(1,1)"| R10
    R10 ---|"(0,n)"| CONTATO_PESSOA
    R11{"mede"}:::ident
    USUARIO ---|"(1,1)"| R11
    R11 ---|"(0,n)"| MEDICAO
    R12{"refere-se a"}:::ident
    DESAFIO ---|"(1,1)"| R12
    R12 ---|"(0,n)"| MEDICAO
    classDef entidade fill:#ede9fe,stroke:#5B21B6,stroke-width:2px,color:#1e1b4b,font-weight:bold
    classDef fraca fill:#ede9fe,stroke:#5B21B6,stroke-width:1.5px,color:#1e1b4b,font-weight:bold
    classDef rel fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef ident fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#451a03
    classDef atrib fill:#fff,stroke:#6b7280,color:#1f2937
    classDef chave fill:#fff,stroke:#6b7280,color:#1f2937,font-weight:bold
    classDef parcial fill:#fff,stroke:#6b7280,color:#1f2937
    classDef derivado fill:#fff,stroke:#6b7280,stroke-dasharray:4 3,color:#1f2937
    classDef multi fill:#fff,stroke:#6b7280,color:#1f2937
```

---

## Do MER para o DER (o que muda no modelo lógico)

| No MER (conceitual) | No DER (lógico) |
|---|---|
| Relacionamento N:N com atributos: `desbloqueia`, `monta rotina`, `participa`, `confirma presença`, `lê` | Vira tabela associativa: `USUARIO_CONQUISTA`, `ROTINA_DESAFIO`, `MEMBRO_GRUPO`, `PRESENCA`, `ARTIGO_LIDO` (PK composta pelas duas FKs) |
| Relacionamento 1:N | A entidade do lado N recebe a FK (`uid`, `livro_id`, `grupo_id`…) |
| Entidade fraca + relacionamento identificador | PK composta: chave da dona + chave parcial (ex.: `CHECKIN_META (meta_id, dia)`, `ECONOMIA_GRUPO (grupo_id, uid, mes)`) |
| Entidade fraca 1:1 (configurações) | PK = FK do usuário (`CONFIG_LEMBRETES.uid`, `CONFIG_FINANCAS.uid`, `CONFIG_SONO.uid`) |
| Atributo multivalorado (`dias da semana`, `palavras-chave`) | Guardado como lista no documento do Firestore |
| Atributo derivado (`nível`, `sequência`, `XP total`, `horas`, `ritmo`, `total guardado`) | Não é coluna: o app calcula a partir dos registros |

## Regras de negócio representadas

1. Um usuário ganha XP de uma tarefa no máximo uma vez por período. A chave de `CONCLUSÃO DE XP` é `origem@período`.
2. Cada livro tem no máximo uma resenha (0,1), e só pode ter resenha depois de concluído.
3. Toda conclusão no grupo pertence a uma tarefa e a um usuário. Quando a regra é “ADM aprova”, um ADM fica ligado a ela pelo relacionamento `aprova` (0,1).
4. Todo grupo tem pelo menos um participante (1,n), o criador, que sempre é ADM.
5. Uma postagem pode estar no mural de um grupo (0,1) ou só no perfil.
