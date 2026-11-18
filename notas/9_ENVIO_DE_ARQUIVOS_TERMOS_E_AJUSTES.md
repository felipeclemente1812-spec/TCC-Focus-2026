# Envio de arquivos (Firebase Storage), Termos de Uso e ajustes de acabamento

## Envio de imagens e arquivos para o Firebase
- Novo `services/storageService.ts`: envia o arquivo para `users/{uid}/{pasta}/...` e devolve o link.
- `utils/files.ts`: `pickImage`, `takePhoto` e `pickDocument` agora enviam na hora e devolvem o **link** (mostram "Enviando..." na tela). Se falhar, avisa e não anexa.
- Ligado em: foto de perfil e capa, anexos de tarefas (desenhos e documentos), projetos, plano de estudos/comprovantes, foto do grupo, prova com foto das tarefas do grupo, publicações do Perfil e mural do grupo (agora com imagem).
- **Publique as regras de `storage.rules` no console do Firebase (Storage › Regras)**; sem isso o envio é recusado.

## Termos de Uso
- Texto em `constants/terms.ts` (trocar `TERMS_SECTIONS`; mudar `TERMS_VERSION` pede novo aceite).
- Tela `app/terms.tsx`: leitura e aceite. Cadastro tem a caixinha "Li e aceito os Termos de Uso" (obrigatória) com link; Perfil tem o botão "Termos de Uso".
- O aceite (data e versão) é gravado em `users/{uid}`. Contas antigas, que ainda não aceitaram, passam pela tela de aceite ao entrar.

## Dados de exemplo e avisos de "depende do servidor"
- Removidos os "Amigos exemplo" dos grupos (e dos grupos já criados), a caixa "Protótipo", os textos "salvo neste aparelho" e "depende do servidor".
- Mural de grupos e publicações aceitam imagem.

## Aviso ao criar a conta
- Modal do próprio Focus ("Conta criada!") no lugar do alerta do sistema. O `DialogHost` foi movido para fora da sessão: antes ele era recriado no momento do cadastro e o aviso caía no alerta nativo.

## Cabeçalhos fixos
- Cabeçalhos (voltar + título) ficam parados no topo em todas as telas internas; abas de Finanças, Catálogo (busca e filtros), Projetos (filtros) fixas; abas do Grupo e da Rotina ficam grudadas ao rolar.

## Outros
- README reescrito; removido o script `reset-project` do template do Expo.
