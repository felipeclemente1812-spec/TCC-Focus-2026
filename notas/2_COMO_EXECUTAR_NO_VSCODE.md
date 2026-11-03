# 2 — Como executar o Focus no VS Code

## O que você precisa instalar (uma vez só)

1. **Node.js 20 ou mais novo** (usamos o 22): https://nodejs.org (versão LTS).
   Para conferir, num terminal: `node -v`
2. **Visual Studio Code**: https://code.visualstudio.com
3. (Opcional, para testar no celular) o app **Expo Go** no Android ou iPhone.

## Passo a passo

### 1. Abrir o projeto

1. Descompacte o `.zip` numa pasta, por exemplo `C:\TCC\TCC-Focus-2026`.
2. No VS Code: **Arquivo › Abrir Pasta…** e escolha essa pasta (a que tem o `package.json`).

### 2. Abrir o terminal do VS Code

Menu **Terminal › Novo Terminal** (ou `Ctrl + '`).

### 3. Instalar as dependências (só na primeira vez)

```
npm install
```

Isso cria a pasta `node_modules` e leva alguns minutos.

### 4. Rodar no navegador

```
npx expo start --web
```

Quando aparecer `Waiting on http://localhost:8081`, o navegador abre sozinho. Se não abrir, acesse **http://localhost:8081**.

- Na primeira vez a compilação demora (até 1 minuto); depois fica rápida.
- Salvou um arquivo? A página atualiza sozinha.
- Para parar: clique no terminal e aperte `Ctrl + C`.

### 5. (Opcional) Rodar no celular

```
npx expo start
```

Escaneie o QR Code com o **Expo Go** (celular e PC na mesma rede Wi-Fi).
Atenção: no Expo Go, o salvamento local pode não funcionar até a equipe ajustar a versão do AsyncStorage (ver nota 1, Parte B, item 6). O app funciona, só não guarda o progresso.

## Comandos úteis

| Para quê | Comando |
|---|---|
| Rodar no navegador | `npx expo start --web` |
| Verificar erros de TypeScript | `npx tsc --noEmit` |
| Verificar padrão de código (lint) | `npx expo lint` |
| Gerar a versão web final | `npx expo export --platform web` |
| Limpar o cache (quando algo "trava") | `npx expo start --web -c` |

## Problemas comuns

| Problema | Solução |
|---|---|
| `'npx' não é reconhecido` | O Node.js não está instalado ou o VS Code foi aberto antes da instalação. Instale o Node e **reabra o VS Code**. |
| Erro de "execução de scripts desabilitada" no PowerShell | No terminal do VS Code, troque para **Command Prompt** (seta ao lado do `+` › Command Prompt) ou rode: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Port 8081 is being used` | Já tem um Expo rodando. Feche-o (`Ctrl + C`) ou aceite a outra porta que ele oferecer. |
| Tela branca no navegador | Aguarde a primeira compilação; se continuar, pare e rode `npx expo start --web -c`. |
| Erros estranhos depois de atualizar o código | Apague a pasta `node_modules` e rode `npm install` de novo. |
| "Entre na sua conta para ver o feed" | Faça login (o feed exige conta). Sem internet, o feed não carrega. |

## Mapa rápido das pastas

```
app/              Telas (cada arquivo é uma rota)
  (auth)/         Login, cadastro, completar perfil
  (tabs)/         Feed, Desafios, Perfil e telas secundárias
  onboarding.tsx  Plano personalizado (conta nova)
components/       Peças reutilizáveis (avatar, caixa de post, aviso de nível)
constants/        Regras do XP e catálogo de desafios
context/          Estado global (usuário, XP, rotina, foco, grupos, feed)
services/         Serviço de grupos (protótipo local)
hooks/            Publicar no feed
utils/            Avisos e salvamento local
docs/             Contrato de dados dos grupos para o backend
notas/            Estas anotações
config/firebase.ts  Configuração do Firebase (não alterada)
```

## Extensões recomendadas do VS Code (opcionais)

- **ESLint**: mostra erros de padrão enquanto você escreve.
- **Expo Tools**: autocompletar do `app.json`.
- **Prettier**: formata o código ao salvar.

Para ver as notas `.md` formatadas no VS Code: abra o arquivo e aperte **`Ctrl + Shift + V`**.
