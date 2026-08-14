"use client";

import type { ReactNode } from "react";

export function LeadContactLink({
  channel,
  children,
  className,
  href,
  leadId,
}: {
  channel: "WHATSAPP" | "EMAIL";
  children: ReactNode;
  className: string;
  href: string;
  leadId: string;
}) {
  function recordContact() {
    void fetch(`/api/admin/leads/${leadId}/contact`, {
      body: JSON.stringify({ channel }),
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => undefined);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={recordContact}
    >
      {children}
    </a>
  );
}
