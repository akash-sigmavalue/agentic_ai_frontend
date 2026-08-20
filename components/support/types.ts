export type SupportPageId = 'contact' | 'terms' | 'privacy' | 'about' | 'faq';

export type SupportSectionData = {
  type: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  footerParagraph?: string;
  image?: string;
  imageAlt?: string;
  person?: {
    name: string;
    designation: string;
    image: string;
    imageAlt: string;
    paragraphs: string[];
  };
};

export type ContactField = {
  name: 'name' | 'email' | 'phone' | 'message';
  label: string;
  type: string;
  placeholder: string;
  required: boolean;
};

export type Office = {
  id: string;
  city: string;
  title: string;
  address: string;
  phoneLabel: string;
  phone: string;
  emailLabel: string;
  email: string;
  mapLabel: string;
};

export type SupportPageData = {
  id: SupportPageId;
  title: string;
  shortTitle: string;
  category: string;
  path: string;
  description: string;
  content: {
    heroTitle: string;
    heroDescription: string;
    sections?: SupportSectionData[];
    form?: {
      title: string;
      description: string;
      buttonText: string;
      fields: ContactField[];
    };
    offices?: Office[];
    map?: { title: string; description: string; embedQuery: string };
  };
};

export type FaqGroup = {
  category: string;
  faqs: Array<{ q: string; a: string }>;
};
