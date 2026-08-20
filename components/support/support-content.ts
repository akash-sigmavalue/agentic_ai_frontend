import rawSupportData from './data/supportData';
import rawFaqData from './data/faqData';
import type { FaqGroup, SupportPageData, SupportPageId } from './types';

const allSupportPages = rawSupportData as SupportPageData[];
export const supportPages = allSupportPages.filter((item) => item.id !== 'faq');
export const faqGroups = rawFaqData as FaqGroup[];

export function getSupportPage(id: SupportPageId) {
  const page = allSupportPages.find((item) => item.id === id);
  if (!page) throw new Error(`Support page "${id}" was not found.`);
  return page;
}
