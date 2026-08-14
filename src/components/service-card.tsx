import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  DraftingCompass,
  Hammer,
  LampDesk,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PublicService } from "@/types/service";

const serviceIcons: Record<string, LucideIcon> = {
  Building2,
  ClipboardCheck,
  DraftingCompass,
  Hammer,
  LampDesk,
  Sparkles,
};

export function ServiceCard({ service }: { service: PublicService }) {
  const Icon = serviceIcons[service.iconName] || Sparkles;

  return (
    <article className="group flex h-full min-h-[248px] flex-col border border-ink/12 bg-paper p-5 shadow-[0_10px_30px_rgba(28,33,29,0.06)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-bronze/45 hover:shadow-[0_18px_42px_rgba(28,33,29,0.1)] focus-within:-translate-y-1 focus-within:border-bronze/45 focus-within:shadow-[0_18px_42px_rgba(28,33,29,0.1)] motion-reduce:transform-none motion-reduce:transition-none md:p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="grid size-10 shrink-0 place-items-center border border-ink/10 bg-graphite text-paper transition-colors duration-300 group-hover:border-bronze group-hover:bg-bronze group-focus-within:border-bronze group-focus-within:bg-bronze motion-reduce:transition-none">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="text-right text-xs font-semibold uppercase leading-4 text-ink/70">
          {service.categoryName}
        </span>
      </div>

      <div className="mt-7">
        <h3 className="font-serif text-2xl font-medium leading-[1.12] text-ink md:text-[1.7rem]">
          {service.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/72">
          {service.shortDescription}
        </p>
      </div>

      <Link
        href={`/servicios/${service.slug}`}
        aria-label={`Ver servicio: ${service.title}`}
        className="architectural-link mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold text-ink transition-colors duration-200 hover:text-bronze focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze motion-reduce:transition-none"
      >
        Ver servicio
        <ArrowUpRight
          className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-within:-translate-y-0.5 group-focus-within:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
}
