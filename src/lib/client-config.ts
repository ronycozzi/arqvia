import type { ClientConfig } from "@prisma/client";
import { cache } from "react";
import { imageKit } from "@/lib/content";
import { prisma } from "@/lib/db";
import { fallbackPublicContent } from "@/lib/public-content-policy";
import { siteConfig } from "@/lib/site-config";

export type PublicClientConfig = {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  businessHours: string;
  instagramUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export const CLIENT_CONFIG_ID = "arqvia-config";

export const fallbackClientConfig: PublicClientConfig = {
  companyName: siteConfig.name,
  logoUrl: "",
  primaryColor: "#1c211d",
  secondaryColor: "#eef0eb",
  accentColor: "#9b6a39",
  fontHeading: "Newsreader",
  fontBody: "Manrope",
  whatsapp: siteConfig.whatsappNumber,
  phone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  address: siteConfig.contact.address,
  businessHours: siteConfig.contact.businessHours,
  instagramUrl: siteConfig.socials.instagram,
  linkedinUrl: siteConfig.socials.linkedin,
  facebookUrl: siteConfig.socials.facebook,
  heroTitle: "Arquitectura pensada para construirse bien.",
  heroSubtitle:
    "Diseñamos, planificamos y acompañamos proyectos residenciales y comerciales desde la primera idea hasta la entrega final.",
  heroImage: imageKit.hero,
  primaryCtaLabel: siteConfig.ctas.primary,
  secondaryCtaLabel: siteConfig.ctas.secondary,
};

function cleanSocialUrl(value: string | null | undefined) {
  const url = value?.trim() || "";
  if (
    url === "https://instagram.com/" ||
    url === "https://www.instagram.com/" ||
    url === "https://linkedin.com/" ||
    url === "https://www.linkedin.com/" ||
    url === "https://facebook.com/" ||
    url === "https://www.facebook.com/"
  ) {
    return "";
  }

  return url;
}

export function toPublicClientConfig(config: ClientConfig): PublicClientConfig {
  return {
    companyName: config.companyName,
    logoUrl: config.logoUrl || "",
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    accentColor: config.accentColor,
    fontHeading: config.fontHeading,
    fontBody: config.fontBody,
    whatsapp: config.whatsapp,
    phone: config.phone,
    email: config.email,
    address: config.address,
    businessHours: config.businessHours,
    instagramUrl: cleanSocialUrl(config.instagramUrl),
    linkedinUrl: cleanSocialUrl(config.linkedinUrl),
    facebookUrl: cleanSocialUrl(config.facebookUrl),
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
    heroImage: config.heroImage,
    primaryCtaLabel: config.primaryCtaLabel,
    secondaryCtaLabel: config.secondaryCtaLabel,
  };
}

export const getClientConfig = cache(async (): Promise<PublicClientConfig> => {
  try {
    const config = await prisma.clientConfig.findUnique({
      where: { id: CLIENT_CONFIG_ID },
    });

    return config
      ? toPublicClientConfig(config)
      : fallbackPublicContent("client configuration", fallbackClientConfig);
  } catch (error) {
    return fallbackPublicContent(
      "client configuration",
      fallbackClientConfig,
      error,
    );
  }
});
