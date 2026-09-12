"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface HistorySyncClientProps {
  historyIds: string[];
}

export function HistorySyncClient({ historyIds }: HistorySyncClientProps) {
  const router = useRouter();
  const isSyncing = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const serializedIds = JSON.stringify(historyIds);

  async function runSync(ids: string[]) {
    if (ids.length === 0 || isSyncing.current) return;
    if (document.visibilityState === "hidden") return;

    isSyncing.current = true;
    try {
      const response = await fetch("/api/email-history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyIds: ids }),
      });

      if (response.ok) {
        setLastSynced(new Date());
        router.refresh();
      }
    } catch (err) {
      console.error("[HistorySyncClient] Background sync failed:", err);
    } finally {
      isSyncing.current = false;
    }
  }

  useEffect(() => {
    const ids: string[] = JSON.parse(serializedIds);
    if (ids.length === 0) return;

    runSync(ids);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => runSync(ids), 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [serializedIds]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        const ids: string[] = JSON.parse(serializedIds);
        runSync(ids);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [serializedIds]);

  return null;
}
