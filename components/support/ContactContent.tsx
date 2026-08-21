'use client';

import { FormEvent, useState } from 'react';
import type { SupportPageData } from './types';
import styles from './support.module.css';

export default function ContactContent({ content }: { content: SupportPageData['content'] }) {
  const form = content.form!;
  const offices = content.offices!;
  const map = content.map!;
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent(`SigmaValue enquiry from ${formData.name}`);
    const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\nMessage:\n${formData.message}`);
    setStatus('Opening your email application to complete the enquiry.');
    window.location.href = `mailto:admin@sigmavalue.co.in?subject=${subject}&body=${body}`;
  }

  return <>
    <section className={styles.contactPanel}>
      <div className={styles.contactIntro}>
        <p className={styles.sectionLabel}>CONTACT</p><h2>{form.title}</h2><p>{form.description}</p>
        <div className={styles.directContact}><span>Prefer email?</span><a href="mailto:admin@sigmavalue.co.in">admin@sigmavalue.co.in</a></div>
      </div>
      <form className={styles.contactForm} onSubmit={submit}>
        {form.fields.map((field) => <div className={field.name === 'message' ? styles.fullField : undefined} key={field.name}>
          <label htmlFor={field.name}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
          {field.type === 'textarea' ? <textarea id={field.name} name={field.name} placeholder={field.placeholder} value={formData[field.name]} onChange={(e) => setFormData((value) => ({ ...value, [field.name]: e.target.value }))} required={field.required} rows={5} /> : <input id={field.name} name={field.name} type={field.type} placeholder={field.placeholder} value={formData[field.name]} onChange={(e) => setFormData((value) => ({ ...value, [field.name]: e.target.value }))} required={field.required} />}
        </div>)}
        <button type="submit">{form.buttonText}<span aria-hidden="true">→</span></button>
        {status && <p className={styles.formStatus} role="status">{status}</p>}
      </form>
    </section>

    <section className={styles.officeSection}>
      <div className={styles.sectionHeading}><p className={styles.sectionLabel}>LOCATIONS</p><h2>Our Offices</h2><p>Connect with SigmaValue through one of our office locations.</p></div>
      <div className={styles.officeGrid}>{offices.map((office) => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}`;
        return <article className={styles.officeCard} key={office.id}>
          <div><span>{office.city}</span><small>OFFICE</small></div><h3>{office.title}</h3><p>{office.address}</p>
          <dl><div><dt>{office.phoneLabel}</dt><dd><a href={`tel:${office.phone}`}>{office.phone}</a></dd></div><div><dt>{office.emailLabel}</dt><dd><a href={`mailto:${office.email}`}>{office.email}</a></dd></div></dl>
          <a className={styles.mapLink} href={mapUrl} target="_blank" rel="noopener noreferrer">{office.mapLabel} <span aria-hidden="true">↗</span></a>
        </article>;
      })}</div>
    </section>

    <section className={styles.mapSection}>
      <div className={styles.sectionHeading}><p className={styles.sectionLabel}>LOCATION</p><h2>{map.title}</h2><p>{map.description}</p></div>
      <iframe title="SigmaValue Pune office location" src={`https://www.google.com/maps?q=${encodeURIComponent(map.embedQuery)}&output=embed`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
    </section>
  </>;
}
