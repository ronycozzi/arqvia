"use client";

import { useEffect, useState } from "react";

export const leadNotificationReadEvent = "arqvia:lead-notifications-read-at-changed";

export type LeadNotificationReadEventDetail = {
  readAt: string | null;
};

export function AdminUnreadLeadBadge({
  createdAt,
  initialReadAt,
}: {
  createdAt: string;
  initialReadAt: string | null;
}) {
  const [isUnread, setIsUnread] = useState(() =>
    isCreatedAfterReadAt(createdAt, initialReadAt),
  );

  useEffect(() => {
    const handleReadAtChange = (event: Event) => {
      const detail = (event as CustomEvent<LeadNotificationReadEventDetail>).detail;
      setIsUnread(isCreatedAfterReadAt(createdAt, detail.readAt));
    };

    window.addEventListener(leadNotificationReadEvent, handleReadAtChange);
    return () => {
      window.removeEventListener(leadNotificationReadEvent, handleReadAtChange);
    };
  }, [createdAt]);

  if (!isUnread) return null;

  return (
    <span className="bg-bronze px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-paper">
      Nueva
    </span>
  );
}

function isCreatedAfterReadAt(createdAt: string, readAt: string | null) {
  return !readAt || new Date(createdAt).getTime() > new Date(readAt).getTime();
}
