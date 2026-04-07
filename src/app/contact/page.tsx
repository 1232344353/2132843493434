import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { getServerT } from "@/lib/i18n/server";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact | PitPilot",
  description: "Get in touch with the PitPilot team.",
};

export default async function ContactPage() {
  const t = await getServerT();

  return (
    <div className="marketing-shell text-white">
      <Navbar />

      <main className="marketing-content mx-auto max-w-5xl px-4 pb-16 pt-32">
        <div className="marketing-card relative overflow-hidden rounded-3xl p-8">
          <div className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
              {t("contact.label")}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{t("contact.heading")}</h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-300">
              {t("contact.subheading")}
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <ContactForm />

          <div className="marketing-card rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold">{t("contact.whatToInclude")}</h2>
            <p className="mt-1 text-sm text-gray-300">
              {t("contact.whatToIncludeSub")}
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-300">
              <li className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                {t("contact.item1")}
              </li>
              <li className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                {t("contact.item2")}
              </li>
              <li className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                {t("contact.item3")}
              </li>
            </ul>
            <p className="mt-6 text-xs text-gray-500">
              {t("contact.responseTime")}
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
