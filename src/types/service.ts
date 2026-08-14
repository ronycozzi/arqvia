export type ServiceFaq = {
  question: string;
  answer: string;
};

export type PublicService = {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryName: string;
  iconName: string;
  shortDescription: string;
  description: string;
  mainBenefit: string;
  benefits: string[];
  audience: string;
  included: string[];
  process: string[];
  faq: ServiceFaq[];
  whatsappMessage: string;
  seoTitle: string;
  seoDescription: string;
  coverImage: string;
  featured: boolean;
  updatedAt: Date | null;
};
