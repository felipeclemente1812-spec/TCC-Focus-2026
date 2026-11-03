import { Linking, Platform } from "react-native";

// "Não perturbe": um app não pode ligar sozinho (o sistema não deixa);
// abrimos a tela do sistema para a pessoa ligar com um toque.
// Devolve uma mensagem quando não dá (navegador).
export async function openDoNotDisturb(): Promise<string | null> {
  if (Platform.OS === "web") {
    return "No navegador não dá para ativar. No celular, este botão abre o “Não perturbe”.";
  }
  try {
    if (Platform.OS === "android") {
      await Linking.sendIntent("android.settings.ZEN_MODE_SETTINGS");
      return null;
    }
  } catch {
    // Alguns Android não têm essa tela: abre as configurações
  }
  await Linking.openSettings();
  return null;
}
