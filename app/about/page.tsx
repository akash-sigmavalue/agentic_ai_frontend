import type { Metadata } from 'next';
import SupportSection from '@/components/support/SupportSection';
import SupportShell from '@/components/support/SupportShell';
import { getSupportPage } from '@/components/support/support-content';

export const metadata: Metadata = { title: 'About us | SigmaValue OS', description: 'Learn about SigmaValue, its real-estate intelligence technology, team, and vision.' };

export default function AboutPage() {
  const page = getSupportPage('about');
  return <SupportShell page={page}>{page.content.sections?.map((section, index) => <SupportSection key={`${section.title}-${index}`} section={section} />)}</SupportShell>;
}
