import { useContext, useEffect } from "react";

import { GroupsContext } from "@/context/GroupsContext";
import { AgendaKind, PlannerContext } from "@/context/PlannerContext";
import { UserContext } from "@/context/UserContext";
import { Reminder, syncReminders } from "@/services/notifications";

// Agenda única: compromissos pessoais (PlannerContext) + encontros dos grupos
// em que a pessoa confirmou presença (GroupsContext).
export type AgendaItem = {
  id: string;
  title: string;
  day: string;
  time: string | null;
  kind: AgendaKind;
  note: string;
  remind: boolean;
  groupId: string | null;
  groupName: string | null;
};

export const KIND_INFO: Record<AgendaKind, { label: string; color: string; icon: "calendar" | "school" | "alarm" | "people" }> = {
  compromisso: { label: "Compromisso", color: "#A78BFA", icon: "calendar" },
  prova: { label: "Prova", color: "#F472B6", icon: "school" },
  prazo: { label: "Prazo", color: "#FCD34D", icon: "alarm" },
  encontro: { label: "Encontro", color: "#36D35B", icon: "people" },
};

export function useAgenda(): AgendaItem[] {
  const planner = useContext(PlannerContext);
  const groups = useContext(GroupsContext)?.groups ?? [];
  const uid = useContext(UserContext)?.user.uid ?? "";

  const personal: AgendaItem[] = (planner?.events ?? []).map((e) => ({ ...e, groupId: null, groupName: null }));
  const fromGroups: AgendaItem[] = groups.flatMap((g) =>
    (g.events ?? [])
      .filter((e) => e.going.includes(uid))
      .map((e) => ({
        id: e.id,
        title: e.title,
        day: e.day,
        time: e.time,
        kind: "encontro" as const,
        note: e.place,
        remind: true,
        groupId: g.id,
        groupName: g.name,
      })),
  );
  return [...personal, ...fromGroups].sort((a, b) => (a.day + (a.time ?? "")).localeCompare(b.day + (b.time ?? "")));
}

// Avisos da agenda, igual a um app de agenda: 30 min antes (ou 9h do dia,
// sem horário). Montado uma vez em SessionProviders.
export function AgendaWatcher() {
  const items = useAgenda();
  const key = items.map((i) => `${i.id}${i.day}${i.time}${i.remind}`).join("|");

  useEffect(() => {
    const now = Date.now();
    const list: Reminder[] = [];
    items
      .filter((i) => i.remind)
      .forEach((i) => {
        const [y, m, d] = i.day.split("-").map(Number);
        const at = new Date(y, m - 1, d, 9, 0, 0, 0);
        if (i.time) {
          const [hh, mm] = i.time.split(":").map(Number);
          at.setHours(hh, mm - 30);
        }
        if (at.getTime() <= now) return;
        list.push({
          id: `focus-evt-${i.id}`,
          title: `${KIND_INFO[i.kind].label}: ${i.title}`,
          body: i.time ? `Começa às ${i.time}${i.groupName ? ` · ${i.groupName}` : ""}` : "É hoje!",
          hour: at.getHours(),
          minute: at.getMinutes(),
          at: at.getTime(),
        });
      });
    syncReminders(list.slice(0, 40), "focus-evt-");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
