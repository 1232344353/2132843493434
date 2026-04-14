// src/app/api/strategy/scouting-overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { chatCompletionWithUsage } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { summarizeScouting } from "@/lib/scouting-summary";
import { summarizeExtraScoutingSignals } from "@/lib/scouting-ai-insights";
import {
  buildRateLimitHeaders,
  checkRateLimit,
  getTeamAiRateLimitKey,
  peekRateLimit,
  retryAfterSeconds,
  TEAM_AI_WINDOW_MS,
} from "@/lib/rate-limit";
import { buildFrcGamePrompt } from "@/lib/frc-game-prompt";
import {
  getTeamAiLimitFromSettings,
  getTeamAiPromptLimits,
} from "@/lib/platform-settings";
import { getEffectiveEventFormConfig } from "@/lib/event-form-config";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(plan_tier)")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 });
  }

  const orgMeta = Array.isArray(profile.organizations)
    ? profile.organizations[0]
    : profile.organizations;

  const teamAiPromptLimits = await getTeamAiPromptLimits(supabase);
  const aiLimit = getTeamAiLimitFromSettings(teamAiPromptLimits, orgMeta?.plan_tier);
  const aiLimitKey = getTeamAiRateLimitKey(profile.org_id);
  const snapshot = await peekRateLimit(aiLimitKey, TEAM_AI_WINDOW_MS, aiLimit);
  const limitHeaders = buildRateLimitHeaders(snapshot, aiLimit);

  if (snapshot.remaining <= 0) {
    const retryAfter = retryAfterSeconds(snapshot.resetAt);
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again soon." },
      { status: 429, headers: { ...limitHeaders, "Retry-After": retryAfter.toString() } }
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const scope = body?.scope === "team" ? "team" : "event";
  const teamNumber = typeof body?.teamNumber === "number" ? body.teamNumber : null;

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }
  if (scope === "team" && !teamNumber) {
    return NextResponse.json({ error: "teamNumber is required for team scope" }, { status: 400 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, name, year, tba_key")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { questions: abilityQuestions, formConfig } = event.tba_key
    ? await getEffectiveEventFormConfig(supabase, profile.org_id, event.tba_key)
    : { questions: [] as string[], formConfig: { customSections: [] } };

  const { data: matchesInEvent } = await supabase
    .from("matches")
    .select("id")
    .eq("event_id", eventId);
  const matchIds = matchesInEvent?.map((m) => m.id) ?? [];

  const gameContext = buildFrcGamePrompt(event.year);

  let summaryText: string;

  if (scope === "event") {
    const scoutingEntries =
      matchIds.length > 0
        ? (
            await supabase
              .from("scouting_entries")
              .select("team_number, auto_score, teleop_score, endgame_score, defense_rating, reliability_rating, notes, ability_answers, custom_data")
              .eq("org_id", profile.org_id)
              .in("match_id", matchIds)
          ).data ?? []
        : [];

    const pitEntries =
      (
        await supabase
          .from("pit_scout_entries")
          .select("team_number")
          .eq("org_id", profile.org_id)
          .eq("event_id", eventId)
      ).data ?? [];

    const pitScoutedTeams = new Set(pitEntries.map((p) => p.team_number));

    const byTeam = new Map<number, typeof scoutingEntries>();
    for (const entry of scoutingEntries) {
      if (!byTeam.has(entry.team_number)) byTeam.set(entry.team_number, []);
      byTeam.get(entry.team_number)!.push(entry);
    }

    const teamSummaryLines: string[] = [];
    for (const [tn, entries] of byTeam.entries()) {
      const summary = summarizeScouting(entries);
      const extra = summarizeExtraScoutingSignals(
        entries,
        abilityQuestions,
        formConfig.customSections ?? []
      );
      const pit = pitScoutedTeams.has(tn) ? "pit scouted" : "no pit scout";
      const avg = summary
        ? `avg auto ${summary.avg_auto}, teleop ${summary.avg_teleop}, endgame ${summary.avg_endgame}`
        : "no averages";
      const notes = summary?.notes.length ? `notes: ${summary.notes.slice(0, 2).join("; ")}` : "";
      const extraStr = extra.length ? extra.slice(0, 3).join(", ") : "";
      teamSummaryLines.push(
        `Team ${tn}: ${entries.length} entries, ${avg}, ${pit}${notes ? `, ${notes}` : ""}${extraStr ? `, ${extraStr}` : ""}`
      );
    }

    const lowCoverage = Array.from(byTeam.entries())
      .filter(([, e]) => e.length < 2)
      .map(([tn]) => `Team ${tn}`)
      .join(", ");

    const prompt = `You are analyzing FRC scouting data for an alliance selection advisor.

${gameContext}

Event: ${event.name}${event.year ? ` ${event.year}` : ""}

Scouting coverage (${byTeam.size} teams, ${scoutingEntries.length} total entries):
${teamSummaryLines.join("\n")}

${lowCoverage ? `Low coverage teams (fewer than 2 entries): ${lowCoverage}` : "All teams have at least 2 entries."}

Write a concise 3-4 sentence narrative for a drive team captain. Cover: overall coverage quality, the top 2-3 standout teams by scouting data, any low-coverage or high-variance teams worth flagging, and any notable field-wide patterns. Reference team numbers directly. No hype. No em dashes.`;

    const result = await chatCompletionWithUsage(apiKey, {
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });

    await checkRateLimit(aiLimitKey, TEAM_AI_WINDOW_MS, aiLimit, result.usage?.totalTokens ?? 100);
    summaryText = result.text;
  } else {
    // team scope
    const teamEntries =
      matchIds.length > 0
        ? (
            await supabase
              .from("scouting_entries")
              .select("auto_score, teleop_score, endgame_score, defense_rating, reliability_rating, notes, ability_answers, custom_data")
              .eq("org_id", profile.org_id)
              .eq("team_number", teamNumber!)
              .in("match_id", matchIds)
              .order("created_at", { ascending: true })
          ).data ?? []
        : [];

    const pitEntry =
      (
        await supabase
          .from("pit_scout_entries")
          .select("drivetrain, intake_types, scoring_ranges, climb_capability, auto_description, notes")
          .eq("org_id", profile.org_id)
          .eq("event_id", eventId)
          .eq("team_number", teamNumber!)
          .maybeSingle()
      ).data ?? null;

    const summary = summarizeScouting(teamEntries);
    const extra = summarizeExtraScoutingSignals(
      teamEntries,
      abilityQuestions,
      formConfig.customSections ?? []
    );

    const entriesText = summary
      ? `${teamEntries.length} entries. Avg auto ${summary.avg_auto}, teleop ${summary.avg_teleop}, endgame ${summary.avg_endgame}, defense ${summary.avg_defense}/5, reliability ${summary.avg_reliability}/5.${summary.notes.length ? ` Scout notes: ${summary.notes.join("; ")}.` : ""}${extra.length ? ` Extra signals: ${extra.join(", ")}.` : ""}`
      : "No match entries.";

    const toArr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

    const pitText = pitEntry
      ? `Pit scout: drivetrain ${pitEntry.drivetrain ?? "unknown"}, intake ${toArr(pitEntry.intake_types).join("/") || "unknown"}, scoring ${toArr(pitEntry.scoring_ranges).join("/") || "unknown"}, climb ${pitEntry.climb_capability ?? "unknown"}, auto: ${pitEntry.auto_description ?? "unknown"}.${pitEntry.notes ? ` Notes: ${pitEntry.notes}.` : ""}`
      : "No pit scout data.";

    const prompt = `You are an FRC scouting analyst. Summarize Team ${teamNumber}'s performance in 2-3 sentences for a drive team captain.

${gameContext}

${entriesText}

${pitText}

Be direct. Focus on consistency, key strengths, and any weaknesses worth noting. No hype. No em dashes.`;

    const result = await chatCompletionWithUsage(apiKey, {
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
    });

    await checkRateLimit(aiLimitKey, TEAM_AI_WINDOW_MS, aiLimit, result.usage?.totalTokens ?? 50);
    summaryText = result.text;
  }

  return NextResponse.json({ summary: summaryText }, { headers: limitHeaders });
}
