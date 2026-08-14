"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function FaqAccordion({
  items,
}: {
  items: { question: string; answer: string; category?: string }[];
}) {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <div className="relative overflow-hidden border border-ink/10 bg-paper shadow-premium">
      {items.map((item, index) => (
        <div key={item.question} className="border-b border-ink/10 last:border-b-0">
          <button
            id={`${baseId}-button-${index}`}
            type="button"
            className="flex w-full items-center justify-between gap-6 px-5 py-6 text-left transition duration-300 hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze md:px-6"
            onClick={() => setOpen(open === index ? -1 : index)}
            aria-expanded={open === index}
            aria-controls={`${baseId}-panel-${index}`}
          >
            <span>
              {item.category ? (
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
                  {item.category}
                </span>
              ) : null}
              <span className="font-serif text-2xl text-ink">{item.question}</span>
            </span>
            <ChevronDown
              className={cn(
                "size-5 shrink-0 transition",
                open === index && "rotate-180 text-bronze",
              )}
            />
          </button>
          <div
            id={`${baseId}-panel-${index}`}
            role="region"
            aria-hidden={open !== index}
            aria-labelledby={`${baseId}-button-${index}`}
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
              open === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <p className="px-5 pb-6 pr-10 text-sm leading-7 text-ink/75 md:px-6">
                {item.answer}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
