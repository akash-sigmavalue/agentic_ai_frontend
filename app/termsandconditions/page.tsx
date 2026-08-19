import type { Metadata } from 'next';
import SupportSection from '@/components/support/SupportSection';
import SupportShell from '@/components/support/SupportShell';
import { getSupportPage } from '@/components/support/support-content';

export const metadata: Metadata = { title: 'Terms and Conditions | SigmaValue OS', description: 'Terms and conditions governing use of SigmaValue products and services.' };

export default function TermsPage() {
  const page = getSupportPage('terms');
  return <SupportShell page={page}>{page.content.sections?.map((section, index) => <SupportSection key={`${section.title}-${index}`} section={section} />)}</SupportShell>;
}
