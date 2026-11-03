import AsyncStorage from "@react-native-async-storage/async-storage";

// Salvamento LOCAL (neste aparelho), separado por usuário.
// Não é backend: os dados não vão para a conta nem para outros aparelhos.
// Se o armazenamento falhar (ex.: módulo nativo indisponível no Expo Go),
// o app continua funcionando só em memória.

const PREFIX = "focus:v1";

export const storageKeys = {
  progress: (uid: string) => `${PREFIX}:${uid}:progresso`,
  routine: (uid: string) => `${PREFIX}:${uid}:rotina`,
};

// Lê e valida; dado inválido ou corrompido é descartado (volta ao padrão)
export async function loadJSON<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return parsed;
    await AsyncStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

export async function removeJSON(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Sem armazenamento disponível: nada a remover
  }
}

export async function saveJSON(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento disponível: segue só em memória
  }
}
