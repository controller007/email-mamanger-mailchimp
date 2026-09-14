// Polls a contact list's Mailchimp audience readiness while it isn't ready
// yet, and stops once it is — refetches on a 30s interval and whenever the
// tab regains focus (TanStack Query's default), so the send-email and
// contact-lists pages stay current without the user having to reload.
"use client";

import { useQuery } from "@tanstack/react-query";
import type { ContactListReadiness } from "@/app/api/contact-lists/[id]/readiness/route";

const POLL_INTERVAL_MS = 30_000;

async function fetchReadiness(listId: string): Promise<ContactListReadiness> {
  const res = await fetch(`/api/contact-lists/${listId}/readiness`);
  if (!res.ok) return "ready"; // fail open — don't block sending over a status-check hiccup
  const data = await res.json();
  return data.status ?? "ready";
}

export function useContactListReadiness(listId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["contact-list-readiness", listId],
    queryFn: () => fetchReadiness(listId as string),
    enabled: !!listId,
    refetchInterval: (query) => (query.state.data === "not_ready" ? POLL_INTERVAL_MS : false),
    refetchOnWindowFocus: true,
  });

  return {
    status: query.data ?? "ready",
    isNotReady: query.data === "not_ready",
    isLoading: query.isLoading,
  };
}
