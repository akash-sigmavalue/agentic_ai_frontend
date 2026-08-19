'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supportPages } from './support-content';
import type { SupportPageId } from './types';
import styles from './support.module.css';

export default function MobileSupportNavigation({ currentPageId }: { currentPageId: SupportPageId }) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button className={`${styles.mobileTrigger} ${open ? styles.mobileTriggerOpen : ''}`} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="support-mobile-nav" aria-label={open ? 'Close support navigation' : 'Open support navigation'}>
        <span /><span /><span />
      </button>
      {open && <button className={styles.overlay} type="button" onClick={() => setOpen(false)} aria-label="Close support navigation" />}
      <div id="support-mobile-nav" className={`${styles.mobileSheet} ${open ? styles.mobileSheetOpen : ''}`} role="dialog" aria-modal="true" aria-label="Support sections" aria-hidden={!open}>
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <div><span>SUPPORT SECTIONS</span><h2>Explore Support</h2></div>
          <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} aria-label="Close support navigation">×</button>
        </div>
        <Link className={styles.sheetBack} href="/" onClick={() => setOpen(false)}>← Back to Home</Link>
        <nav>
          {supportPages.map((item) => (
            <Link key={item.id} className={item.id === currentPageId ? styles.active : undefined} href={item.path} onClick={() => setOpen(false)} aria-current={item.id === currentPageId ? 'page' : undefined}>
              <span>{item.shortTitle}</span><span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
