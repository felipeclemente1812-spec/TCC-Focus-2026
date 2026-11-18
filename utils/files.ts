import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Linking, Platform, Share } from "react-native";

import type { FileRef } from "@/context/PlannerContext";
import { UploadError, uploadLocalFile, UploadFolder } from "@/services/storageService";
import { notify, withBusy } from "@/utils/feedback";

// Escolher foto, PDF/Word ou áudio do aparelho. Devolve null se cancelar.
// Fotos e documentos são ENVIADOS para o Firebase Storage na hora e o app guarda só o
// link (https), então o arquivo aparece em qualquer aparelho. Se o envio falhar, o
// usuário é avisado e nada é anexado.

// Fotos de provas, anexos e projetos em qualidade máxima (pedido do grupo: mostrar os
// detalhes). A foto de perfil continua com o recorte e a compressão próprios.
export const PHOTO_QUALITY = Platform.OS === "web" ? 0.85 : 1;

// Envia um arquivo local mostrando "Enviando..." na tela. Devolve o link, ou null se falhar.
export async function uploadWithFeedback(
  localUri: string,
  folder: UploadFolder,
  options: { name?: string; mimeType?: string | null; message?: string } = {},
): Promise<string | null> {
  try {
    return await withBusy(options.message ?? "Enviando arquivo...", () =>
      uploadLocalFile(localUri, folder, options),
    );
  } catch (e) {
    notify("Não foi possível enviar", e instanceof UploadError ? e.message : "Tente novamente em instantes.");
    return null;
  }
}

async function toRemoteFile(
  asset: { uri: string; name: string; mimeType?: string | null },
  kind: FileRef["kind"],
  folder: UploadFolder,
): Promise<FileRef | null> {
  const url = await uploadWithFeedback(asset.uri, folder, {
    name: asset.name,
    mimeType: asset.mimeType,
    message: kind === "image" ? "Enviando imagem..." : "Enviando documento...",
  });
  return url ? { uri: url, name: asset.name, kind } : null;
}

export async function pickImage(folder: UploadFolder = "anexos"): Promise<FileRef | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify("Permissão necessária", "Libere o acesso às fotos para anexar uma imagem.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: PHOTO_QUALITY });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return toRemoteFile({ uri: asset.uri, name: asset.fileName ?? "imagem.jpg", mimeType: asset.mimeType }, "image", folder);
}

// Tirar foto na hora com a câmera (prova das tarefas do grupo).
// No navegador abre o seletor de arquivo/câmera do próprio navegador.
export async function takePhoto(folder: UploadFolder = "provas"): Promise<FileRef | null> {
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify("Permissão necessária", "Libere o acesso à câmera para tirar a foto.");
      return null;
    }
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: PHOTO_QUALITY });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return toRemoteFile({ uri: asset.uri, name: asset.fileName ?? "foto.jpg", mimeType: asset.mimeType }, "image", folder);
}

export async function pickDocument(
  types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
  folder: UploadFolder = "anexos",
): Promise<FileRef | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return toRemoteFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }, "document", folder);
}

// Música do alarme: fica só no aparelho (toca offline), não vai para a nuvem.
export async function pickAudio(): Promise<{ uri: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["audio/*"], copyToCacheDirectory: true });
  if (result.canceled) return null;
  return { uri: result.assets[0].uri, name: result.assets[0].name };
}

export function openFile(uri: string) {
  Linking.openURL(uri).catch(() => notify("Não deu para abrir", "Não foi possível abrir esse arquivo."));
}

// Compartilhar com um amigo (WhatsApp, e-mail, etc. pelo menu do sistema)
export async function shareContent(title: string, text: string, file?: FileRef | null) {
  const message = [title, text].filter(Boolean).join("\n\n");
  try {
    if (Platform.OS === "web") {
      const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
      if (nav?.share) {
        await nav.share({ title, text: message });
        return;
      }
      await navigator.clipboard?.writeText(message);
      notify("Copiado", "O texto foi copiado. Cole na conversa com seu amigo.");
      return;
    }
    await Share.share({ title, message, url: file?.uri });
  } catch {
    // Pessoa cancelou o menu
  }
}
