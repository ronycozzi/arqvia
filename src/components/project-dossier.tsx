"use client";

import { useId, useRef, useState } from "react";
import styles from "./arqvia-dossier.module.css";

type DossierSection = { title: string; text: string };

export function ProjectDossier({ sections }: { sections: DossierSection[] }) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const available = sections.filter((item) => item.text.trim());
  if (!available.length) return null;
  return (
    <div className={styles.story}>
      <div className={styles.storyTabs} role="tablist" aria-label="Historia del proyecto">
        {available.map((section, index) => (
          <button
            key={section.title}
            ref={(node) => { buttons.current[index] = node; }}
            type="button"
            id={`${id}-tab-${index}`}
            role="tab"
            aria-selected={selected === index}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.metaKey || event.altKey) return;
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % available.length;
              else if (event.key === "ArrowLeft") next = (index - 1 + available.length) % available.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = available.length - 1;
              else return;
              event.preventDefault();
              setSelected(next);
              buttons.current[next]?.focus();
            }}
          >{section.title}</button>
        ))}
      </div>
      {available.map((section, index) => (
        <div key={section.title} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={selected !== index} className={styles.storyPanel} tabIndex={0}>
          <p>{section.text}</p>
        </div>
      ))}
    </div>
  );
}

