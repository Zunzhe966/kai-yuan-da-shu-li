import { expect, test } from "@playwright/test";

const editorToken = process.env.E2E_EDITOR_TOKEN?.trim();
const reviewerToken = process.env.E2E_REVIEWER_TOKEN?.trim();
const repositoryUrl = process.env.E2E_REPOSITORY_URL?.trim();
const projectId = process.env.E2E_PROJECT_ID?.trim();
const writesExplicitlyAllowed = process.env.E2E_ALLOW_PREVIEW_WRITES === "yes";
const ready = Boolean(
  editorToken &&
    reviewerToken &&
    repositoryUrl &&
    projectId &&
    writesExplicitlyAllowed,
);

test("creates, edits, independently reviews and publishes a project", async ({
  page,
  request,
}) => {
  test.skip(
    !ready,
    "Set the disposable preview credentials plus E2E_ALLOW_PREVIEW_WRITES=yes.",
  );
  const health = await request.get("/health");
  expect(health.ok()).toBeTruthy();
  expect(
    (await health.json() as { deployment_environment?: string })
      .deployment_environment,
  ).toBe("preview");
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${editorToken}` });
  await page.goto("/studio/projects/new");
  await page.getByLabel("仓库地址").fill(repositoryUrl!);
  await page.getByLabel("项目 ID").fill(projectId!);
  await page.getByLabel("项目名称").fill("E2E Project");
  await page.getByLabel("中文名称").fill("端到端验收项目");
  await page.getByLabel("主分类").fill("验收工具");
  await page.getByLabel("领域").fill("devtools");
  await page.getByLabel("卡片摘要").fill("用于验证完整编辑发布流程的一次性项目。");
  await page.getByRole("textbox", { name: "适合场景", exact: true }).fill("验证 Studio 发布闭环");
  await page.getByRole("textbox", { name: "不适合场景", exact: true }).fill("用于正式项目内容");
  await page.getByRole("button", { name: "查重并创建草稿" }).click();
  await expect(page).toHaveURL(/\/studio\/projects\/draft-/);

  await page.getByRole("link", { name: "固定正文栏目" }).click();
  await page.getByLabel("栏目摘要").fill("编辑台端到端验收已写入正文。");
  await page.getByRole("textbox", { name: "正文", exact: true }).fill("该内容只存在于一次性预览环境。");
  await page.getByRole("button", { name: "保存栏目" }).click();
  await page.getByRole("link", { name: "预览草稿", exact: true }).click();
  await expect(page.getByText("编辑台端到端验收已写入正文。")).toBeVisible();
  await page.getByRole("link", { name: "返回编辑工作区" }).click();
  await page.getByRole("link", { name: "审核与发布" }).click();
  await page.getByRole("button", { name: "提交独立审核" }).click();
  await expect(page.locator(".studio-panel-heading > span")).toHaveText("in_review");

  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${reviewerToken}` });
  await page.reload();
  await page.getByRole("button", { name: "批准草稿" }).click();
  await page.getByRole("button", { name: "发布正式修订" }).click();
  await expect(page.locator(".studio-panel-heading > span")).toHaveText("published");

  await page.setExtraHTTPHeaders({});
  await page.goto(`/projects/${encodeURIComponent(projectId!)}`);
  await expect(page.locator("article .project-section")).toHaveCount(14);
  await expect(page.getByText("编辑台端到端验收已写入正文。")).toBeVisible();
});
