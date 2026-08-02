import { expect, test } from "@playwright/test";

const expectedProjectCount = Number(process.env.E2E_EXPECTED_PROJECT_COUNT);

test.beforeAll(() => {
  expect(
    Number.isSafeInteger(expectedProjectCount) && expectedProjectCount > 0,
    "Set E2E_EXPECTED_PROJECT_COUNT to the audited preview import count.",
  ).toBeTruthy();
});

test("searches the catalog and opens a complete project publication", async ({
  page,
  request,
}) => {
  const metaResponse = await request.get("/api/v1/meta");
  expect(metaResponse.ok()).toBeTruthy();
  const meta = (await metaResponse.json()) as {
    schema_version: string;
    project_count: number;
  };
  expect(meta.schema_version).toBe("project-publication-v1");
  expect(meta.project_count).toBe(expectedProjectCount);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "开源大梳理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `找到 ${meta.project_count} 个项目` })).toBeVisible();

  await page.getByRole("searchbox", { name: "搜索项目" }).fill("Aider");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page).toHaveURL(/q=Aider/);
  const projectLink = page.getByRole("link", { name: /Aider/ }).first();
  await expect(projectLink).toBeVisible();
  await projectLink.click();

  await expect(page.locator("article .project-section")).toHaveCount(14);
  await expect(page.getByRole("heading", { name: "证据与来源" })).toBeVisible();
  await expect(page.getByRole("link", { name: "上游仓库" })).toHaveAttribute(
    "href",
    /^https:\/\/github\.com\//,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1440);
});

test("keeps the catalog and project layout inside a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?q=Aider");
  await expect(page.getByRole("heading", { level: 1, name: "开源大梳理" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await page.getByRole("link", { name: /Aider/ }).first().click();
  await expect(page.locator("article .project-section")).toHaveCount(14);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
