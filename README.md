# Focus

Aplicativo de organização pessoal e produtividade (TCC 2026): rotina de desafios, hábitos,
ciclo de foco, estudos, finanças, diário, estante de livros, grupos de amigos com ranking,
conquistas e XP.

Feito com **Expo (React Native) + Expo Router + TypeScript** e **Firebase**
(Authentication, Firestore e Storage).

## Como rodar

```bash
npm install
npx expo start      # abre o menu: Android, iOS ou web
```

## Firebase

| Serviço | Para quê |
|---|---|
| Authentication | Login por e-mail/senha e por @usuário |
| Firestore | Perfil, rotina, hábitos, finanças, diário, estante, grupos e publicações |
| Storage | Fotos de perfil/capa, anexos, provas das tarefas, fotos de grupo e do mural, documentos |

A configuração está em `config/firebase.ts`.

### Regras de segurança

`firestore.rules` (dados) e `storage.rules` (arquivos) são as regras do projeto; cada uma vai no seu lugar do console.

### Regras do Storage

Os envios de imagem e documento só funcionam depois de publicar as regras de
`storage.rules` (Firebase Console › Storage › Regras, ou `firebase deploy --only storage`).
Cada pessoa escreve só na própria pasta (`users/{uid}/...`) e qualquer pessoa logada lê
(assim os membros de um grupo enxergam as fotos uns dos outros). Limite: 20 MB por arquivo.

## Estrutura

```
app/          telas (Expo Router): (auth) login/cadastro, (tabs) telas do app, terms, onboarding
components/   componentes de interface (PostComposer, PhotoViewer, DialogHost...)
context/      estado por usuário (XP, rotina, hábitos, grupos...)
services/     acesso ao Firebase (perfil, grupos, arquivos)
utils/        utilitários (arquivos, avisos, armazenamento na nuvem)
constants/    catálogo de desafios, gamificação, textos dos Termos de Uso
```

## Termos de Uso

O texto fica em `constants/terms.ts`. Ao publicar uma versão nova, altere `TERMS_VERSION`:
todas as contas passam pela tela de aceite de novo no próximo acesso.
