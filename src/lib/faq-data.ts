import { faqs as seedFaqs } from "@/lib/content";
import { prisma } from "@/lib/db";
import {
  fallbackPublicContent,
  seedCollectionOrEmpty,
} from "@/lib/public-content-policy";

export type PublicFaq = {
  question: string;
  answer: string;
  category: string;
};

function limitFaqs(items: PublicFaq[], limit?: number) {
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export async function getPublicFaqs(limit?: number): Promise<PublicFaq[]> {
  try {
    const rows = await prisma.faq.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { question: "asc" }],
      take: limit,
    });

    if (rows.length) {
      return rows.map((item) => ({
        question: item.question,
        answer: item.answer,
        category: item.category,
      }));
    }

    const faqCount = await prisma.faq.count();
    if (faqCount > 0) return [];
  } catch (error) {
    return limitFaqs(
      fallbackPublicContent("frequently asked questions", seedFaqs, error),
      limit,
    );
  }

  return limitFaqs(seedCollectionOrEmpty(seedFaqs), limit);
}
