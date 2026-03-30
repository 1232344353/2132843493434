import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { changelog } from "@/content/changelog";
import { ChangelogEntry } from "./changelog-entry";

export const metadata: Metadata = {
  title: "Changelog | PitPilot",
  description: "New features, improvements, and fixes shipped to PitPilot.",
};

export default function ChangelogPage() {
  return (
    <div className="marketing-shell text-white">
      <Navbar />

      <main className="marketing-content mx-auto max-w-2xl px-4 pb-24 pt-32">
        {/* Header */}
        <div className="mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            What&apos;s new
          </p>
          <h1 className="font-outfit mt-3 text-4xl font-bold tracking-tight text-white">
            Changelog
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            Every feature, fix, and improvement we ship.
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {changelog.map((week, weekIdx) => (
            <div key={week.week} className="relative flex gap-6 pb-12">
              {/* Date column */}
              <div className="w-14 shrink-0 pt-1">
                <p className="text-xs font-medium tabular-nums text-gray-500 leading-none">
                  {week.week}
                </p>
              </div>

              {/* Timeline spine */}
              <div className="relative flex shrink-0 flex-col items-center">
                <div
                  className={`relative mt-1 h-2.5 w-2.5 rounded-full ${
                    weekIdx === 0
                      ? "bg-teal-400 ring-4 ring-teal-400/15"
                      : "bg-white/20"
                  }`}
                />
                {weekIdx < changelog.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-white/[0.07]" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-2">
                <ChangelogEntry
                  title={week.title}
                  summary={week.summary}
                  changes={week.changes}
                  isLatest={weekIdx === 0}
                  defaultOpen={weekIdx === 0}
                />
              </div>
            </div>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
