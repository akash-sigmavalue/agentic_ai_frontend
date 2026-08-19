import type { Metadata } from 'next';
import ContactContent from '@/components/support/ContactContent';
import SupportShell from '@/components/support/SupportShell';
import { getSupportPage } from '@/components/support/support-content';

export const metadata: Metadata = { title: 'Contact us | SigmaValue OS', description: 'Contact SigmaValue for product support, enquiries, demos, and enterprise requirements.' };

export default function ContactPage() {
  const page = getSupportPage('contact');
  return <SupportShell page={page}><ContactContent content={page.content} /></SupportShell>;
}
