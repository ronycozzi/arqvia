import { publicEnv } from "@/lib/public-env";

export type AnalyticsProvider = "none" | "ga4" | "gtm";

export type PublicAnalyticsConfig = {
  enabled: boolean;
  id: string;
  provider: AnalyticsProvider;
};

export function getPublicAnalyticsConfig(): PublicAnalyticsConfig {
  const provider = publicEnv.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const id = publicEnv.NEXT_PUBLIC_ANALYTICS_ID;

  return {
    enabled: provider !== "none" && Boolean(id),
    id,
    provider,
  };
}
