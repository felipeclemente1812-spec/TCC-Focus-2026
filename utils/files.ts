import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Linking, Platform, Share } from "react-native";

import type { FileRef } from "@/context/PlannerContext";
import { notify } from "@/utils/feedback";

// Escolher foto, PDF/Word ou áudio do aparelho. Devolve null se cancelar.
// TODO Firebase: enviar o arquivo para o Storage e guardar a URL pública
// (hoje fica só o caminho local, que outros aparelhos não abrem).

export async function pickImage(): Promise<FileRef | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify("Permissão necessária", "Libere o acesso às fotos para anexar uma imagem.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.fileName ?? "imagem.jpg", kind: "image" };
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
