import styles from "./arqvia-dossier.module.css";

export function DossierLoading({ detail = false, label }: { detail?: boolean; label: string }) {
  return <div className={styles.shell} role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonTitle} />
      {detail ? <div className={styles.overview}><div className={styles.skeletonImage} /><div><div className={styles.skeletonTitle} /><div className={styles.skeletonLine} /><div className={styles.skeletonLine} /><div className={styles.facts}>{Array.from({length:8}, (_, index) => <div key={index}><div className={styles.skeletonLine} /></div>)}</div></div></div> : <div className={styles.projects}>{Array.from({length:4}, (_, index) => <div key={index}><div className={styles.skeletonImage} /><div className={styles.skeletonLine} /></div>)}</div>}
    </div>
  </div>;
}
