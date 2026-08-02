import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import type { ActorContext } from "../src/domain/scopes";
import {
  approveSubmission,
  createProjectDraft,
  publishApprovedDraft,
  submitProjectDraft,
  WorkflowError,
} from "../src/services/publish";
import { authenticateApiKey, hashBearerToken } from "../src/http/auth";
import * as projects from "../src/storage/projects";
import * as workflow from "../src/storage/workflow";
import { projectFixture, TEST_NOW } from "./factories";

interface TestEnv {
  DB: D1Database;
  TEST_MIGRATIONS: D1Migration[];
}

const testEnv = env as unknown as TestEnv;

function actor(actorId: string, scopes: ActorContext["scopes"]): ActorContext {
  return { actorId, scopes };
}

async function seedActor(actorId: string): Promise<void> {
  await testEnv.DB.prepare(
    `INSERT INTO actors (actor_id, actor_type, display_name)
     VALUES (?, 'agent', ?)
     ON CONFLICT(actor_id) DO NOTHING`,
  )
    .bind(actorId, actorId)
    .run();
}

beforeAll(async () => {
  await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
});

describe("scoped editorial workflow", () => {
  it("rejects public draft creation", async () => {
    await expect(
      createProjectDraft(testEnv.DB, null, {
        draftId: "draft-public",
        creationTicket: "ticket-public",
        document: projectFixture(),
        now: TEST_NOW,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("requires a valid creation ticket before draft:create", async () => {
    await seedActor("actor-editor");
    const editor = actor("actor-editor", new Set(["draft:create"]));
    const document = projectFixture();

    await expect(
      createProjectDraft(testEnv.DB, editor, {
        draftId: "draft-no-ticket",
        creationTicket: "missing-ticket",
        document,
        now: TEST_NOW,
      }),
    ).rejects.toBeInstanceOf(WorkflowError);

    await testEnv.DB.prepare(
      `INSERT INTO creation_tickets (
        ticket_id, platform, platform_repository_id, issued_to_actor_id, expires_at
      ) VALUES (?, 'github', ?, ?, '2026-08-03T00:00:00Z')`,
    )
      .bind(
        "ticket-valid",
        document.repository_sources[0]!.platform_repository_id,
        editor.actorId,
      )
      .run();

    await createProjectDraft(testEnv.DB, editor, {
      draftId: "draft-valid",
      creationTicket: "ticket-valid",
      document,
      now: TEST_NOW,
    });
    expect((await workflow.getDraft(testEnv.DB, "draft-valid"))?.status).toBe(
      "draft",
    );
  });

  it("does not let draft:update approve a submission", async () => {
    await seedActor("actor-editor");
    await seedActor("actor-reviewer");
    await workflow.createDraft(testEnv.DB, {
      draftId: "draft-review",
      projectId: null,
      baseRevision: 0,
      document: projectFixture(),
      actorId: "actor-editor",
      createdAt: TEST_NOW,
    });
    await submitProjectDraft(
      testEnv.DB,
      actor("actor-editor", new Set(["draft:update"])),
      "draft-review",
      { submissionId: "submission-review", baseRevision: 0, riskLevel: "low", now: TEST_NOW },
    );

    await expect(
      approveSubmission(
        testEnv.DB,
        actor("actor-reviewer", new Set(["draft:update"])),
        "submission-review",
        { reviewId: "review-forbidden", now: TEST_NOW },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("returns conflict when the published base revision has advanced", async () => {
    await seedActor("actor-editor");
    await projects.insertRevision(
      testEnv.DB,
      projectFixture({ revision: 1, status: "published" }),
    );
    await workflow.createDraft(testEnv.DB, {
      draftId: "draft-stale",
      projectId: "project-aider",
      baseRevision: 1,
      document: projectFixture({ revision: 2 }),
      actorId: "actor-editor",
      createdAt: TEST_NOW,
    });
    await projects.insertRevision(
      testEnv.DB,
      projectFixture({ revision: 2, status: "published" }),
    );

    await expect(
      submitProjectDraft(
        testEnv.DB,
        actor("actor-editor", new Set(["draft:update"])),
        "draft-stale",
        { submissionId: "submission-stale", baseRevision: 1, riskLevel: "low", now: TEST_NOW },
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("prevents self-approval of high-risk content", async () => {
    await seedActor("actor-owner");
    const owner = actor(
      "actor-owner",
      new Set(["draft:update", "review:approve"]),
    );
    await workflow.createDraft(testEnv.DB, {
      draftId: "draft-high-risk",
      projectId: null,
      baseRevision: 0,
      document: projectFixture(),
      actorId: owner.actorId,
      createdAt: TEST_NOW,
    });
    await submitProjectDraft(testEnv.DB, owner, "draft-high-risk", {
      submissionId: "submission-high-risk",
      baseRevision: 0,
      riskLevel: "high",
      now: TEST_NOW,
    });

    await expect(
      approveSubmission(testEnv.DB, owner, "submission-high-risk", {
        reviewId: "review-self",
        now: TEST_NOW,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("publishes an approved draft with an immutable revision and audit event", async () => {
    await seedActor("actor-publish-editor");
    await seedActor("actor-publish-reviewer");
    await seedActor("actor-publisher");
    await workflow.createDraft(testEnv.DB, {
      draftId: "draft-publish",
      projectId: null,
      baseRevision: 0,
      document: projectFixture({
        projectId: "project-publish",
        repositoryId: "repository-publish",
      }),
      actorId: "actor-publish-editor",
      createdAt: TEST_NOW,
    });
    await submitProjectDraft(
      testEnv.DB,
      actor("actor-publish-editor", new Set(["draft:update"])),
      "draft-publish",
      { submissionId: "submission-publish", baseRevision: 0, riskLevel: "high", now: TEST_NOW },
    );
    await approveSubmission(
      testEnv.DB,
      actor("actor-publish-reviewer", new Set(["review:approve"])),
      "submission-publish",
      { reviewId: "review-publish", now: TEST_NOW },
    );

    const published = await publishApprovedDraft(
      testEnv.DB,
      actor("actor-publisher", new Set(["publish"])),
      "draft-publish",
      { auditEventId: "audit-publish", now: TEST_NOW, reason: "approved launch" },
    );

    expect(published.revision).toBe(1);
    expect(
      (await projects.getPublished(testEnv.DB, "project-publish"))?.revision,
    ).toBe(1);
    expect((await workflow.getDraft(testEnv.DB, "draft-publish"))?.status).toBe(
      "published",
    );
    expect(
      await testEnv.DB.prepare(
        "SELECT action FROM audit_events WHERE audit_event_id = 'audit-publish'",
      ).first<{ action: string }>(),
    ).toEqual({ action: "project.publish" });
  });
});

describe("API credential authentication", () => {
  it("authenticates a live bearer token without storing the plaintext", async () => {
    await seedActor("actor-api");
    const tokenHash = await hashBearerToken("secret-token");
    await testEnv.DB.prepare(
      `INSERT INTO api_credentials (
        credential_id, actor_id, token_hash, scopes_json, created_at
      ) VALUES ('credential-api', 'actor-api', ?, '["draft:update"]', ?)`,
    )
      .bind(tokenHash, TEST_NOW)
      .run();

    const authenticated = await authenticateApiKey(
      testEnv.DB,
      "Bearer secret-token",
      TEST_NOW,
    );
    expect(authenticated?.actorId).toBe("actor-api");
    expect(authenticated?.scopes).toEqual(new Set(["draft:update"]));
  });
});
