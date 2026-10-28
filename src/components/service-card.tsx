import Image from "@/components/app-image";
import Link from "next/link";
import {
  ArrowUpRight, Building2, ClipboardCheck, DraftingCompass,
  Hammer, Home, LampDesk, Ruler, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PublicService } from "@/types/service";
import styles from "./arqvia-cards.module.css";

const serviceIcons: Record<string, LucideIcon> = {
  Building2, ClipboardCheck, DraftingCompass, Hammer, Home, LampDesk, Ruler, Sparkles,
};

export function ServiceCard({ service }: { service: PublicService }) {
  const Icon = serviceIcons[service.iconName] || DraftingCompass;
  const included = service.included.filter((item) => item.trim()).slice(0, 2);

  return (
    <article className={styles.service}>
      <Link href={`/servicios/${service.slug}`} className={styles.serviceLink} aria-label={`Ver servicio: ${service.title}`}>
        <div className={styles.serviceMedia}>
          <Image
            src={service.coverImage}
            alt=""
            fill
            quality={88}
            sizes="(min-width: 1280px) 400px, (min-width: 1024px) calc(33vw - 32px), (min-width: 768px) calc(50vw - 32px), calc(100vw - 40px)"
            className={styles.image}
          />
          <span className={styles.serviceCategory}>{service.categoryName}</span>
          <span className={styles.serviceIcon}><Icon size={22} strokeWidth={1.4} aria-hidden="true" /></span>
        </div>
        <div className={styles.serviceBody}>
          <h3 className={`font-serif ${styles.serviceTitle}`}>{service.title}</h3>
          <p className={styles.description}>{service.shortDescription}</p>
          {included.length ? (
            <ul className={styles.deliverables} aria-label="Parte del alcance">
              {included.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
          <span className={styles.serviceAction}>Explorar el servicio <ArrowUpRight size={18} aria-hidden="true" /></span>
        </div>
      </Link>
    </article>
  );
}
