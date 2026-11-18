# Grupos de amigos — como estão guardados

Os grupos funcionam em tempo real entre aparelhos pelo Firestore (`services/groupsService.ts`
→ `firestoreGroupsService`). As telas usam só o `GroupsContext`; as regras de pontuação
(`groupRanking`, `memberDone`, `taskXp`, validações) são funções puras no mesmo arquivo.

- Entrar por código (`FOCUS-XXXX`) funciona de qualquer aparelho (`groupCodes/{código}`).
- Fotos do grupo, das provas e do mural ficam no **Firebase Storage** (`users/{uid}/...`);
  o grupo guarda só o link.
- Não há participantes de exemplo: o ranking mostra apenas membros reais.

## Estrutura de referência (versão em subcoleções)

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

## Pontuação (definida no front-end, em `constants/gamification.ts`)

- Tarefa diária: 100 XP · semanal: 300 XP · mensal: 1000 XP.
- Pontos no grupo = soma do XP das tarefas do grupo concluídas pelo membro.
- Concluir uma tarefa do grupo também dá XP pessoal (não duplica no mesmo período).
