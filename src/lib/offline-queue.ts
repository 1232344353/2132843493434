import { openDB } from "./offline-db";

const STORE_NAME = "pending-entries";

export interface PendingEntry {
  id: string;
  match_id: string;
  team_number: number;
  org_id: string;
  scouted_by: string;
  auto_score: number;
  auto_start_position?: string | null;
  auto_notes?: string | null;
  shooting_range?: string | null;
  shooting_ranges?: string[] | null;
  shooting_reliability?: number | null;
  teleop_score: number;
  endgame_score: number;
  defense_rating: number;
  cycle_time_rating?: number | null;
  reliability_rating: number;
  ability_answers?: Record<string, boolean>;
  intake_methods?: string[] | null;
  climb_levels?: string[] | null;
  endgame_state?: string | null;
  notes: string;
  created_at: string;
  /** Sync status for retry/backoff tracking */
  _syncStatus?: "queued" | "syncing" | "failed";
  _failedAttempts?: number;
  _lastAttemptAt?: string;
  _schema?: number;
}

export async function saveOffline(entry: PendingEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      ...entry,
      _syncStatus: entry._syncStatus ?? "queued",
      _failedAttempts: entry._failedAttempts ?? 0,
      _schema: entry._schema ?? 1,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingEntries(): Promise<PendingEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const [entries, pitEntries] = await Promise.all([
    getPendingEntries(),
    getPendingPitEntries(),
  ]);
  return entries.length + pitEntries.length;
}

/** Update sync status fields on an existing entry (for retry/backoff) */
export async function updateEntryStatus(
  id: string,
  updates: Partial<
    Pick<PendingEntry, "_syncStatus" | "_failedAttempts" | "_lastAttemptAt">
  >
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        store.put({ ...existing, ...updates });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Pit Scout Offline Queue ────────────────────────────────────────

const PIT_STORE_NAME = "pending-pit-entries";

export interface PendingPitEntry {
  /** Composite key: orgId-eventId-teamNumber */
  id: string;
  org_id: string;
  scouted_by: string;
  event_id: string;
  team_number: number;
  drivetrain: string | null;
  width_inches: number | null;
  length_inches: number | null;
  height_inches: number | null;
  intake_types: string[] | null;
  scoring_ranges: string[] | null;
  estimated_cycles: number | null;
  climb_capability: string | null;
  fuel_output: string | null;
  auto_description: string | null;
  auto_fuel_scored: number | null;
  notes: string | null;
  created_at: string;
  _syncStatus?: "queued" | "syncing" | "failed";
  _failedAttempts?: number;
  _lastAttemptAt?: string;
}

export function buildPitEntryKey(
  orgId: string,
  eventId: string,
  teamNumber: number
): string {
  return `${orgId}-${eventId}-${teamNumber}`;
}

export async function savePitOffline(entry: PendingPitEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIT_STORE_NAME, "readwrite");
    tx.objectStore(PIT_STORE_NAME).put({
      ...entry,
      _syncStatus: entry._syncStatus ?? "queued",
      _failedAttempts: entry._failedAttempts ?? 0,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingPitEntries(): Promise<PendingPitEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIT_STORE_NAME, "readonly");
    const request = tx.objectStore(PIT_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingPitEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIT_STORE_NAME, "readwrite");
    tx.objectStore(PIT_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updatePitEntryStatus(
  id: string,
  updates: Partial<Pick<PendingPitEntry, "_syncStatus" | "_failedAttempts" | "_lastAttemptAt">>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIT_STORE_NAME, "readwrite");
    const store = tx.objectStore(PIT_STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        store.put({ ...existing, ...updates });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllPendingPitEntries(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIT_STORE_NAME, "readwrite");
    tx.objectStore(PIT_STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Check if a queued pit entry exists for a specific team (for UI indicators) */
export async function hasPendingPitEntry(
  orgId: string,
  eventId: string,
  teamNumber: number
): Promise<boolean> {
  const id = buildPitEntryKey(orgId, eventId, teamNumber);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PIT_STORE_NAME, "readonly");
    const request = tx.objectStore(PIT_STORE_NAME).getKey(id);
    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () => reject(request.error);
  });
}

// ── Combined pending count (match + pit) ─────────────────────────────

/** Clear all pending entries (used by logout) */
export async function clearAllPendingEntries(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
