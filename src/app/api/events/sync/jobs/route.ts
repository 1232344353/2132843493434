import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildRateLimitHeaders,
  checkRateLimit,
  retryAfterSeconds,
} from "@/lib/rate-limit";
import {
  enqueueEventSyncJob,
  getActiveEventSyncJob,
  kickSyncWorker,
  toPublicJob,
} from "@/lib/sync-job-queue";
import { EVENT_KEY_PATTERN } from "@/lib/event-sync";
import { reportError } from "@/lib/observability";

export const runtime = "nodejs";
export const maxDuration = 60;

const EVENT_SYNC_RATE_LIMIT_MAX = 2;
const STATS_SYNC_RATE_LIMIT_MAX = 2;
type SyncJobMode = "full" | "stats";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as
      | { eventKey?: string; mode?: string }
      | null;
    const eventKeyRaw =
      typeof payload?.eventKey === "string" ? payload.eventKey.trim() : "";
    const eventKey = eventKeyRaw.toLowerCase();
    const mode: SyncJobMode = payload?.mode === "stats" ? "stats" : "full";

    if (!eventKey) {
      return NextResponse.json(
        { error: "eventKey is required (e.g. '2025hiho')" },
        { status: 400 }
      );
    }

    if (!EVENT_KEY_PATTERN.test(eventKey)) {
      return NextResponse.json(
        { error: "Invalid event key format (expected e.g. 2025hiho)." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    if (profile.role !== "captain") {
      return NextResponse.json(
        { error: `Only captains can sync ${mode === "stats" ? "stats" : "events"}` },
        { status: 403 }
      );
    }

    const activeJob = await getActiveEventSyncJob(profile.org_id, eventKey);
    if (activeJob) {
      return NextResponse.json(
        {
          success: true,
          job: toPublicJob(activeJob),
        },
        { status: 202 }
      );
    }

    const statsLimit = await checkRateLimit(
      `stats-sync:${profile.org_id}`,
      5 * 60_000,
      STATS_SYNC_RATE_LIMIT_MAX
    );
    const statsHeaders = buildRateLimitHeaders(
      statsLimit,
      STATS_SYNC_RATE_LIMIT_MAX
    );
    if (!statsLimit.allowed) {
      const retryAfter = retryAfterSeconds(statsLimit.resetAt);
      return NextResponse.json(
        { error: "Your team has exceeded the stats sync rate limit. Please try again soon." },
        {
          status: 429,
          headers: { ...statsHeaders, "Retry-After": retryAfter.toString() },
        }
      );
    }

    let responseHeaders: HeadersInit = statsHeaders;
    let orgTeamNumber: number | null = null;

    if (mode === "full") {
      const eventLimit = await checkRateLimit(
        `events-sync:${profile.org_id}`,
        5 * 60_000,
        EVENT_SYNC_RATE_LIMIT_MAX
      );
      const eventHeaders = buildRateLimitHeaders(
        eventLimit,
        EVENT_SYNC_RATE_LIMIT_MAX
      );
      responseHeaders = eventHeaders;
      if (!eventLimit.allowed) {
        const retryAfter = retryAfterSeconds(eventLimit.resetAt);
        return NextResponse.json(
          { error: "Your team has exceeded the event sync rate limit. Please try again soon." },
          {
            status: 429,
            headers: { ...eventHeaders, "Retry-After": retryAfter.toString() },
          }
        );
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("team_number")
        .eq("id", profile.org_id)
        .single();
      orgTeamNumber = org?.team_number ?? null;
    }

    const job = await enqueueEventSyncJob({
      orgId: profile.org_id,
      requestedBy: user.id,
      eventKey,
      orgTeamNumber,
      kind: mode === "stats" ? "stats_only" : "full",
    });
    kickSyncWorker({ maxJobs: 2, workerId: `enqueue-${profile.org_id}` });

    return NextResponse.json(
      {
        success: true,
        job: toPublicJob(job),
      },
      { status: 202, headers: responseHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await reportError({
      source: "sync-jobs-api",
      title: "Failed to enqueue sync job",
      error,
      severity: "error",
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
