# Contrato de dados — Grupos de amigos (para o backend)

O front-end de grupos já está pronto e funciona como **protótipo local** (`services/groupsService.ts` → `localGroupsService`). Os grupos ficam num registro do aparelho (`focus:v1:grupos`), compartilhado entre as contas que entram nele: dá para **entrar por código** (`FOCUS-XXXX`) e competir com outra conta no mesmo aparelho. Entre aparelhos diferentes é preciso o backend. Este documento descreve o que o backend precisa oferecer para os grupos funcionarem entre usuários reais. O front-end não altera Firebase, coleções nem regras; isso fica com o responsável pelo backend.

## Como trocar a implementação

As telas usam apenas o `GroupsContext`, que hoje chama `localGroupsService`. Para ir ao servidor:

1. Criar `firestoreGroupsService` com as mesmas operações (carregar, criar grupo, convidar, criar/remover tarefa, concluir tarefa, publicar no mural).
2. Trocar `const service = localGroupsService` em `context/GroupsContext.tsx`.
3. As regras puras (`groupRanking`, `memberDone`, `taskXp`, validações) continuam iguais.

## Estrutura sugerida no Firestore

```
groups/{groupId}
  name: string            (3–30 caracteres)
  code: string            (ex.: "FOCUS-4K2P", único)
  ownerId: string         (uid)
  memberIds: string[]     (uids — usado nas regras e nas consultas)
  createdAt: timestamp

groups/{groupId}/invites/{inviteId}
  handle: string          ("@usuario" ou e-mail)
  invitedBy: string       (uid)
  status: "pendente" | "aceito" | "recusado"
  createdAt: timestamp

groups/{groupId}/tasks/{taskId}
  title: string           (3–60 caracteres)
  frequency: "daily" | "weekly" | "monthly"
  createdBy: string       (uid)
  createdAt: timestamp

groups/{groupId}/completions/{memberId_taskId_period}
  memberId: string        (uid)
  taskId: string
  period: string          (ex.: "t-1@2026-10-23", "t-1@S2026-10-19", "t-1@M2026-10")
  xp: number              (100 diária · 300 semanal · 1000 mensal)
  at: timestamp

groups/{groupId}/posts/{postId}
  authorId: string        (uid)
  text: string            (até 500 caracteres)
  imagePath?: string      (Storage: groups/{groupId}/posts/{postId}.jpg)
  createdAt: timestamp
```

O id determinístico de `completions` (`memberId_taskId_period`) impede pontuar duas vezes a mesma tarefa no mesmo período.

## Regras de acesso (resumo)

- Ler/escrever em `groups/{id}` e subcoleções: só se `request.auth.uid in resource.data.memberIds`.
- Criar grupo: qualquer usuário logado, com `ownerId == request.auth.uid`.
- `completions`: o usuário só cria documentos com `memberId == request.auth.uid`.
- `tasks`: só membros criam; só quem criou remove.
- `posts` e fotos do Storage em `groups/{id}/...`: só membros leem. **É isso que faz a foto do mural aparecer só entre os membros do grupo.**

## Funcionalidades que dependem disso

| No app hoje (protótipo) | Com o backend |
|---|---|
| Entrar por código funciona entre contas do mesmo aparelho | Entrar por código de qualquer aparelho (consulta `groups` onde `code == X` e adiciona o uid em `memberIds`) |
| Convite fica "pendente" no aparelho | Convite chega ao amigo (por @usuario/e-mail ou pelo código) |
| "Amigos exemplo" com pontos fixos | Membros reais com pontos das `completions` |
| Mural só neste aparelho | Mural compartilhado entre membros |
| Botão de foto desativado | Upload para o Storage, visível só para membros |

## Pontuação (definida no front-end, em `constants/gamification.ts`)

- Tarefa diária: 100 XP · semanal: 300 XP · mensal: 1000 XP.
- Pontos no grupo = soma do XP das tarefas do grupo concluídas pelo membro.
- Concluir uma tarefa do grupo também dá XP pessoal (não duplica no mesmo período).
