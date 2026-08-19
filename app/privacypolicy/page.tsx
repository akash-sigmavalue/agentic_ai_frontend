import type { Metadata } from 'next';
import SupportSection from '@/components/support/SupportSection';
import SupportShell from '@/components/support/SupportShell';
import { getSupportPage } from '@/components/support/support-content';

export const metadata: Metadata = { title: 'Privacy Policy | SigmaValue OS', description: 'Learn how SigmaValue handles and protects information across its platform.' };

export default function PrivacyPage() {
  const page = getSupportPage('privacy');
  return <SupportShell page={page}>{page.content.sections?.map((section, index) => <SupportSection key={`${section.title}-${index}`} section={section} />)}</SupportShell>;
}
