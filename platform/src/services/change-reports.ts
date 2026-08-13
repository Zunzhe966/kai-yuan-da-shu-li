import { WorkflowError } from "./publish";

export const CHANGE_REPORT_TYPES = [
  "repository_missing",
  "repository_private",
  "repository_redirected",
  "repository_archived",
  "repository_reactivated",
  "release_changed",
  "license_changed",
  "ownership_changed",
  "creator_changed",
  "positioning_changed",
  "risk_changed",
  "summary_mismatch",
  "maintenance_changed",
  "other_material_change",
] as const;

export type ChangeReportType = (typeof CHANGE_REPORT_TYPES)[number];
export type ChangeReportRisk = "low" | "high";
export type ChangeReportStatus =
  | "received"
  | "verifying"
  | "needs_review"
  | "applied"
  | "rejected"
  | "retry";

export interface ChangeReportInput {
  projectId: string;
  baselineRevision: number;
  reportType: ChangeReportType;
  upstreamFingerprint: string;
  evidenceUrl: string;
  observedValue: unknown;
  observedAt: string;
}

interface ChangeReportPayload {
  baseline_revision: number;
  observed_value: unknown;
  observed_at: string;
  risk_level: ChangeReportRisk;
  attempts: number;
  verification: VerificationResult | null;
  last_error: string | null;
}

export interface StoredChangeReport {
  reportId: string;
  projectId: string;
  reportType: ChangeReportType;
  upstreamFingerprint: string;
  status: ChangeReportStatus;
  evidenceUrl: string;
  payload: ChangeReportPayload;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeResult extends StoredChangeReport {
  duplicate: boolean;
}

interface ChangeReportRow {
  report_id: string;
  project_id: string;
  report_type: ChangeReportType;
  upstream_fingerprint: string;
  status: ChangeReportStatus;
  evidence_url: string;
  payload_json: string;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationResult {
  verified: boolean;
  note?: string;
  observedValue?: unknown;
}

export interface ProcessReportsOptions {
  now?: string;
  limit?: number;
  verifyEvidence?: (report: StoredChangeReport) => Promise<VerificationResult>;
}

const LOW_RISK_TYPES = new Set<ChangeReportType>([
  "repository_missing",
  "repository_private",
  "repository_redirected",
  "repository_archived",
  "repository_reactivated",
  "release_changed",
]);

export function classifyReportRisk(type: ChangeReportType): ChangeReportRisk {
  return LOW_RISK_TYPES.has(type) ? "low" : "high";
}

function toStoredReport(row: ChangeReportRow): StoredChangeReport {
  return {
    reportId: row.report_id,
    projectId: row.project_id,
    reportType: row.report_type,
    upstreamFingerprint: row.upstream_fingerprint,
    status: row.status,
    evidenceUrl: row.evidence_url,
    payload: JSON.parse(row.payload_json) as ChangeReportPayload,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const values = match.slice(1).map(Number);
  if (values.some((part) => part < 0 || part > 255)) return true;
  const [first, second] = values;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second! >= 16 && second! <= 31) ||
    (first === 192 && second === 168) ||
    first! >= 224
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  const lower = normalized.toLowerCase();
  if (!lower.includes(":")) {
    return false;
  }
  if (lower === "::" || lower === "::1") {
    return true;
  }
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }
  if (lower.startsWith("2001:db8:")) {
    return true;
  }
  if (lower.startsWith("::ffff:")) {
    return true;
  }
  if (lower.startsWith("::") && lower.includes(".")) {
    return true;
  }
  if (lower.includes("::ffff:")) {
    const ipv4Part = lower.split("::ffff:")[1] ?? "";
    return isPrivateIpv4(ipv4Part);
  }
  return false;
}

const EVIDENCE_HOST_ALLOWLIST = new Set([
  "github.com",
  "www.github.com",
  "raw.githubusercontent.com",
  "gist.github.com",
  "api.github.com",
  "user-images.githubusercontent.com",
  "avatars.githubusercontent.com",
  "gitlab.com",
  "www.gitlab.com",
  "gitee.com",
  "www.gitee.com",
  "codeberg.org",
  "bitbucket.org",
  "arxiv.org",
  "doi.org",
]);

export function isPublicEvidenceHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower === "::1" ||
    isPrivateIpv4(lower) ||
    isPrivateIpv6(lower)
  ) {
    return false;
  }
  return true;
}

export function validateEvidenceUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WorkflowError("evidence URL is invalid", 422);
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !EVIDENCE_HOST_ALLOWLIST.has(hostname) ||
    !isPublicEvidenceHostname(hostname)
  ) {
    throw new WorkflowError("evidence URL must be a public HTTPS address on an approved host", 422);
  }
  return url;
}

interface DnsAnswer {
  type?: number;
  data?: string;
}

interface DnsResponse {
  Answer?: DnsAnswer[];
}

async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const responses = await Promise.all([
    fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`).then((response) =>
      response.ok ? response.json() as Promise<DnsResponse> : null,
    ).catch(() => null),
    fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=AAAA`).then((response) =>
      response.ok ? response.json() as Promise<DnsResponse> : null,
    ).catch(() => null),
  ]);
  return responses.flatMap((resolved) =>
    Array.isArray(resolved?.Answer)
      ? resolved.Answer
          .filter((entry) => entry.type === 1 || entry.type === 28)
          .map((entry) => entry.data ?? "")
          .filter(Boolean)
      : [],
  );
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (!EVIDENCE_HOST_ALLOWLIST.has(hostname.toLowerCase())) {
    throw new WorkflowError("evidence URL must use an approved host", 422);
  }
  const addresses = await resolvePublicAddresses(hostname);
  if (!addresses.length) {
    throw new WorkflowError("evidence URL could not be resolved", 422);
  }
  if (addresses.some((address) => !isPublicEvidenceHostname(address))) {
    throw new WorkflowError("evidence URL must resolve to a public address", 422);
  }
}

function validateInput(input: ChangeReportInput): void {
  if (!input.projectId.trim()) throw new WorkflowError("project ID is required", 422);
  if (!Number.isInteger(input.baselineRevision) || input.baselineRevision < 0) {
    throw new WorkflowError("baseline revision is invalid", 422);
  }
  if (!(CHANGE_REPORT_TYPES as readonly string[]).includes(input.reportType)) {
    throw new WorkflowError("report type is invalid", 422);
  }
  if (
    !input.upstreamFingerprint.trim() ||
    input.upstreamFingerprint.length > 500
  ) {
    throw new WorkflowError("upstream fingerprint is invalid", 422);
  }
  if (!Number.isFinite(Date.parse(input.observedAt))) {
    throw new WorkflowError("observed time is invalid", 422);
  }
  validateEvidenceUrl(input.evidenceUrl);
}

export async function intakeChangeReport(
  db: D1Database,
  input: ChangeReportInput,
  now = new Date().toISOString(),
): Promise<IntakeResult> {
  validateInput(input);
  const project = await db
    .prepare(
      "SELECT current_revision_number FROM projects WHERE project_id = ? AND current_revision_id IS NOT NULL",
    )
    .bind(input.projectId)
    .first<{ current_revision_number: number }>();
  if (!project) {
    throw new WorkflowError("project not found", 404);
  }
  const reportId = crypto.randomUUID();
  const payload: ChangeReportPayload = {
    baseline_revision: input.baselineRevision,
    observed_value: input.observedValue,
    observed_at: input.observedAt,
    risk_level: classifyReportRisk(input.reportType),
    attempts: 0,
    verification: null,
    last_error: null,
  };
  const inserted = await db
    .prepare(
      `INSERT INTO change_reports (
        report_id, project_id, report_type, upstream_fingerprint, status,
        evidence_url, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'received', ?, ?, ?, ?)
      ON CONFLICT(project_id, report_type, upstream_fingerprint) DO NOTHING`,
    )
    .bind(
      reportId,
      input.projectId,
      input.reportType,
      input.upstreamFingerprint,
      input.evidenceUrl,
      JSON.stringify(payload),
      now,
      now,
    )
    .run();
  const row = await db
    .prepare(
      `SELECT report_id, project_id, report_type, upstream_fingerprint, status,
              evidence_url, payload_json, next_attempt_at, created_at, updated_at
       FROM change_reports
       WHERE project_id = ? AND report_type = ? AND upstream_fingerprint = ?`,
    )
    .bind(input.projectId, input.reportType, input.upstreamFingerprint)
    .first<ChangeReportRow>();
  if (!row) throw new Error("change report insert did not return a row");
  return { ...toStoredReport(row), duplicate: (inserted.meta.changes ?? 0) === 0 };
}

export async function getChangeReport(
  db: D1Database,
  reportId: string,
): Promise<StoredChangeReport | null> {
  const row = await db
    .prepare(
      `SELECT report_id, project_id, report_type, upstream_fingerprint, status,
              evidence_url, payload_json, next_attempt_at, created_at, updated_at
       FROM change_reports WHERE report_id = ?`,
    )
    .bind(reportId)
    .first<ChangeReportRow>();
  return row ? toStoredReport(row) : null;
}

export async function listChangeReports(
  db: D1Database,
  limit = 100,
): Promise<StoredChangeReport[]> {
  const result = await db
    .prepare(
      `SELECT report_id, project_id, report_type, upstream_fingerprint, status,
              evidence_url, payload_json, next_attempt_at, created_at, updated_at
       FROM change_reports
       ORDER BY CASE status
         WHEN 'needs_review' THEN 0
         WHEN 'retry' THEN 1
         WHEN 'received' THEN 2
         WHEN 'verifying' THEN 3
         ELSE 4
       END, updated_at DESC, report_id
       LIMIT ?`,
    )
    .bind(Math.min(Math.max(limit, 1), 200))
    .all<ChangeReportRow>();
  return result.results.map(toStoredReport);
}

export async function listProjectChangeReports(
  db: D1Database,
  projectId: string,
  limit = 100,
): Promise<StoredChangeReport[]> {
  const result = await db
    .prepare(
      `SELECT report_id, project_id, report_type, upstream_fingerprint, status,
              evidence_url, payload_json, next_attempt_at, created_at, updated_at
       FROM change_reports
       WHERE project_id = ?
       ORDER BY CASE status
         WHEN 'needs_review' THEN 0
         WHEN 'retry' THEN 1
         WHEN 'received' THEN 2
         WHEN 'verifying' THEN 3
         ELSE 4
       END, updated_at DESC, report_id
       LIMIT ?`,
    )
    .bind(projectId, Math.min(Math.max(limit, 1), 200))
    .all<ChangeReportRow>();
  return result.results.map(toStoredReport);
}

async function verifyRemoteEvidence(
  report: StoredChangeReport,
): Promise<VerificationResult> {
  let url = validateEvidenceUrl(report.evidenceUrl);
  await assertPublicHostname(url.hostname);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/json,text/plain;q=0.8",
        Range: "bytes=0-1023",
        "User-Agent": "kaiyuan-dashuli-verifier/1.0",
      },
    });
    if (response.status >= 200 && response.status < 300) {
      await response.body?.cancel();
      return { verified: true, note: `upstream returned ${response.status}` };
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      await response.body?.cancel();
      if (!location) return { verified: false, note: "redirect without location" };
      url = validateEvidenceUrl(new URL(location, url).toString());
      await assertPublicHostname(url.hostname);
      continue;
    }
    await response.body?.cancel();
    return { verified: false, note: `upstream returned ${response.status}` };
  }
  return { verified: false, note: "too many redirects" };
}

export async function processPendingChangeReports(
  db: D1Database,
  options: ProcessReportsOptions = {},
): Promise<{ processed: number; retried: number }> {
  const now = options.now ?? new Date().toISOString();
  const verifyEvidence = options.verifyEvidence ?? verifyRemoteEvidence;
  const pending = await db
    .prepare(
      `SELECT report_id, project_id, report_type, upstream_fingerprint, status,
              evidence_url, payload_json, next_attempt_at, created_at, updated_at
       FROM change_reports
       WHERE status = 'received'
          OR (status = 'retry' AND next_attempt_at <= ?)
       ORDER BY created_at, report_id
       LIMIT ?`,
    )
    .bind(now, Math.min(Math.max(options.limit ?? 50, 1), 200))
    .all<ChangeReportRow>();
  let retried = 0;
  for (const row of pending.results) {
    const report = toStoredReport(row);
    await db
      .prepare(
        "UPDATE change_reports SET status = 'verifying', updated_at = ? WHERE report_id = ?",
      )
      .bind(now, report.reportId)
      .run();
    try {
      const verification = await verifyEvidence(report);
      const payload = {
        ...report.payload,
        attempts: report.payload.attempts + 1,
        verification,
        last_error: null,
      };
      await db
        .prepare(
          `UPDATE change_reports SET status = ?, payload_json = ?,
             next_attempt_at = NULL, updated_at = ? WHERE report_id = ?`,
        )
        .bind(
          verification.verified ? "needs_review" : "rejected",
          JSON.stringify(payload),
          now,
          report.reportId,
        )
        .run();
    } catch (error) {
      retried += 1;
      const attempts = report.payload.attempts + 1;
      const delayHours = Math.min(2 ** (attempts - 1), 24);
      const nextAttemptAt = new Date(
        Date.parse(now) + delayHours * 60 * 60 * 1000,
      ).toISOString();
      const payload = {
        ...report.payload,
        attempts,
        last_error: error instanceof Error ? error.message.slice(0, 500) : "verification failed",
      };
      await db
        .prepare(
          `UPDATE change_reports SET status = 'retry', payload_json = ?,
             next_attempt_at = ?, updated_at = ? WHERE report_id = ?`,
        )
        .bind(JSON.stringify(payload), nextAttemptAt, now, report.reportId)
        .run();
    }
  }
  return { processed: pending.results.length, retried };
}
