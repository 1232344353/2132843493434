"use client";

import { useState, useTransition } from "react";
import { submitContactMessage } from "@/lib/contact-actions";
import { useTranslation } from "@/components/i18n-provider";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { t } = useTranslation();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSent(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await submitContactMessage(formData);
      if (result?.error) {
        setError(result.error);
        setSent(false);
        return;
      }
      setSent(true);
      form.reset();
    });
  }

  return (
    <div className="marketing-card rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{t("contact.leaveMessage")}</h2>
      <p className="mt-1 text-sm text-gray-300">
        {t("contact.leaveMessageSub")}
      </p>

      {sent && (
        <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {t("contact.sent")}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="text"
          name="company"
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t("contact.emailLabel")}
          </label>
          <input
            name="email"
            type="email"
            required
            className="marketing-input mt-2 w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
            placeholder={t("contact.emailPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t("contact.subjectLabel")}
          </label>
          <input
            name="subject"
            type="text"
            required
            className="marketing-input mt-2 w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
            placeholder={t("contact.subjectPlaceholder")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t("contact.messageLabel")}
          </label>
          <textarea
            name="message"
            rows={5}
            required
            className="marketing-input mt-2 w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
            placeholder={t("contact.messagePlaceholder")}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:opacity-50"
        >
          {isPending ? t("contact.sending") : t("contact.send")}
        </button>
      </form>
    </div>
  );
}
