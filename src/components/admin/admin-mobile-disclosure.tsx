"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

export function AdminMobileDisclosure({
  children,
  description,
  label,
  testId,
}: {
  children: ReactNode;
  description: string;
  label: string;
  testId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="min-w-0" data-testid={testId}>
      <button
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="premium-card flex min-h-20 w-full items-center justify-between gap-4 p-5 text-left text-ink md:hidden"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5">{label}</span>
          <span className="mt-1 block text-xs leading-5 text-ink/62">
            {description}
          </span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-bronze transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        className={`${isOpen ? "mt-3 block" : "hidden"} md:mt-0 md:block`}
      >
        {children}
      </div>
    </div>
  );
}
