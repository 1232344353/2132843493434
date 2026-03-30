import type { CustomSection } from "@/lib/platform-settings";

type ExtraEntryInput = {
  ability_answers?: unknown;
  custom_data?: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeSnippet(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length <= 80 ? trimmed : `${trimmed.slice(0, 77)}...`;
}

export function summarizeExtraScoutingSignals(
  entries: ExtraEntryInput[],
  abilityQuestions: string[],
  customSections: CustomSection[]
): string[] {
  const insights: string[] = [];

  for (const question of abilityQuestions) {
    let yes = 0;
    let no = 0;

    for (const entry of entries) {
      const answers = asObject(entry.ability_answers);
      const value = answers?.[question];
      if (value === true) yes += 1;
      else if (value === false) no += 1;
    }

    const answered = yes + no;
    if (answered === 0) continue;

    if (yes === answered) insights.push(`${question}: yes in ${yes}/${answered} entries.`);
    else if (no === answered) insights.push(`${question}: no in ${no}/${answered} entries.`);
    else insights.push(`${question}: yes in ${yes}/${answered} entries.`);
  }

  for (const section of customSections) {
    for (const field of section.fields) {
      const label = `${section.title}: ${field.label}`;

      if (field.type === "counter") {
        const values: number[] = [];
        for (const entry of entries) {
          const customData = asObject(entry.custom_data);
          const value = customData?.[field.id];
          if (typeof value === "number" && Number.isFinite(value)) {
            values.push(value);
          }
        }
        if (values.length === 0) continue;
        const average = round1(values.reduce((sum, value) => sum + value, 0) / values.length);
        insights.push(`${label}: avg ${average}, max ${Math.max(...values)}.`);
        continue;
      }

      if (field.type === "toggle") {
        let enabled = 0;
        let answered = 0;
        for (const entry of entries) {
          const customData = asObject(entry.custom_data);
          const value = customData?.[field.id];
          if (typeof value === "boolean") {
            answered += 1;
            if (value) enabled += 1;
          }
        }
        if (answered === 0) continue;
        insights.push(`${label}: enabled in ${enabled}/${answered} entries.`);
        continue;
      }

      if (field.type === "multi-select") {
        const optionCounts = new Map<string, number>();
        let answered = 0;

        for (const entry of entries) {
          const customData = asObject(entry.custom_data);
          const value = customData?.[field.id];
          if (!Array.isArray(value)) continue;

          const selected = value.filter((item): item is string => typeof item === "string");
          if (selected.length === 0) continue;
          answered += 1;

          for (const key of selected) {
            optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
          }
        }

        if (answered === 0 || optionCounts.size === 0) continue;

        const topOptions = Array.from(optionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([key, count]) => {
            const optionLabel = field.options?.find((option) => option.key === key)?.label ?? key;
            return `${optionLabel} (${count})`;
          })
          .join(", ");

        insights.push(`${label}: common selections ${topOptions}.`);
        continue;
      }

      if (field.type === "rating") {
        const values: number[] = [];
        for (const entry of entries) {
          const customData = asObject(entry.custom_data);
          const value = customData?.[field.id];
          if (typeof value === "number" && Number.isFinite(value)) {
            values.push(value);
          }
        }
        if (values.length === 0) continue;
        const average = round1(values.reduce((sum, value) => sum + value, 0) / values.length);
        insights.push(`${label}: avg ${average}/${field.maxStars ?? 5}.`);
        continue;
      }

      if (field.type === "text") {
        const snippets = Array.from(
          new Set(
            entries
              .map((entry) => asObject(entry.custom_data)?.[field.id])
              .filter((value): value is string => typeof value === "string")
              .map(normalizeSnippet)
              .filter((value) => value.length > 0)
          )
        ).slice(0, 2);

        if (snippets.length === 0) continue;
        insights.push(`${label}: ${snippets.map((snippet) => `"${snippet}"`).join("; ")}.`);
      }
    }
  }

  return insights.slice(0, 8);
}
