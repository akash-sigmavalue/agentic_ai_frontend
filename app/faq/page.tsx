import type { Metadata } from 'next';
import FAQExplorer from '@/components/support/FAQExplorer';
import SupportShell from '@/components/support/SupportShell';
import { getSupportPage } from '@/components/support/support-content';

export const metadata: Metadata = { title: 'Frequently Asked Questions | SigmaValue OS', description: 'Answers about SigmaValue valuation, Market Lens, Simulator, and PropGPT products.' };

export default function FAQPage() {
  const page = getSupportPage('faq');
  return <SupportShell page={page}><FAQExplorer /></SupportShell>;
}
