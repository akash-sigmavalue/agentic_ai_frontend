import rawSupportData from './data/supportData';
import rawFaqData from './data/faqData';
import type { FaqGroup, SupportPageData, SupportPageId } from './types';

export const supportPages = rawSupportData as SupportPageData[];
export const faqGroups = rawFaqData as FaqGroup[];

export function getSupportPage(id: SupportPageId) {
  const page = supportPages.find((item) => item.id === id);
  if (!page) throw new Error(`Support page "${id}" was not found.`);
  return page;
}
