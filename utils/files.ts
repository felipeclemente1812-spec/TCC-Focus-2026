import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Linking, Platform, Share } from "react-native";

import type { FileRef } from "@/context/PlannerContext";
import { notify } from "@/utils/feedback";

// Escolher foto, PDF/Word ou áudio do aparelho. Devolve null se cancelar.
// TODO Firebase: enviar o arquivo para o Storage e guardar a URL pública
// (hoje fica só o caminho local, que outros aparelhos não abrem).

// Fotos de provas, anexos e projetos em qualidade máxima (pedido do grupo: mostrar os
// detalhes). No navegador a foto vira texto salvo no aparelho, então fica um pouco menor.
// A foto de perfil continua com o recorte e a compressão próprios.
export const PHOTO_QUALITY = Platform.OS === "web" ? 0.85 : 1;

export async function pickImage(): Promise<FileRef | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify("Permissão necessária", "Libere o acesso às fotos para anexar uma imagem.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: PHOTO_QUALITY });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.fileName ?? "imagem.jpg", kind: "image" };
}

// Tirar foto na hora com a câmera (prova das tarefas do grupo).
// No navegador abre o seletor de arquivo/câmera do próprio navegador.
export async function takePhoto(): Promise<FileRef | null> {
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
  return { uri: asset.uri, name: asset.fileName ?? "foto.jpg", kind: "image" };
}

export async function pickDocument(types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]): Promise<FileRef | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.name, kind: "document" };
}

export async function pickAudio(): Promise<{ uri: string; name: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ["audio/*"], copyToCacheDirectory: true });
  if (result.canceled) return null;
  return { uri: result.assets[0].uri, name: result.assets[0].name };
}

export function openFile(uri: string) {
  Linking.openURL(uri).catch(() => notify("Não deu para abrir", "Esse arquivo não abre neste aparelho."));
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
