import Link from 'next/link';
import MobileSupportNavigation from './MobileSupportNavigation';
import { supportPages } from './support-content';
import type { SupportPageData } from './types';
import styles from './support.module.css';

export default function SupportShell({ page, children }: { page: SupportPageData; children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.container}>
          <Link className={styles.backLink} href="/"><span aria-hidden="true">←</span> Back to Home</Link>
          <p className={styles.eyebrow}>{page.category} · SIGMAVALUE OS</p>
          <h1>{page.content.heroTitle}</h1>
          <p className={styles.heroDescription}>{page.content.heroDescription}</p>
        </div>
      </section>

      <main className={styles.main}>
        <div className={styles.contentGrid}>
          <aside className={styles.sidebar} aria-label="Support sections">
            <p>Support sections</p>
            <nav className ="border border-red">
              {supportPages.map((item, index) => (
                <Link className={item.id === page.id ? styles.active : undefined} href={item.path} key={item.id} aria-current={item.id === page.id ? 'page' : undefined}>
                  <span>{String(index + 1).padStart(2, '0')}</span>{item.shortTitle}
                </Link>
              ))}
            </nav>
          </aside>
          <div className={styles.content}>{children}</div>
        </div>
      </main>

      <MobileSupportNavigation currentPageId={page.id} />
      <footer className={styles.footer}>
        <span><i aria-hidden="true" /> System operational</span>
        <span>© 2026 SigmaValue AI Corp</span>
      </footer>
    </div>
  );
}
