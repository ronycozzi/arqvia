import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  fallbackHomeContent,
  HOME_CONTENT_ID,
  type PublicHomeContent,
  toPublicHomeContent,
} from "@/lib/home-content";
import { fallbackPublicContent } from "@/lib/public-content-policy";

export const getHomeContent = cache(async (): Promise<PublicHomeContent> => {
  try {
    const content = await prisma.homeContent.findUnique({
      where: { id: HOME_CONTENT_ID },
    });
    const publicContent = content ? toPublicHomeContent(content) : null;

    return publicContent
      ? publicContent
      : fallbackPublicContent("home content", fallbackHomeContent);
  } catch (error) {
    return fallbackPublicContent("home content", fallbackHomeContent, error);
  }
});
