import type { ActorContext, Scope } from "../domain/scopes";

// 固定坑位 key：布局里写死，位置与数量不随广告内容变化。
// 将来要加坑位 = 在 layout.ts 加 ad-slot 并在本表占位，不动已有坑位。
export const AD_SLOTS = [
  "left-1",
  "left-2",
  "left-3",
  "left-4",
  "right-1",
  "right-2",
  "right-3",
  "right-4",
  "banner-top",
  "banner-end",
] as const;

export type AdSlotKey = (typeof AD_SLOTS)[number];

export interface AdInput {
  adId: string;
  slotKey: AdSlotKey;
  title: string;
  landingUrl: string;
  imageUrl: string | null;
  scriptHtml: string | null;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  now: string;
}

export interface StoredAd {
  ad_id: string;
  slot_key: string;
  title: string;
  landing_url: string;
  image_url: string | null;
  script_html: string;
  body: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
}

export class AdError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AdError";
  }
}

function requireScope(actor: ActorContext | null, scope: Scope): void {
  if (!actor) throw new AdError("authentication required", 401);
  if (!actor.scopes.has(scope)) throw new AdError("missing scope: " + scope, 403);
}

function validateUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error("must be https");
  } catch {
    throw new AdError("landing_url must be a valid https URL", 422);
  }
}

export async function createAd(
  db: D1Database,
  actor: ActorContext | null,
  input: AdInput,
): Promise<void> {
  requireScope(actor, "ad:create");
  if (!input.slotKey || !AD_SLOTS.includes(input.slotKey)) {
    throw new AdError("unknown ad slot", 422);
  }
  if (!input.title.trim()) throw new AdError("title required", 422);
  validateUrl(input.landingUrl);
  await db
    .prepare(
      `INSERT INTO ads (
        ad_id, slot_key, title, landing_url, image_url, script_html, body,
        status, base_revision, created_by_actor_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?, ?)`,
    )
    .bind(
      input.adId,
      input.slotKey,
      input.title.trim(),
      input.landingUrl,
      input.imageUrl,
      input.scriptHtml ?? "",
      input.body,
      actor!.actorId,
      input.now,
      input.now,
    )
    .run();
}

export async function updateAd(
  db: D1Database,
  actor: ActorContext | null,
  adId: string,
  patch: Partial<Pick<AdInput, "title" | "landingUrl" | "imageUrl" | "scriptHtml" | "body" | "startsAt" | "endsAt">>,
  now: string,
): Promise<void> {
  requireScope(actor, "ad:update");
  if (patch.landingUrl) validateUrl(patch.landingUrl);
  const sets: string[] = [];
  const values: unknown[] = [];
  const put = (col: string, v: unknown) => { sets.push(col + " = ?"); values.push(v); };
  if (patch.title !== undefined) put("title", patch.title.trim());
  if (patch.landingUrl !== undefined) put("landing_url", patch.landingUrl);
  if (patch.imageUrl !== undefined) put("image_url", patch.imageUrl);
  if (patch.scriptHtml !== undefined) put("script_html", patch.scriptHtml);
  if (patch.body !== undefined) put("body", patch.body);
  if (patch.startsAt !== undefined) put("starts_at", patch.startsAt);
  if (patch.endsAt !== undefined) put("ends_at", patch.endsAt);
  put("updated_at", now);
  values.push(adId);
  await db
    .prepare(`UPDATE ads SET ${sets.join(", ")} WHERE ad_id = ?`)
    .bind(...values)
    .run();
}

export async function submitAdForReview(
  db: D1Database,
  actor: ActorContext | null,
  adId: string,
): Promise<void> {
  requireScope(actor, "ad:update");
  const result = await db
    .prepare("UPDATE ads SET status = 'in_review', updated_at = ? WHERE ad_id = ? AND status = 'draft'")
    .bind(new Date().toISOString(), adId)
    .run();
  if (result.meta.changes === 0) throw new AdError("ad must be a draft to submit", 422);
}

export async function approveAd(
  db: D1Database,
  actor: ActorContext | null,
  adId: string,
): Promise<void> {
  requireScope(actor, "ad:review");
  const result = await db
    .prepare("UPDATE ads SET status = 'approved', updated_at = ? WHERE ad_id = ? AND status = 'in_review'")
    .bind(new Date().toISOString(), adId)
    .run();
  if (result.meta.changes === 0) throw new AdError("ad must be in review to approve", 422);
}

export async function publishAd(
  db: D1Database,
  actor: ActorContext | null,
  adId: string,
): Promise<void> {
  requireScope(actor, "ad:publish");
  const ad = await db
    .prepare("SELECT * FROM ads WHERE ad_id = ? AND status = 'approved'")
    .bind(adId)
    .first<{
      ad_id: string; slot_key: string; title: string; landing_url: string;
      image_url: string | null; script_html: string; body: string;
      starts_at: string | null; ends_at: string | null;
    }>();
  if (!ad) throw new AdError("no approved ad to publish", 422);
  const now = new Date().toISOString();
  const revisionId = crypto.randomUUID();
  const document = {
    ad_id: ad.ad_id,
    slot_key: ad.slot_key,
    title: ad.title,
    landing_url: ad.landing_url,
    image_url: ad.image_url,
    script_html: ad.script_html,
    body: ad.body,
    starts_at: ad.starts_at,
    ends_at: ad.ends_at,
    published_at: now,
    sponsored: true,
  };
  const revisionNumber = (
    (await db
      .prepare("SELECT COALESCE(MAX(revision_number), 0) + 1 AS next FROM ad_revisions WHERE ad_id = ?")
      .bind(ad.ad_id)
      .first<{ next: number }>())?.next ?? 1
  );
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO ad_revisions (
          revision_id, ad_id, revision_number, document_json,
          published_by_actor_id, published_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(revisionId, ad.ad_id, revisionNumber, JSON.stringify(document), actor!.actorId, now),
    db
      .prepare("UPDATE ads SET status = 'published', current_revision_id = ?, updated_at = ? WHERE ad_id = ?")
      .bind(revisionId, now, ad.ad_id),
  ]);
  if ((result[1]?.meta.changes ?? 0) === 0) {
    throw new AdError("ad could not be published", 422);
  }
}

export async function listPublishedAds(
  db: D1Database,
): Promise<StoredAd[]> {
  const result = await db
    .prepare(
      `SELECT ad_id, slot_key, title, landing_url, image_url, script_html, body, status, starts_at, ends_at, updated_at
       FROM ads WHERE status = 'published' ORDER BY updated_at DESC`,
    )
    .all<StoredAd>();
  return result.results;
}

export async function listAds(db: D1Database): Promise<StoredAd[]> {
  const result = await db
    .prepare(
      `SELECT ad_id, slot_key, title, landing_url, image_url, script_html, body, status, starts_at, ends_at, updated_at
       FROM ads ORDER BY slot_key, updated_at DESC`,
    )
    .all<StoredAd>();
  return result.results;
}
