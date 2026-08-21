'use client';

import { useId, useMemo, useState } from 'react';
import { faqGroups } from './support-content';
import styles from './support.module.css';

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <article className={`${styles.faqItem} ${open ? styles.faqItemOpen : ''}`}>
    <h3><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={id}><span>{question}</span><i aria-hidden="true">{open ? '−' : '+'}</i></button></h3>
    <div id={id} hidden={!open}><p>{answer}</p></div>
  </article>;
}

export default function FAQExplorer() {
  const [category, setCategory] = useState(faqGroups[0]?.category ?? '');
  const [query, setQuery] = useState('');
  const faqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (faqGroups.find((group) => group.category === category)?.faqs ?? []).filter((faq) => !normalized || faq.q.toLowerCase().includes(normalized) || faq.a.toLowerCase().includes(normalized));
  }, [category, query]);

  return <div className={styles.faqExperience}>
    <section className={styles.faqStats} aria-label="Knowledge base summary">
      <div><strong>{faqGroups.reduce((total, group) => total + group.faqs.length, 0)}</strong><span>Answers</span></div>
      <div><strong>{faqGroups.length}</strong><span>Product categories</span></div>
      <div><strong>24/7</strong><span>Self-service access</span></div>
    </section>
    <section className={styles.faqBrowser}>
      <aside className={styles.faqCategories}>
        <label><span>Search knowledge base</span><input type="search" placeholder="Search FAQs..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <nav aria-label="FAQ categories">{faqGroups.map((group) => <button type="button" className={category === group.category ? styles.active : undefined} onClick={() => setCategory(group.category)} key={group.category} aria-pressed={category === group.category}><span>{group.category}</span><small>{group.faqs.length}</small></button>)}</nav>
      </aside>
      <div className={styles.faqResults}>
        <div className={styles.faqResultsHeader}><div><p className={styles.sectionLabel}>KNOWLEDGE BASE</p><h2>{category}</h2></div><span>{faqs.length} answers</span></div>
        <label className={styles.mobileSearch}><span>Search within {category}</span><input type="search" placeholder={`Search within ${category}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className={styles.faqList}>{faqs.map((faq) => <FAQItem key={`${category}-${faq.q}`} question={faq.q} answer={faq.a} />)}{faqs.length === 0 && <div className={styles.empty}><strong>No matching answers</strong><p>Try another search or choose a different category.</p></div>}</div>
      </div>
    </section>
  </div>;
}
