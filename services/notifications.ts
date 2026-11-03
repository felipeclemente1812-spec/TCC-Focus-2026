import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Notificações LOCAIS (agendadas no próprio aparelho, sem servidor).
// Celular: expo-notifications (funciona com o app fechado).
// Web: Notification do navegador, só enquanto a aba está aberta.
// Todo id começa com "focus-" para não mexer em nada que não é nosso.

const isWeb = Platform.OS === "web";
const CHANNEL = "lembretes";

export type Reminder = {
  id: string; // ex.: "focus-rem-sau-agua"
  title: string;
  body: string;
  hour: number;
  minute: number;
  weekday?: number; // 0 = domingo ... 6 = sábado (sem = todo dia)
  monthDay?: number; // 1–28: todo mês nesse dia
  at?: number; // aviso único nessa data/hora (timestamp)
};

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let prepared = false;

// Pede permissão uma vez; devolve false se a pessoa negar
export async function ensurePermission() {
  try {
    if (isWeb) {
      if (typeof window === "undefined" || !("Notification" in window)) return false;
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      return (await Notification.requestPermission()) === "granted";
    }
    if (!prepared && Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "Lembretes do Focus",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    prepared = true;
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// ---------- Web: timers enquanto a aba está aberta ----------

const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

function showWeb(title: string, body: string) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // Navegador sem suporte: ignora
  }
}

function nextOccurrence(r: Reminder, from = new Date()) {
  if (r.at !== undefined) return new Date(r.at);
  const next = new Date(from);
  next.setHours(r.hour, r.minute, 0, 0);
  if (r.monthDay !== undefined) {
    next.setDate(r.monthDay);
    if (next <= from) next.setMonth(next.getMonth() + 1, r.monthDay);
  } else if (r.weekday !== undefined) {
    const diff = (r.weekday - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + diff);
    if (next <= from) next.setDate(next.getDate() + 7);
  } else if (next <= from) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function scheduleWeb(r: Reminder) {
  clearWeb(r.id);
  const wait = nextOccurrence(r).getTime() - Date.now();
  // setTimeout aceita até ~24 dias; os mensais mais distantes ficam para a próxima abertura
  if (wait < 0 || wait > 2_000_000_000) return;
  webTimers.set(
    r.id,
    setTimeout(() => {
      showWeb(r.title, r.body);
      if (r.at === undefined) scheduleWeb(r);
    }, wait),
  );
}

function clearWeb(id: string) {
  const t = webTimers.get(id);
  if (t) clearTimeout(t);
  webTimers.delete(id);
}

// ---------- API usada pelo app ----------

// Substitui todos os lembretes do Focus com esse prefixo pela lista atual
// ("focus-rem-" = tarefas e resumo; "focus-evt-" = agenda)
export async function syncReminders(reminders: Reminder[], prefix = "focus-rem-") {
  if (isWeb) {
    [...webTimers.keys()].filter((id) => id.startsWith(prefix)).forEach(clearWeb);
    if (typeof window === "undefined" || Notification?.permission !== "granted") return;
    reminders.forEach(scheduleWeb);
    return;
  }
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    for (const r of reminders) {
      if (r.at !== undefined && r.at <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body },
        trigger:
          r.at !== undefined
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: r.at,
                channelId: CHANNEL,
              }
            : r.monthDay !== undefined
            ? {
                type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
                day: r.monthDay,
                hour: r.hour,
                minute: r.minute,
                channelId: CHANNEL,
              }
            : r.weekday !== undefined
            ? {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: r.weekday + 1, // expo: 1 = domingo
                hour: r.hour,
                minute: r.minute,
                channelId: CHANNEL,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: r.hour,
                minute: r.minute,
                channelId: CHANNEL,
              },
      });
    }
  } catch {
    // Expo Go/aparelho sem suporte: o app segue sem lembrete
  }
}

// Aviso único daqui a X segundos (fim do cronômetro, soneca)
export async function notifyIn(id: string, seconds: number, title: string, body: string) {
  await cancelNotification(id);
  if (isWeb) {
    webTimers.set(id, setTimeout(() => showWeb(title, body), seconds * 1000));
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNEL,
      },
    });
  } catch {
    // sem suporte
  }
}

// Notificação fixa na barra (Android) enquanto o cronômetro conta
export async function showOngoing(id: string, title: string, body: string) {
  if (isWeb) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body, sticky: true, autoDismiss: false },
      trigger: null,
    });
  } catch {
    // sem suporte
  }
}

export async function cancelNotification(id: string) {
  if (isWeb) {
    clearWeb(id);
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.dismissNotificationAsync(id);
  } catch {
    // nada agendado
  }
}
