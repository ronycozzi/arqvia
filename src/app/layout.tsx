import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import Script from "next/script";
import { AppChrome } from "@/components/app-chrome";
import { getPublicAnalyticsConfig } from "@/lib/analytics-config";
import { getPublicAreaLinks } from "@/lib/area-data";
import { buildBrandCssVariables, buildBrandTheme } from "@/lib/brand-theme";
import { getClientConfig } from "@/lib/client-config";
import { getPublicServiceLinks } from "@/lib/service-data";
import { siteConfig } from "@/lib/site-config";
import "./styles.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getClientConfig();
  const title = `${config.companyName} | Arquitectura, obra e interiores en Córdoba`;
  const description = config.heroSubtitle || siteConfig.description;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: title,
      template: `%s | ${config.companyName}`,
    },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "es_AR",
      siteName: config.companyName,
      images: [
        {
          url: config.heroImage,
          alt: `Proyecto de arquitectura de ${config.companyName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [config.heroImage],
    },
    robots: { index: true, follow: true },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/arqvia-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/arqvia-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/icons/arqvia-apple-180.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: config.companyName,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const config = await getClientConfig();
  const theme = buildBrandTheme(config);

  return {
    colorScheme: "light",
    viewportFit: "cover",
    themeColor: theme.background,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [config, areas, services] = await Promise.all([
    getClientConfig(),
    getPublicAreaLinks(),
    getPublicServiceLinks(),
  ]);
  const analytics = getPublicAnalyticsConfig();

  return (
    <html
      lang="es-AR"
      className={`${manrope.variable} ${newsreader.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      style={buildBrandCssVariables(config)}
    >
      <body className="flex min-h-full flex-col">
        <Script id="zod-csp-mode" strategy="beforeInteractive">
          {`globalThis.__zod_globalConfig = { ...(globalThis.__zod_globalConfig || {}), jitless: true };`}
        </Script>
        <AppChrome
          analytics={analytics}
          areas={areas}
          config={config}
          services={services}
        >
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
