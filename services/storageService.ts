// Serviço de ARQUIVOS — Firebase Storage.
//   users/{uid}/{pasta}/{arquivo}
// Toda foto, anexo ou documento escolhido no app é enviado para cá e o app guarda só
// o LINK (download URL). Assim o arquivo aparece em qualquer aparelho e não some
// quando o cache do celular é limpo. As regras de acesso estão em storage.rules.

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { auth, storage } from "@/config/firebase";

export type UploadFolder = "avatar" | "banner" | "anexos" | "projetos" | "provas" | "grupos" | "posts";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

const EXT_BY_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_BY_EXT).map(([ext, mime]) => [mime, ext]),
);
EXT_BY_MIME["image/jpeg"] = "jpg";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB (mesmo limite da regra do Storage)

export const isRemoteUrl = (uri: string | null | undefined): uri is string =>
  !!uri && /^https?:\/\//i.test(uri);

function extensionOf(name: string, mime?: string | null) {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(name)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  if (mime && EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  return "bin";
}

const safeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "arquivo";

export class UploadError extends Error {}

// Envia um arquivo que está no aparelho (ou data: no navegador) e devolve o link público.
// Se já for um link http(s), devolve como está.
export async function uploadLocalFile(
  localUri: string,
  folder: UploadFolder,
  options: { name?: string; mimeType?: string | null } = {},
): Promise<string> {
  if (isRemoteUrl(localUri)) return localUri;

  const uid = auth.currentUser?.uid;
  if (!uid) throw new UploadError("Entre na sua conta para enviar arquivos.");

  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new UploadError("Arquivo grande demais. O limite é 20 MB.");
    }

    const name = options.name ?? "arquivo";
    const mime = options.mimeType || blob.type || MIME_BY_EXT[extensionOf(name)] || "application/octet-stream";
    const ext = extensionOf(name, mime);
    const base = safeName(name.replace(/\.[a-z0-9]{2,5}$/i, ""));
    const path = `users/${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${base}.${ext}`;

    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType: mime });
    return await getDownloadURL(fileRef);
  } catch (e) {
    if (e instanceof UploadError) throw e;
    const code = (e as { code?: string } | null)?.code ?? "";
    if (code === "storage/unauthorized") {
      throw new UploadError("Sem permissão para enviar o arquivo. Entre novamente na conta.");
    }
    if (code === "storage/quota-exceeded") {
      throw new UploadError("O armazenamento do app está cheio. Tente mais tarde.");
    }
    throw new UploadError("Não foi possível enviar o arquivo. Verifique sua conexão e tente de novo.");
  }
}
