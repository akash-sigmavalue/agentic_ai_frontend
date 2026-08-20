import Image from 'next/image';
import type { SupportSectionData } from './types';
import styles from './support.module.css';

export default function SupportSection({ section }: { section: SupportSectionData }) {
  if (section.type === 'about-intro') {
    return <section className={styles.aboutIntro}><p>{section.paragraphs?.[0]}</p></section>;
  }

  if (section.type === 'about-who' && section.image) {
    return <section className={styles.aboutWho}>
      <div><p className={styles.sectionLabel}>OUR COMPANY</p><h2>{section.title}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      <Image src={section.image} alt={section.imageAlt ?? ''} width={720} height={480} sizes="(max-width: 800px) 100vw, 42vw" />
    </section>;
  }

  if (section.type === 'founder' && section.person) {
    return <section className={styles.founder}>
      <p className={styles.sectionLabel}>LEADERSHIP</p><h2>{section.title}</h2>
      <div className={styles.founderCard}>
        <Image src={section.person.image} alt={section.person.imageAlt} width={480} height={560} sizes="(max-width: 800px) 100vw, 300px" />
        <div><h3>{section.person.name}</h3><strong>{section.person.designation}</strong>{section.person.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </div>
    </section>;
  }

  return <section className={styles.textSection}>
    <h2>{section.title}</h2>
    {section.paragraphs?.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>)}
    {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
    {section.footerParagraph && <p className={styles.notice}>{section.footerParagraph}</p>}
  </section>;
}
