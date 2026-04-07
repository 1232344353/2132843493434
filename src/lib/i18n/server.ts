import { cookies } from "next/headers";
import { translate, type Locale, LOCALES } from "./index";
import type { TranslationKey } from "./en";

const COOKIE_KEY = "pitpilot_locale";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const saved = cookieStore.get(COOKIE_KEY)?.value;
  if (saved && LOCALES.includes(saved as Locale)) return saved as Locale;
  return "en";
}

/**
 * Returns a translation function pre-bound to the request's locale.
 * Use this in server components instead of the useTranslation() hook.
 *
 * @example
 * const t = await getServerT();
 * return <h1>{t("dashboard.teamOverview")}</h1>;
 */
export async function getServerT() {
  const locale = await getServerLocale();
  return (
    key: TranslationKey | string,
    vars?: Record<string, string | number>
  ) => translate(locale, key, vars);
}
