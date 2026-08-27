export const APP_LOCALE_COOKIE = "arqvia_locale";
export const APP_LOCALE_MAX_AGE = 60 * 60 * 24 * 365;
export const appLocales = ["es", "en"] as const;

export type AppLocale = (typeof appLocales)[number];

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && appLocales.includes(value as AppLocale);
}
